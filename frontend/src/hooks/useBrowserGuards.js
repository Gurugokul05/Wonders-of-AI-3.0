import { useEffect } from "react";

const NAVIGATION_KEYS = new Set([
  "tab",
  "shift",
  "control",
  "alt",
  "meta",
  "capslock",
  "arrowleft",
  "arrowright",
  "arrowup",
  "arrowdown",
  "escape",
]);

export function useBrowserGuards(enabled, onEvent) {
  useEffect(() => {
    if (!enabled) return undefined;

    let recentKeyTimestamps = [];

    const onVisibility = () => {
      if (document.hidden) {
        onEvent({
          eventType: "TAB_HIDDEN",
          confidence: 0.9,
          source: "browser",
          metadata: { hiddenAt: Date.now() },
        });
      }
    };

    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        onEvent({
          eventType: "FULLSCREEN_EXIT",
          confidence: 0.95,
          source: "browser",
        });
      }
    };

    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const suspicious =
        (e.ctrlKey || e.metaKey) && ["c", "v", "a"].includes(key);

      if (suspicious) {
        onEvent({
          eventType: "SHORTCUT_COPY_PASTE",
          confidence: 0.85,
          source: "browser",
          metadata: {
            keyCombo: `${e.ctrlKey ? "Ctrl" : "Meta"}+${key.toUpperCase()}`,
          },
        });
        return;
      }

      if (NAVIGATION_KEYS.has(key)) {
        return;
      }

      const now = Date.now();
      recentKeyTimestamps = recentKeyTimestamps.filter((ts) => now - ts < 4000);
      recentKeyTimestamps.push(now);

      if (recentKeyTimestamps.length >= 8) {
        onEvent({
          eventType: "KEYBOARD_ACTIVITY",
          confidence: 0.72,
          source: "browser",
          metadata: {
            keyPressCount: recentKeyTimestamps.length,
            windowMs: 4000,
          },
        });
        recentKeyTimestamps = [];
      }
    };

    const onPaste = (e) => {
      const text = e.clipboardData?.getData("text") || "";
      if (text.length >= 120) {
        onEvent({
          eventType: "LARGE_PASTE",
          confidence: 0.8,
          source: "browser",
          metadata: { pastedLength: text.length },
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [enabled, onEvent]);
}
