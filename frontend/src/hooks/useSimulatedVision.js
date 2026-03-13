import { useEffect } from "react";

const visionEvents = [
  { eventType: "LOOKING_AWAY_PATTERN", source: "cv", confidence: 0.72 },
  { eventType: "NO_FACE_OVER_5S", source: "cv", confidence: 0.8 },
  { eventType: "PHONE_DETECTED", source: "cv", confidence: 0.76 },
  { eventType: "MULTIPLE_FACES", source: "cv", confidence: 0.9 },
];

export function useSimulatedVision(enabled, onEvent) {
  useEffect(() => {
    if (!enabled) return undefined;

    const id = setInterval(() => {
      const chance = Math.random();
      if (chance < 0.16) {
        const ev =
          visionEvents[Math.floor(Math.random() * visionEvents.length)];
        onEvent({ ...ev, metadata: { simulated: true } });
      }
    }, 3500);

    return () => clearInterval(id);
  }, [enabled, onEvent]);
}
