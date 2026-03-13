import { useEffect } from "react";

const AUDIO_ENERGY_THRESHOLD = 46;
const SPEECH_CONFIRMATION_MS = 2200;
const EVENT_COOLDOWN_MS = 9000;

export function useAudioMonitor(enabled, onEvent) {
  useEffect(() => {
    if (!enabled) return undefined;

    let rafId;
    let stream;
    let audioContext;
    let analyser;
    let speechStartTs = null;
    let lastEventTs = 0;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new window.AudioContext();
        const src = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const now = performance.now();

          if (avg >= AUDIO_ENERGY_THRESHOLD) {
            if (speechStartTs === null) speechStartTs = now;
          } else {
            speechStartTs = null;
          }

          const sustainedSpeechMs =
            speechStartTs === null ? 0 : now - speechStartTs;
          if (
            sustainedSpeechMs >= SPEECH_CONFIRMATION_MS &&
            now - lastEventTs >= EVENT_COOLDOWN_MS
          ) {
            onEvent({
              eventType: "BACKGROUND_VOICE",
              confidence: 0.7,
              source: "audio",
              metadata: {
                avgEnergy: Number(avg.toFixed(2)),
                sustainedSpeechMs: Math.round(sustainedSpeechMs),
              },
            });
            lastEventTs = now;
            speechStartTs = null;
          }

          rafId = requestAnimationFrame(tick);
        };

        tick();
      } catch (error) {
        console.warn("Microphone monitoring unavailable", error);
      }
    };

    start();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [enabled, onEvent]);
}
