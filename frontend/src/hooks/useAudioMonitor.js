import { useEffect } from "react";

export function useAudioMonitor(enabled, onEvent) {
  useEffect(() => {
    if (!enabled) return undefined;

    let rafId;
    let stream;
    let audioContext;
    let analyser;
    let voiceFrames = 0;

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

          if (avg > 35) {
            voiceFrames += 1;
          } else {
            voiceFrames = Math.max(voiceFrames - 1, 0);
          }

          if (voiceFrames > 40) {
            onEvent({
              eventType: "BACKGROUND_VOICE",
              confidence: 0.7,
              source: "audio",
              metadata: { avgEnergy: Number(avg.toFixed(2)) },
            });
            voiceFrames = 0;
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
