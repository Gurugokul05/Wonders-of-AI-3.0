import { useEffect } from "react";

export function useBrowserGuards(onEvent) {
  useEffect(() => {
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
  }, [onEvent]);
}
