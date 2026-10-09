/**
 * Tracks the on-screen keyboard on touch devices and mirrors it onto <html>:
 *
 * - `data-keyboard="open"` while an editable field is focused and the viewport
 *   has shrunk by more than a keyboard's worth. CSS uses it to hide the bottom
 *   tab bar / FAB, which would otherwise ride up on top of the keyboard on
 *   Android versions that resize the window.
 * - `--kb-inset`: the part of the layout viewport the keyboard still covers.
 *   Non-zero only when the WebView was NOT resized (visual viewport shrank but
 *   the layout did not), so composers can pad themselves above the keyboard.
 */

const KEYBOARD_MIN_PX = 120;

let installed = false;

function isEditable(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) {
    const nonText = [
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ];
    return !el.readOnly && !nonText.includes(el.type);
  }
  return false;
}

export function installKeyboardWatcher() {
  if (installed || typeof window === "undefined") return;
  if (!window.matchMedia?.("(pointer: coarse)").matches) return;
  installed = true;

  const root = document.documentElement;
  // Tallest layout height seen per viewport width (i.e. per orientation).
  const baseline = new Map<number, number>();

  const update = () => {
    const width = window.innerWidth;
    const layoutHeight = window.innerHeight;
    const vv = window.visualViewport;
    const visibleHeight = vv ? vv.height : layoutHeight;

    const editing = isEditable(document.activeElement);
    const known = baseline.get(width) ?? 0;
    if (!editing || layoutHeight > known) {
      baseline.set(width, Math.max(known, layoutHeight));
    }
    const full = baseline.get(width) ?? layoutHeight;

    const shrunk = full - Math.min(layoutHeight, visibleHeight);
    const open = editing && shrunk > KEYBOARD_MIN_PX;

    const covered = vv
      ? Math.max(0, Math.round(layoutHeight - vv.height - vv.offsetTop))
      : 0;

    if (open) root.dataset.keyboard = "open";
    else delete root.dataset.keyboard;
    root.style.setProperty("--kb-inset", `${open ? covered : 0}px`);
  };

  // Focus changes land before the keyboard animates; re-check once it settles.
  let settle: number | undefined;
  const onFocusChange = () => {
    update();
    window.clearTimeout(settle);
    settle = window.setTimeout(update, 350);
  };

  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  document.addEventListener("focusin", onFocusChange);
  document.addEventListener("focusout", onFocusChange);
  update();
}
