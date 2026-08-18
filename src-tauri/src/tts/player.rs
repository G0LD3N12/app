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

struct ActivePlayback {
    child: Child,
    pid: u32,
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
        let _ = Command::new("kill").args([signal, &pid.to_string()]).output();
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
    pub async fn play_bytes(&self, bytes: &[u8], speed: f32, offset_sec: f32) -> Result<u64, String> {
        self.stop().await;

        let temp_path = std::env::temp_dir().join("verbum_playback.wav");
        {
            let mut file =
                File::create(&temp_path).map_err(|e| format!("Failed to create temp audio file: {}", e))?;
            file.write_all(bytes).map_err(|e| format!("Failed to write temp audio file: {}", e))?;
        }

        // pw-play --rate only resamples the stream (same wall duration), so
        // real speed-up is done by time-stretching with ffmpeg atempo; a seek
        // offset is applied in the same ffmpeg pass.
        let needs_cut = offset_sec > 0.05;
        let needs_tempo = (speed - 1.0).abs() > 0.05 && ffmpeg_available();
        let play_path = if needs_cut || needs_tempo {
            transform_audio(&temp_path, offset_sec, if needs_tempo { speed } else { 1.0 }).unwrap_or_else(|e| {
                eprintln!("verbum: ffmpeg speed/seek transform skipped ({})", e);
                temp_path.clone()
            })
        } else {
            temp_path.clone()
        };

        let mut cmd = detect_player(&play_path)?;
        let child = cmd.spawn().map_err(|e| format!("Failed to spawn audio player process: {}", e))?;
        let pid = child.id().unwrap_or(0);
        *self.is_paused.lock().unwrap() = false;

        let seq = self.playback_seq.fetch_add(1, Ordering::SeqCst) + 1;
        *self.current.lock().await = Some(ActivePlayback { child, pid });
        Ok(seq)
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
                        guard.take();
                        return if status.success() {
                            PlaybackOutcome::Completed
                        } else {
                            PlaybackOutcome::Failed
                        };
                    }
                    Ok(None) => {}
                    Err(_) => {
                        guard.take();
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
        *self.current.lock().await = Some(ActivePlayback { child, pid });
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

fn ffmpeg_available() -> bool {
    static AVAILABLE: std::sync::OnceLock<bool> = std::sync::OnceLock::new();
    *AVAILABLE.get_or_init(|| backend_available("ffmpeg"))
}

// Seek to `offset_sec` and/or time-stretch by `speed` into a temp WAV in one
// ffmpeg pass. atempo keeps pitch intact; if ffmpeg is missing the caller
// falls back to the original 1x file.
fn transform_audio(src: &Path, offset_sec: f32, speed: f32) -> Result<PathBuf, String> {
    let out = std::env::temp_dir().join("verbum_playback_speed.wav");
    let mut cmd = Command::new("ffmpeg");
    cmd.args(["-y", "-v", "error"]);
    if offset_sec > 0.05 {
        cmd.arg("-ss").arg(format!("{:.3}", offset_sec));
    }
    cmd.arg("-i").arg(src);
    if (speed - 1.0).abs() > 0.05 {
        cmd.arg("-filter:a").arg(format!("atempo={:.3}", speed.clamp(0.5, 2.0)));
    }
    cmd.args(["-f", "wav"]).arg(&out);
    let status = cmd.output().map_err(|e| format!("ffmpeg spawn failed: {}", e))?;
    if !status.status.success() {
        return Err(String::from_utf8_lossy(&status.stderr).trim().to_string());
    }
    Ok(out)
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
        let seq = player.spawn_for_test(AsyncCommand::new("false")).await.unwrap();
        assert_eq!(player.wait_for(seq).await, PlaybackOutcome::Failed);
    }
}
