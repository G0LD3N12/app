/**
 * Duration resolution for synthesized narration audio.
 *
 * Voicebox (edge-tts) returns MP3 at ~48 kbit/s, not WAV PCM. Estimating the
 * duration with WAV math (bytes / sampleRate / 2) is ~8x too short and makes
 * the queue advance long before the audio finishes, so every verse gets cut.
 */

const MPEG1_LAYER3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_LAYER3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const MPEG1_SAMPLE_RATES = [44100, 48000, 32000];

interface Mp3FrameInfo {
  bitrate: number;
  sampleRate: number;
  dataBytes: number;
}

function findMp3Frame(bytes: Uint8Array): Mp3FrameInfo | null {
  let offset = 0;
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    // Skip ID3v2 tag: 10-byte header + syncsafe integer size
    const tagSize =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);
    offset = 10 + tagSize;
  }

  const limit = Math.min(bytes.length - 4, offset + 8192);
  for (let i = offset; i < limit; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;

    const versionBits = (bytes[i + 1] >> 3) & 0x03; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
    const layerBits = (bytes[i + 1] >> 1) & 0x03; // 1=Layer III
    if (versionBits === 1 || layerBits !== 1) continue;

    const bitrateIdx = (bytes[i + 2] >> 4) & 0x0f;
    const sampleIdx = (bytes[i + 2] >> 2) & 0x03;
    if (bitrateIdx === 0 || bitrateIdx === 15 || sampleIdx === 3) continue;

    const isMpeg1 = versionBits === 3;
    const bitrate = (isMpeg1 ? MPEG1_LAYER3_BITRATES : MPEG2_LAYER3_BITRATES)[bitrateIdx] * 1000;
    const baseRate = MPEG1_SAMPLE_RATES[sampleIdx];
    const sampleRate = isMpeg1 ? baseRate : versionBits === 2 ? baseRate / 2 : baseRate / 4;

    return {
      bitrate,
      sampleRate,
      dataBytes: Math.max(0, bytes.length - i),
    };
  }
  return null;
}

export function estimateAudioDuration(bytes: Uint8Array, mimeType: string): number {
  const mime = (mimeType || '').toLowerCase();
  const looksLikeRiff =
    bytes.length > 44 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;

  if (mime.includes('wav') || looksLikeRiff) {
    // 16-bit mono PCM assumption; stereo WAVs only skew the estimate slightly
    const pcmBytes = Math.max(0, bytes.length - 44);
    return Math.max(0.5, pcmBytes / (24000 * 2));
  }

  const mp3 = findMp3Frame(bytes);
  if (mp3 && mp3.bitrate > 0) {
    // CBR duration from the first frame's bitrate
    return Math.max(0.5, (mp3.dataBytes * 8) / mp3.bitrate);
  }

  // Conservative default: 48 kbit/s stream (edge-tts default output)
  return Math.max(1, (bytes.length * 8) / 48000);
}

/**
 * Exact duration when the platform decoder is available (Web Audio),
 * falling back to the header-based heuristic otherwise.
 */
export async function resolveAudioDuration(bytes: Uint8Array, mimeType: string): Promise<number> {
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      const ctx = new Ctor();
      try {
        const copy = new Uint8Array(bytes).buffer;
        const buffer = await ctx.decodeAudioData(copy);
        if (buffer && Number.isFinite(buffer.duration) && buffer.duration > 0) {
          return buffer.duration;
        }
      } finally {
        void ctx.close();
      }
    }
  } catch {
    // Decoder unavailable (e.g. missing GStreamer codecs): use heuristic
  }
  return estimateAudioDuration(bytes, mimeType);
}
