use serde::Serialize;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tokio::process::{Child, Command as AsyncCommand};
use tokio::sync::Mutex as AsyncMutex;

/// Outcome of waiting for a native playback session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PlaybackOutcome {
    /// Audio played through to the very end of the stream.
    Completed,
    /// Playback was stopped or replaced by a new one; waiters must not advance.
    Superseded,
    /// The player process exited with an error status.
    Failed,
}

/// Backend-confirmed playback parameters returned only after the transformed
/// audio file has been created and the native player process has spawned.
#[derive(Debug, Clone, Serialize)]
pub struct PlaybackSession {
    pub seq: u64,
    pub applied_speed: f32,
    pub source_offset_sec: f32,
    pub playback_duration_sec: Option<f32>,
}

struct ActivePlayback {
    child: Child,
    pid: u32,
    temp_paths: Vec<PathBuf>,
}

pub struct NativeAudioPlayer {
    current: AsyncMutex<Option<ActivePlayback>>,
    playback_seq: AtomicU64,
    is_paused: Mutex<bool>,
}

impl Default for NativeAudioPlayer {
    fn default() -> Self {
        Self::new()
    }
}

fn signal_pid(pid: u32, signal: &str) {
    if pid > 0 {
        let _ = Command::new("kill")
            .args([signal, &pid.to_string()])
            .output();
    }
}

fn remove_temp_paths(paths: &[PathBuf]) {
    for path in paths {
        let _ = std::fs::remove_file(path);
    }
}

impl NativeAudioPlayer {
    pub fn new() -> Self {
        Self {
            current: AsyncMutex::new(None),
            playback_seq: AtomicU64::new(0),
            is_paused: Mutex::new(false),
        }
    }

    /// Kill the current playback (if any) and invalidate outstanding waiters.
    pub async fn stop(&self) {
        self.playback_seq.fetch_add(1, Ordering::SeqCst);
        let mut guard = self.current.lock().await;
        if let Some(mut active) = guard.take() {
            let _ = active.child.start_kill();
            let _ = active.child.wait().await;
            remove_temp_paths(&active.temp_paths);
        }
        *self.is_paused.lock().unwrap() = false;
    }

    pub async fn pause(&self) {
        let guard = self.current.lock().await;
        if let Some(active) = guard.as_ref() {
            signal_pid(active.pid, "-STOP");
            *self.is_paused.lock().unwrap() = true;
        }
    }

    pub async fn resume(&self) {
        let guard = self.current.lock().await;
        if let Some(active) = guard.as_ref() {
            signal_pid(active.pid, "-CONT");
            *self.is_paused.lock().unwrap() = false;
        }
    }

    pub async fn is_playing(&self) -> bool {
        self.current.lock().await.is_some()
    }

    /// Stop anything playing, spawn a new player process for `bytes`, and
    /// return the sequence token used to wait for its completion.
    /// `offset_sec` starts playback mid-stream (used when the reading speed
    /// changes mid-verse and the verse resumes where it was).
    pub async fn play_bytes(
        &self,
        bytes: &[u8],
        speed: f32,
        offset_sec: f32,
    ) -> Result<PlaybackSession, String> {
        self.stop().await;

        if !speed.is_finite() || !offset_sec.is_finite() {
            return Err("Playback speed and offset must be finite numbers".to_string());
        }
        let requested_speed = speed.clamp(0.5, 2.0);
        let requested_offset = offset_sec.max(0.0);

        static TEMP_FILE_SEQ: AtomicU64 = AtomicU64::new(0);
        let file_id = TEMP_FILE_SEQ.fetch_add(1, Ordering::Relaxed);
        let temp_stem = format!("verbum_playback_{}_{}", std::process::id(), file_id);
        let temp_path = std::env::temp_dir().join(format!("{}.audio", temp_stem));
        let transformed_path = std::env::temp_dir().join(format!("{}_speed.wav", temp_stem));
        {
            let mut file = File::create(&temp_path)
                .map_err(|e| format!("Failed to create temp audio file: {}", e))?;
            file.write_all(bytes)
                .map_err(|e| format!("Failed to write temp audio file: {}", e))?;
        }

        // pw-play --rate only resamples the stream (same wall duration), so
        // real speed-up is done by time-stretching with ffmpeg atempo; a seek
        // offset is applied in the same ffmpeg pass.
        let source_duration_sec = wav_duration_from_bytes(bytes);
        let needs_cut = requested_offset > 0.05;
        let needs_tempo = (requested_speed - 1.0).abs() > 0.05;
        let play_path = if needs_cut || needs_tempo {
            let ffmpeg = match find_ffmpeg() {
                Some(path) => path,
                None => {
                    let _ = std::fs::remove_file(&temp_path);
                    return Err(
                        "Cannot apply playback speed: ffmpeg was not found. Refusing to play unmodified 1× audio."
                            .to_string(),
                    );
                }
            };
            transform_audio(
                &ffmpeg,
                &temp_path,
                &transformed_path,
                requested_offset,
                if needs_tempo { requested_speed } else { 1.0 },
            )
            .map_err(|e| {
                let _ = std::fs::remove_file(&transformed_path);
                let _ = std::fs::remove_file(&temp_path);
                format!("Cannot apply requested playback speed: {}", e)
            })?
        } else {
            temp_path.clone()
        };

        let playback_duration_sec = wav_duration_from_path(&play_path).or_else(|| {
            source_duration_sec
                .map(|duration| ((duration - requested_offset).max(0.0) / requested_speed).max(0.0))
        });

        let temp_paths = if play_path == transformed_path {
            vec![temp_path, transformed_path]
        } else {
            vec![temp_path]
        };
        let mut cmd = detect_player(&play_path).inspect_err(|_| remove_temp_paths(&temp_paths))?;
        let child = cmd.spawn().map_err(|e| {
            remove_temp_paths(&temp_paths);
            format!("Failed to spawn audio player process: {}", e)
        })?;
        let pid = child.id().unwrap_or(0);
        *self.is_paused.lock().unwrap() = false;

        let seq = self.playback_seq.fetch_add(1, Ordering::SeqCst) + 1;
        *self.current.lock().await = Some(ActivePlayback {
            child,
            pid,
            temp_paths,
        });
        Ok(PlaybackSession {
            seq,
            applied_speed: requested_speed,
            source_offset_sec: requested_offset,
            playback_duration_sec,
        })
    }

