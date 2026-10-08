import { useEffect } from "react";

// One shared lock covers nested academic, recovery, support and report dialogs.
export function useDialogLock() {
  useEffect(() => {
    let current = null,
      previousFocus = null,
      previousOverflow = "";
    const focusable = () =>
      current
        ? [
            ...current.querySelectorAll(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
            ),
          ].filter((el) => el.getClientRects().length)
        : [];
    const sync = () => {
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      const next = dialogs[dialogs.length - 1] || null;
      if (next === current) return;
      if (!current && next) {
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      current = next;
      if (current) (focusable()[0] || current).focus();
      else {
        document.body.style.overflow = previousOverflow;
        if (previousFocus?.isConnected) previousFocus.focus();
      }
    };
    const keydown = (e) => {
      if (!current) return;
      if (e.key === "Escape") {
        const close = current.querySelector('[aria-label^="Close"]');
        if (close) {
          e.preventDefault();
          close.click();
        }
      }
      if (e.key === "Tab") {
        const items = focusable();
        if (!items.length) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === items[0] ||
            !current.contains(document.activeElement))
        ) {
          e.preventDefault();
          items.at(-1).focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === items.at(-1) ||
            !current.contains(document.activeElement))
        ) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
    document.addEventListener("keydown", keydown);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keydown);
      if (current) document.body.style.overflow = previousOverflow;
    };
  }, []);
}