    /// Resolve when the playback started with `seq` exits. Because completion
    /// is taken from the player process itself, the audio is never cut short.
    pub async fn wait_for(&self, seq: u64) -> PlaybackOutcome {
        loop {
            {
                let mut guard = self.current.lock().await;
                if self.playback_seq.load(Ordering::SeqCst) != seq || guard.is_none() {
                    return PlaybackOutcome::Superseded;
                }
                let active = guard.as_mut().expect("presence checked above");
                match active.child.try_wait() {
                    Ok(Some(status)) => {
                        if let Some(active) = guard.take() {
                            remove_temp_paths(&active.temp_paths);
                        }
                        return if status.success() {
                            PlaybackOutcome::Completed
                        } else {
                            PlaybackOutcome::Failed
                        };
                    }
                    Ok(None) => {}
                    Err(_) => {
                        if let Some(active) = guard.take() {
                            remove_temp_paths(&active.temp_paths);
                        }
                        return PlaybackOutcome::Failed;
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(40)).await;
        }
    }

    #[cfg(test)]
    async fn spawn_for_test(&self, mut cmd: AsyncCommand) -> Result<u64, String> {
        self.stop().await;
        let child = cmd.spawn().map_err(|e| format!("spawn failed: {}", e))?;
        let pid = child.id().unwrap_or(0);
        *self.is_paused.lock().unwrap() = false;
        let seq = self.playback_seq.fetch_add(1, Ordering::SeqCst) + 1;
        *self.current.lock().await = Some(ActivePlayback {
            child,
            pid,
            temp_paths: Vec::new(),
        });
        Ok(seq)
    }
}

fn backend_available(bin: &str) -> bool {
    Command::new(bin)
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn find_ffmpeg() -> Option<PathBuf> {
    static FFMPEG: std::sync::OnceLock<Option<PathBuf>> = std::sync::OnceLock::new();
    FFMPEG
        .get_or_init(|| {
            if backend_available("ffmpeg") {
                return Some(PathBuf::from("ffmpeg"));
            }
            [
                "/usr/bin/ffmpeg",
                "/usr/local/bin/ffmpeg",
                "/opt/homebrew/bin/ffmpeg",
            ]
            .into_iter()
            .map(PathBuf::from)
            .find(|path| {
                Command::new(path)
                    .arg("-version")
                    .output()
                    .map(|output| output.status.success())
                    .unwrap_or(false)
            })
        })
        .clone()
}

// Seek to `offset_sec` and/or time-stretch by `speed` into a temp WAV in one
// ffmpeg pass. `atempo` keeps pitch intact. Failure is propagated because
// silently playing the original 1× file would desynchronize the UI.
fn transform_audio_command(
    ffmpeg: &Path,
    src: &Path,
    out: &Path,
    offset_sec: f32,
    speed: f32,
) -> Command {
    let mut cmd = Command::new(ffmpeg);
    cmd.args(["-y", "-v", "error"]);
    cmd.arg("-i").arg(src);
    // Output-side seeking decodes up to the exact timestamp. Input-side `-ss`
    // is faster but can jump back to an earlier MP3 frame/key point, which is
    // visible as a rewind whenever playback speed changes.
    if offset_sec > 0.05 {
        // With `atempo`, output timestamps are already rate-adjusted. Convert
        // the source-content position to transformed wall-clock time so seek
        // and speed do not compound (for example 1s at 2× becomes 0.5s).
        let transformed_offset = offset_sec / speed.max(0.001);
        cmd.arg("-ss").arg(format!("{:.3}", transformed_offset));
    }
    if (speed - 1.0).abs() > 0.05 {
        cmd.arg("-filter:a")
            .arg(format!("atempo={:.3}", speed.clamp(0.5, 2.0)));
    }
    cmd.args(["-f", "wav"]).arg(out);
    cmd
}

fn transform_audio(
    ffmpeg: &Path,
    src: &Path,
    out: &Path,
    offset_sec: f32,
    speed: f32,
) -> Result<PathBuf, String> {
    let mut cmd = transform_audio_command(ffmpeg, src, out, offset_sec, speed);
    let status = cmd
        .output()
        .map_err(|e| format!("ffmpeg spawn failed: {}", e))?;
    if !status.status.success() {
        return Err(String::from_utf8_lossy(&status.stderr).trim().to_string());
    }
    Ok(out.to_path_buf())
}

fn wav_duration_from_path(path: &Path) -> Option<f32> {
    std::fs::read(path)
        .ok()
        .and_then(|bytes| wav_duration_from_bytes(&bytes))
}

/// Reads duration from RIFF/WAVE `fmt ` and `data` chunks without relying on
/// an external probe process. Voicebox currently returns PCM WAV, and ffmpeg
/// speed transforms are explicitly written as WAV.
fn wav_duration_from_bytes(bytes: &[u8]) -> Option<f32> {
    if bytes.len() < 12 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return None;
    }

    let mut cursor = 12usize;
    let mut byte_rate = None;
    let mut data_size = None;
    while cursor.checked_add(8)? <= bytes.len() {
        let chunk_id = &bytes[cursor..cursor + 4];
        let chunk_size =
            u32::from_le_bytes(bytes[cursor + 4..cursor + 8].try_into().ok()?) as usize;
        let data_start = cursor + 8;
        let data_end = data_start.checked_add(chunk_size)?;
        if data_end > bytes.len() {
            return None;
        }

        if chunk_id == b"fmt " && chunk_size >= 12 {
            byte_rate = Some(u32::from_le_bytes(
                bytes[data_start + 8..data_start + 12].try_into().ok()?,
            ));
        } else if chunk_id == b"data" {
            data_size = Some(chunk_size as u64);
        }

        cursor = data_end + (chunk_size % 2);
    }

    let rate = byte_rate?;
    if rate == 0 {
        return None;
    }
    Some(data_size? as f32 / rate as f32)
}

// PipeWire/PulseAudio/ALSA players all detect the container from content
// (via libsndfile), so MP3 payloads in a .wav path still play correctly.
fn detect_player(play_path: &Path) -> Result<AsyncCommand, String> {
    // 1. PipeWire native player (fastest, standard on modern Linux)
    if backend_available("pw-play") {
        let mut cmd = AsyncCommand::new("pw-play");
        cmd.arg(play_path);
        return Ok(cmd);
    }

    // 2. PulseAudio paplay
    if backend_available("paplay") {
        let mut cmd = AsyncCommand::new("paplay");
        cmd.arg(play_path);
        return Ok(cmd);
    }

    // 3. ALSA aplay
    if backend_available("aplay") {
        let mut cmd = AsyncCommand::new("aplay");
        cmd.arg(play_path);
        return Ok(cmd);
    }

    Err("No compatible Linux audio backend found (pw-play, paplay, aplay).".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn silent_pcm_wav(duration_sec: u32) -> Vec<u8> {
        let sample_rate = 24_000u32;
        let channels = 1u16;
        let bits_per_sample = 16u16;
        let byte_rate = sample_rate * channels as u32 * (bits_per_sample as u32 / 8);
        let data_size = byte_rate * duration_sec;
        let mut wav = Vec::with_capacity(44 + data_size as usize);
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&(36 + data_size).to_le_bytes());
        wav.extend_from_slice(b"WAVEfmt ");
        wav.extend_from_slice(&16u32.to_le_bytes());
        wav.extend_from_slice(&1u16.to_le_bytes());
        wav.extend_from_slice(&channels.to_le_bytes());
        wav.extend_from_slice(&sample_rate.to_le_bytes());
        wav.extend_from_slice(&byte_rate.to_le_bytes());
        wav.extend_from_slice(&(channels * (bits_per_sample / 8)).to_le_bytes());
        wav.extend_from_slice(&bits_per_sample.to_le_bytes());
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&data_size.to_le_bytes());
        wav.resize(44 + data_size as usize, 0);
        wav
    }

    #[test]
    fn speed_transform_uses_precise_output_seek_and_tempo() {
        let cmd = transform_audio_command(
            Path::new("ffmpeg"),
            Path::new("input.mp3"),
            Path::new("output.wav"),
            7.25,
            1.5,
        );
        let args: Vec<String> = cmd
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect();
        let input_pos = args.iter().position(|arg| arg == "-i").unwrap();
        let seek_pos = args.iter().position(|arg| arg == "-ss").unwrap();

        assert!(
            input_pos < seek_pos,
            "seek must be output-side so changing speed does not rewind to an MP3 frame boundary"
        );
        assert!(args
            .windows(2)
            .any(|pair| { pair[0] == "-filter:a" && pair[1] == "atempo=1.500" }));
    }

    #[test]
    fn transformed_audio_duration_matches_every_supported_rate() {
        let ffmpeg = find_ffmpeg().expect("ffmpeg is required for playback-rate support");
        let dir = tempdir().unwrap();
        let source = dir.path().join("source.wav");
        std::fs::write(&source, silent_pcm_wav(4)).unwrap();
        assert!((wav_duration_from_path(&source).unwrap() - 4.0).abs() < 0.001);

        for rate in [0.75f32, 1.0, 1.25, 1.5, 2.0] {
            let output = dir.path().join(format!("rate-{rate}.wav"));
            transform_audio(&ffmpeg, &source, &output, 0.0, rate).unwrap();
            let actual_duration = wav_duration_from_path(&output).unwrap();
            let effective_rate = 4.0 / actual_duration;
            assert!(
                (effective_rate - rate).abs() < 0.04,
                "requested {rate}× but transformed audio measured {effective_rate:.3}×"
            );
        }

        let output = dir.path().join("offset-and-speed.wav");
        transform_audio(&ffmpeg, &source, &output, 1.0, 2.0).unwrap();
        let actual_duration = wav_duration_from_path(&output).unwrap();
        let effective_rate = 3.0 / actual_duration;
        assert!(
            (effective_rate - 2.0).abs() < 0.04,
            "offset restart requested 2× but measured {effective_rate:.3}×"
        );
    }

    fn sleep_cmd(secs: &str) -> AsyncCommand {
        let mut cmd = AsyncCommand::new("sleep");
        cmd.arg(secs);
        cmd
    }

    #[tokio::test]
    async fn wait_reports_completed_then_superseded() {
        let player = NativeAudioPlayer::new();
        let seq = player.spawn_for_test(sleep_cmd("0.2")).await.unwrap();
        assert_eq!(player.wait_for(seq).await, PlaybackOutcome::Completed);
        // Once reaped, waiting again on the same token is a no-op
        assert_eq!(player.wait_for(seq).await, PlaybackOutcome::Superseded);
    }

    #[tokio::test]
    async fn stopping_a_playback_supersedes_its_waiter() {
        let player = NativeAudioPlayer::new();
        let seq = player.spawn_for_test(sleep_cmd("30")).await.unwrap();
        player.stop().await;
        assert_eq!(player.wait_for(seq).await, PlaybackOutcome::Superseded);
        assert!(!player.is_playing().await);
    }

    #[tokio::test]
    async fn replacing_a_playback_supersedes_the_old_waiter() {
        let player = NativeAudioPlayer::new();
        let first = player.spawn_for_test(sleep_cmd("30")).await.unwrap();
        let second = player.spawn_for_test(sleep_cmd("0.1")).await.unwrap();
        assert_eq!(player.wait_for(first).await, PlaybackOutcome::Superseded);
        assert_eq!(player.wait_for(second).await, PlaybackOutcome::Completed);
    }

    #[tokio::test]
    async fn nonzero_exit_maps_to_failed() {
        let player = NativeAudioPlayer::new();
        let seq = player
            .spawn_for_test(AsyncCommand::new("false"))
            .await
            .unwrap();
        assert_eq!(player.wait_for(seq).await, PlaybackOutcome::Failed);
    }
}
