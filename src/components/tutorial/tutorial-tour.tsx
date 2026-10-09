"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  Circle,
  CircleCheck,
  Cloud,
  Compass,
  Hand,
  Lightbulb,
  PartyPopper,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionModal } from "@/components/expenses/transaction-modal-provider";
import { registerOverlayBack } from "@/lib/native/overlay-back";
import {
  cancelTutorialCreate,
  onTutorialSignal,
  requestTutorialCreate,
  type TutorialTaskKind,
} from "@/lib/tutorial/signals";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  resetSidebarTransient,
  setSidebarPinned,
} from "@/lib/store/slices/uiSlice";
import { cn } from "@/lib/cn";
import type {
  TutorialAction,
  TutorialLayout,
  TutorialPlacement,
  TutorialStep,
} from "@/lib/api/tutorial";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  compass: Compass,
  wallet: WalletCards,
  plus: Plus,
  "arrow-left-right": ArrowLeftRight,
  target: Target,
  search: Search,
  cloud: Cloud,
  settings: Settings,
  party: PartyPopper,
};

/** Viewport margin, gap between target and card, spotlight padding. */
const MARGIN = 12;
const GAP = 14;
const SPOT_PAD = 6;
const DESKTOP_CARD_WIDTH = 380;
const MOBILE_CARD_MAX_WIDTH = 460;

type Side = "top" | "bottom" | "left" | "right";
type Rect = { x: number; y: number; w: number; h: number };
type Insets = { top: number; right: number; bottom: number; left: number };

type Geometry = {
  spot: Rect | null;
  card: { top: number; left: number; width: number; maxHeight: number };
  arrow: { side: Side; offset: number } | null;
  /** False until the card has been measured once (avoids a first-frame jump). */
  placed: boolean;
};

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

/** First visible element carrying `data-tour="<id>"`. */
function findAnchor(id: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const selector = `[data-tour="${
    typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id
  }"]`;
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  for (const node of Array.from(nodes)) {
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    // Off-canvas copies (hidden sidebar, closed drawers) sit outside the viewport.
    if (rect.right <= 0 || rect.left >= window.innerWidth) continue;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.display === "none") continue;
    return node;
  }
  return null;
}

/** env(safe-area-inset-*) as numbers (notches, Android edge-to-edge). */
function readSafeAreaInsets(): Insets {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function computeGeometry({
  target,
  cardHeight,
  layout,
  placement,
  insets,
}: {
  target: DOMRect | null;
  cardHeight: number;
  layout: TutorialLayout;
  placement: TutorialPlacement;
  insets: Insets;
}): Geometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minTop = insets.top + MARGIN;
  const maxBottom = vh - insets.bottom - MARGIN;
  const minLeft = insets.left + MARGIN;
  const maxRight = vw - insets.right - MARGIN;
  const width =
    layout === "mobile"
      ? Math.min(maxRight - minLeft, MOBILE_CARD_MAX_WIDTH)
      : Math.min(DESKTOP_CARD_WIDTH, maxRight - minLeft);
  const maxHeight = Math.max(200, maxBottom - minTop);
  const height = Math.min(cardHeight || 280, maxHeight);
  const centeredLeft = minLeft + (maxRight - minLeft - width) / 2;

  if (!target) {
    // Phones: a bottom sheet within thumb reach. Desktop: centred dialog.
    const top =
      layout === "mobile"
        ? maxBottom - height
        : minTop + (maxBottom - minTop - height) / 2;
    return {
      spot: null,
      card: { top, left: centeredLeft, width, maxHeight },
      arrow: null,
      placed: cardHeight > 0,
    };
  }

  const spot: Rect = {
    x: target.left - SPOT_PAD,
    y: target.top - SPOT_PAD,
    w: target.width + SPOT_PAD * 2,
    h: target.height + SPOT_PAD * 2,
  };
  const spotRight = spot.x + spot.w;
  const spotBottom = spot.y + spot.h;
  const centerX = spot.x + spot.w / 2;
  const centerY = spot.y + spot.h / 2;

  const place = (side: Side) => {
    if (side === "bottom" || side === "top") {
      const top = side === "bottom" ? spotBottom + GAP : spot.y - GAP - height;
      const left = clamp(centerX - width / 2, minLeft, maxRight - width);
      const fits =
        side === "bottom" ? top + height <= maxBottom : top >= minTop;
      return { top, left, fits };
    }
    const left = side === "right" ? spotRight + GAP : spot.x - GAP - width;
    const top = clamp(centerY - height / 2, minTop, maxBottom - height);
    const fits = side === "right" ? left + width <= maxRight : left >= minLeft;
    return { top, left, fits };
  };

  const spaceBelow = maxBottom - spotBottom;
  const spaceAbove = spot.y - minTop;
  const vertical: Side[] =
    placement === "top" || (placement !== "bottom" && spaceAbove > spaceBelow)
      ? ["top", "bottom"]
      : ["bottom", "top"];
  // Phones are too narrow for side placement.
  const order: Side[] =
    layout === "mobile"
      ? vertical
      : placement === "left" || placement === "right"
        ? [placement, ...vertical, placement === "left" ? "right" : "left"]
        : [...vertical, "right", "left"];

  for (const side of order) {
    const spotPlacement = place(side);
    if (!spotPlacement.fits) continue;
    const offset =
      side === "top" || side === "bottom"
        ? clamp(centerX - spotPlacement.left, 22, width - 22)
        : clamp(centerY - spotPlacement.top, 22, height - 22);
    return {
      spot,
      card: {
        top: spotPlacement.top,
        left: spotPlacement.left,
        width,
        maxHeight,
      },
      arrow: { side, offset },
      placed: cardHeight > 0,
    };
  }

  // Nothing fits (tiny screen, huge target): dock where there is more room.
  const top = spaceBelow >= spaceAbove ? maxBottom - height : minTop;
  return {
    spot,
    card: { top, left: centeredLeft, width, maxHeight },
    arrow: null,
    placed: cardHeight > 0,
  };
}

function geometryKey(geo: Geometry): string {
  const r = (n: number) => Math.round(n);
  const s = geo.spot;
  return [
    s ? `${r(s.x)},${r(s.y)},${r(s.w)},${r(s.h)}` : "-",
    r(geo.card.top),
    r(geo.card.left),
    r(geo.card.width),
    r(geo.card.maxHeight),
    geo.arrow ? `${geo.arrow.side}${r(geo.arrow.offset)}` : "-",
    geo.placed ? 1 : 0,
  ].join("|");
}

function prefersReducedMotion(): boolean {
  if (document.documentElement.dataset.reduceMotion === "true") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

export function TutorialTour({
  steps,
  layout,
  startStepId,
  doneTasks,
  onView,
  onPostpone,
  onComplete,
}: {
  steps: TutorialStep[];
  layout: TutorialLayout;
  startStepId: string | null;
  /** Hands-on tasks already satisfied (existing data or done this session). */
  doneTasks: ReadonlySet<TutorialTaskKind>;
  onView: (step: TutorialStep) => void;
  onPostpone: (step: TutorialStep | null) => void;
  onComplete: (step: TutorialStep | null) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarPinned = useAppSelector((state) => state.ui.sidebarPinned);
  const { openTransactionModal } = useTransactionModal();
  const titleId = useId();
  const bodyId = useId();

  const [stepId, setStepId] = useState<string>(
    () =>
      (startStepId && steps.find((step) => step.id === startStepId)?.id) ||
      steps[0].id,
  );
  const lastIndexRef = useRef(0);
  const foundIndex = steps.findIndex((step) => step.id === stepId);
  // Steps change with the layout (rotation / resize); keep our place.
  const index =
    foundIndex >= 0
      ? foundIndex
      : Math.min(lastIndexRef.current, steps.length - 1);
  lastIndexRef.current = index;
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const anchorId = step.target?.[layout] ?? null;
  const Icon = (step.icon && ICONS[step.icon]) || Lightbulb;

  /* -------- hands-on tasks --------------------------------------------- */
  /** Task whose real form is open; the tour steps aside meanwhile. */
  const [activeTask, setActiveTask] = useState<TutorialTaskKind | null>(null);
  /** Task finished during this step (shows the success state). */
  const [justDone, setJustDone] = useState<TutorialTaskKind | null>(null);
  const task = step.task ?? null;
  const taskDone = task ? doneTasks.has(task.kind) : false;
  const pendingTask = Boolean(task && !taskDone);
  const prerequisite =
    task?.requires && !doneTasks.has(task.requires) ? task.requires : null;
  const taskOwner = (kind: TutorialTaskKind) =>
    steps.find((candidate) => candidate.task?.kind === kind) ?? null;
  const activeTaskDef = activeTask ? taskOwner(activeTask)?.task : null;

  const openTaskForm = useCallback(
    (kind: TutorialTaskKind) => {
      if (kind === "create-transaction") {
        openTransactionModal();
        return;
      }
      const route = steps.find((s) => s.task?.kind === kind)?.route;
      if (route && normalizePath(pathname) !== normalizePath(route)) {
        router.push(route);
      }
      // Runs now, or once the page has mounted and registered its form.
      requestTutorialCreate(kind);
    },
    [openTransactionModal, pathname, router, steps],
  );

  const startTask = (kind: TutorialTaskKind) => {
    setActiveTask(kind);
    openTaskForm(kind);
  };

  const leaveTask = useCallback(() => {
    cancelTutorialCreate();
    setActiveTask(null);
  }, []);

  // The create APIs signal success; come back once the form has closed.
  useEffect(() => {
    let timer = 0;
    const stop = onTutorialSignal((kind) => {
      if (kind === task?.kind) setJustDone(kind);
      if (kind !== activeTask) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActiveTask(null), 500);
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [activeTask, task?.kind]);

  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const scrolledForRef = useRef<string | null>(null);
  /** Spotlight as drawn: eases towards the target between steps. */
  const shownSpotRef = useRef<Rect | null>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const geoRef = useRef<Geometry | null>(null);
  geoRef.current = geo;

  const goTo = useCallback(
    (nextIndex: number) => {
      const next = steps[clamp(nextIndex, 0, steps.length - 1)];
      if (next) setStepId(next.id);
    },
    [steps],
  );
  const next = useCallback(() => {
    if (isLast) onComplete(step);
    else goTo(index + 1);
  }, [goTo, index, isLast, onComplete, step]);
  const back = useCallback(() => {
    if (!isFirst) goTo(index - 1);
  }, [goTo, index, isFirst]);
  const postpone = useCallback(() => onPostpone(step), [onPostpone, step]);

  const runAction = (action: TutorialAction) => {
    onComplete(step);
    if (action.kind === "navigate") router.push(action.href);
    else openTransactionModal();
  };

  /* -------- desktop: keep the sidebar on screen while touring ---------- */
  const initialPinnedRef = useRef(sidebarPinned);
  useEffect(() => {
    if (layout !== "desktop" || initialPinnedRef.current) return;
    dispatch(setSidebarPinned(true));
    return () => {
      dispatch(setSidebarPinned(false));
    };
  }, [dispatch, layout]);

  /* -------- per step: clear overlays, open the route, record the view -- */
  useEffect(() => {
    dispatch(resetSidebarTransient());
    window.dispatchEvent(new Event("finos:close-overlays"));
    targetRef.current = null;
    scrolledForRef.current = null;
    setJustDone(null);
    if (step.route && normalizePath(pathname) !== normalizePath(step.route)) {
      router.push(step.route);
    }
    onView(step);
    // Only when the step changes; pathname updates must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  /* -------- follow the target every frame (scroll, resize, animation) -- */
  useEffect(() => {
    if (activeTask) return;
    let frame = 0;
    let lastKey = "";
    let sizedOnce = geoRef.current !== null;
    let lastFrame = performance.now();
    let insets = readSafeAreaInsets();
    const onResize = () => {
      insets = readSafeAreaInsets();
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      let el = targetRef.current;
      if (anchorId && (!el || !el.isConnected)) {
        el = findAnchor(anchorId);
        targetRef.current = el;
      }
      if (el && scrolledForRef.current !== step.id) {
        scrolledForRef.current = step.id;
        const rect = el.getBoundingClientRect();
        if (
          rect.top < insets.top + 56 ||
          rect.bottom > window.innerHeight - 80
        ) {
          el.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
        }
      }
      const next = computeGeometry({
        target: el ? el.getBoundingClientRect() : null,
        cardHeight: cardRef.current?.offsetHeight ?? 0,
        layout,
        placement: step.placement ?? "auto",
        insets,
      });
      // The first measurement is of the unsized card; show it from the next.
      next.placed = next.placed && sizedOnce;
      sizedOnce = true;
      // Glide the spotlight to the new target (the dim is an SVG path, which
      // CSS cannot transition everywhere); jump when motion is reduced.
      const now = performance.now();
      const shown = shownSpotRef.current;
      if (!next.spot || !shown || prefersReducedMotion()) {
        shownSpotRef.current = next.spot;
      } else {
        const ease = 1 - Math.exp(-(now - lastFrame) / 70);
        const lerp = (from: number, to: number) =>
          Math.abs(to - from) < 0.5 ? to : from + (to - from) * ease;
        shownSpotRef.current = {
          x: lerp(shown.x, next.spot.x),
          y: lerp(shown.y, next.spot.y),
          w: lerp(shown.w, next.spot.w),
          h: lerp(shown.h, next.spot.h),
        };
      }
      lastFrame = now;
      next.spot = shownSpotRef.current;
      const key = geometryKey(next);
      if (key !== lastKey) {
        lastKey = key;
        setGeo(next);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [activeTask, anchorId, layout, step.id, step.placement]);

  /* -------- focus: move into the card, restore on close ---------------- */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    if (activeTask) return;
    cardRef.current
      ?.querySelector<HTMLElement>("[data-tutorial-primary]")
      ?.focus({ preventScroll: true });
  }, [activeTask, step.id, taskDone]);

  /* -------- keyboard (off while the user fills in a real form) ---------- */
  useEffect(() => {
    if (activeTask) return;
    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      // Keep app shortcuts (palette, new transaction, sidebar) from opening
      // things underneath the tour.
      if (
        (event.ctrlKey || event.metaKey) &&
        ["k", "n", "\\"].includes(key.toLowerCase())
      ) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        postpone();
      } else if (key === "ArrowRight") {
        event.preventDefault();
        // A pending task is done with its own button, not skipped by a key.
        if (!pendingTask) next();
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        back();
      } else if (key === "Tab") {
        const focusable = Array.from(
          cardRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), [href]",
          ) ?? [],
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const inside = cardRef.current?.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || !inside)) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !inside)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activeTask, back, next, pendingTask, postpone]);

  /* -------- Android back: previous step, or pause on the first one ------ */
  useEffect(
    () =>
      registerOverlayBack(() => {
        // The form registers after us, so back closes it first; the next
        // back press returns to the tour card.
        if (activeTask) leaveTask();
        else if (isFirst) postpone();
        else back();
      }),
    // Re-register after every step: the back handler pops itself off the stack.
    [activeTask, back, isFirst, leaveTask, postpone, step.id],
  );

  if (typeof document === "undefined") return null;

  /* -------- task mode: a slim, non-blocking coach bar ------------------- */
  if (activeTask) {
    return createPortal(
      <div
        data-tutorial-root
        role="region"
        aria-label="Tutorial"
        // Under modals (z-100) so it never covers the form being filled in.
        className="tutorial-step-in fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[90] mx-auto max-w-xl rounded-[14px] bg-[var(--ds-background-elevated)] px-3.5 py-3 text-[13px] text-[var(--ds-gray-1000)] shadow-[0_12px_36px_rgba(0,0,0,0.28)] ds-strong-border"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)] text-[var(--ds-focus-color)]">
            <Hand size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ds-focus-color)]">
              Your turn · step {index + 1} of {steps.length}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-[1.45] text-[var(--ds-gray-900)]">
              {activeTaskDef?.hint ?? "Fill in the form and save it."}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" size="md" onClick={leaveTask}>
            Back to tour
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => openTaskForm(activeTask)}
          >
            Open the form again
          </Button>
        </div>
      </div>,
      document.body,
    );
  }

  const spot = geo?.spot ?? null;
  const card = geo?.card;
  const progress = ((index + 1) / steps.length) * 100;
  const checklist = step.checklist
    ? steps.flatMap((candidate, stepIndex) =>
        candidate.task ? [{ task: candidate.task, stepIndex }] : [],
      )
    : [];

  const holeRadius = spot ? Math.min(14, spot.h / 2) : 0;

  let primary: { label: string; onClick: () => void; icon: LucideIcon };
  if (pendingTask && prerequisite) {
    primary = {
      label: taskOwner(prerequisite)?.task?.label ?? "Do the previous step",
      onClick: () => startTask(prerequisite),
      icon: Plus,
    };
  } else if (pendingTask && task) {
    primary = {
      label: task.label,
      onClick: () => startTask(task.kind),
      icon: Plus,
    };
  } else {
    primary = {
      label: isFirst ? "Start tour" : isLast ? "Finish" : "Next",
      onClick: next,
      icon: isLast ? Check : ArrowRight,
    };
  }
  const PrimaryIcon = primary.icon;

  return createPortal(
    <div
      data-tutorial-root
      className="fixed inset-0 z-[300] select-none"
      // Swallow clicks so the app underneath stays put during the tour.
      onPointerDown={(event) => {
        if (!cardRef.current?.contains(event.target as Node)) {
          event.preventDefault();
        }
      }}
    >
      {/* Dim with a hole cut around the target: one even-odd SVG path.
          (A huge box-shadow fails to paint in some renderers, and an SVG
          mask double-dims in Chromium.) */}
      {spot ? (
        <svg
          aria-hidden
          className="tutorial-dim pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d={dimPath(spot, holeRadius)}
            fillRule="evenodd"
            fill="black"
            fillOpacity={0.62}
          />
        </svg>
      ) : (
        <div
          aria-hidden
          className="tutorial-dim pointer-events-none absolute inset-0 bg-black/[0.62]"
        />
      )}
      {spot ? (
        <div
          aria-hidden
          className="tutorial-spotlight pointer-events-none absolute"
          style={{
            top: spot.y,
            left: spot.x,
            width: spot.w,
            height: spot.h,
            borderRadius: holeRadius,
          }}
        >
          <span className="tutorial-spotlight-ring" />
        </div>
      ) : null}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          // globals.css gives <button> `font: inherit`, so the card sets the
          // size its buttons pick up.
          "tutorial-card absolute flex select-text flex-col text-[13.5px]",
          !geo?.placed && "opacity-0",
        )}
        style={
          card
            ? {
                top: card.top,
                left: card.left,
                width: card.width,
                maxHeight: card.maxHeight,
              }
            : { visibility: "hidden" }
        }
      >
        {geo?.arrow ? (
          <CardArrow side={geo.arrow.side} offset={geo.arrow.offset} />
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-[var(--ds-background-elevated)] text-[var(--ds-gray-1000)] shadow-[0_24px_64px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.18)] ds-strong-border">
          <div
            className="h-1 w-full shrink-0 bg-[color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)]"
            role="progressbar"
            aria-label="Tutorial progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
          >
            <div
              className="h-full rounded-r-full bg-[var(--ds-focus-color)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            key={step.id}
            className="tutorial-step-in app-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-3 sm:px-6 sm:pt-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--ds-focus-color)_14%,transparent)] text-[var(--ds-focus-color)]">
                <Icon size={19} aria-hidden />
              </span>
              <div className="flex items-center gap-1">
                <span
                  className="text-[11.5px] font-medium tabular-nums text-[var(--ds-gray-700)]"
                  aria-live="polite"
                >
                  Step {index + 1} of {steps.length}
                </span>
                <button
                  type="button"
                  onClick={postpone}
                  aria-label="Close tutorial for now"
                  title="Close (Esc)"
                  className="-mr-2 flex size-9 items-center justify-center rounded-[9px] text-[var(--ds-gray-700)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)] ds-focus"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <h2
              id={titleId}
              className="mt-3 font-heading text-[18px] font-semibold leading-tight tracking-[-0.02em] sm:text-[19px]"
            >
              {step.title}
            </h2>
            <p
              id={bodyId}
              className="mt-2 text-[13.5px] leading-[1.55] text-[var(--ds-gray-900)]"
            >
              {step.body}
            </p>

            {task && taskDone ? (
              <div
                role="status"
                className="mt-3 flex gap-2.5 rounded-[12px] bg-[color-mix(in_srgb,var(--ds-status-green)_12%,transparent)] px-3 py-2.5"
              >
                <CircleCheck
                  size={18}
                  aria-hidden
                  className="mt-px shrink-0 text-[var(--ds-status-green)]"
                />
                <div className="min-w-0 text-[12.5px] leading-[1.5]">
                  {justDone === task.kind ? (
                    <>
                      <p className="font-semibold text-[var(--ds-gray-1000)]">
                        {task.done_title}
                      </p>
                      <p className="text-[var(--ds-gray-900)]">
                        {task.done_body}
                      </p>
                    </>
                  ) : (
                    <p className="text-[var(--ds-gray-900)]">
                      {task.already_done}
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {task && pendingTask ? (
              <div className="mt-3 rounded-[12px] bg-[color-mix(in_srgb,var(--ds-focus-color)_9%,transparent)] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ds-focus-color)]">
                  Your turn
                </p>
                <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--ds-gray-900)]">
                  {prerequisite === "create-account"
                    ? "You need an account to record a transaction. Add one now, then come back to this step."
                    : prerequisite
                      ? "Finish the previous step first, then come back to this one."
                      : task.hint}
                </p>
              </div>
            ) : null}

            {step.tips?.length && !(task && taskDone) ? (
              <ul className="mt-3 space-y-1.5">
                {step.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2 text-[12.5px] leading-[1.5] text-[var(--ds-gray-900)]"
                  >
                    <Check
                      size={14}
                      aria-hidden
                      className="mt-[3px] shrink-0 text-[var(--ds-status-green)]"
                    />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {checklist.length ? (
              <ul
                aria-label="What you set up"
                className="mt-3 divide-y divide-[color:color-mix(in_srgb,var(--ds-gray-1000)_7%,transparent)] rounded-[12px] ds-border"
              >
                {checklist.map(({ task: item, stepIndex }) => {
                  const done = doneTasks.has(item.kind);
                  return (
                    <li
                      key={item.kind}
                      className="flex min-h-11 items-center gap-2.5 px-3 py-2"
                    >
                      {done ? (
                        <CircleCheck
                          size={17}
                          aria-hidden
                          className="shrink-0 text-[var(--ds-status-green)]"
                        />
                      ) : (
                        <Circle
                          size={17}
                          aria-hidden
                          className="shrink-0 text-[var(--ds-gray-700)]"
                        />
                      )}
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[13px]",
                          done
                            ? "text-[var(--ds-gray-1000)]"
                            : "text-[var(--ds-gray-900)]",
                        )}
                      >
                        {item.checklist_label}
                        <span className="sr-only">
                          {done ? " (done)" : " (not done yet)"}
                        </span>
                      </span>
                      {!done ? (
                        <button
                          type="button"
                          onClick={() => goTo(stepIndex)}
                          className="shrink-0 rounded-[7px] px-2 py-1 text-[var(--ds-focus-color)] hover:bg-[var(--ds-gray-100)] ds-focus"
                        >
                          <span className="text-[12px] font-medium">
                            Do it now
                          </span>
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {step.actions?.length ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {step.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => runAction(action)}
                  >
                    {action.kind === "new-transaction" ? (
                      <Plus size={15} aria-hidden />
                    ) : (
                      <Sparkles size={15} aria-hidden />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}

            {task && pendingTask ? (
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                className="mt-3 block rounded-[6px] text-left text-[var(--ds-gray-700)] underline-offset-2 hover:text-[var(--ds-gray-1000)] hover:underline ds-focus"
              >
                <span className="text-[12px]">Skip this step for now</span>
              </button>
            ) : null}

            {isFirst && steps.length > 1 ? (
              <button
                type="button"
                onClick={() => onComplete(step)}
                className="mt-3 block rounded-[6px] text-left text-[var(--ds-gray-700)] underline-offset-2 hover:text-[var(--ds-gray-1000)] hover:underline ds-focus"
              >
                <span className="text-[12px]">
                  I already know my way around. Don&apos;t show this again.
                </span>
              </button>
            ) : null}
          </div>

          {/* Primary action full width on top (thumb reach, long task
              labels), secondary actions beneath. */}
          <div className="shrink-0 space-y-1.5 border-t border-[color:color-mix(in_srgb,var(--ds-gray-1000)_8%,transparent)] px-4 pt-3 pb-2 sm:px-5">
            <Button
              data-tutorial-primary
              size="lg"
              onClick={primary.onClick}
              className="w-full whitespace-nowrap"
            >
              {primary.label}
              <PrimaryIcon size={15} aria-hidden />
            </Button>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={postpone}
                className="-ml-2 whitespace-nowrap px-2.5"
              >
                {isFirst ? "Skip for now" : "Skip tour"}
              </Button>
              {!isFirst ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={back}
                  className="-mr-2 whitespace-nowrap px-2.5"
                >
                  <ArrowLeft size={15} aria-hidden />
                  Back
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Full-viewport rectangle with a rounded-rect hole (even-odd fill). */
function dimPath(hole: Rect, radius: number): string {
  const vw = Math.max(window.innerWidth, hole.x + hole.w) + 1;
  const vh = Math.max(window.innerHeight, hole.y + hole.h) + 1;
  const { x, y, w, h } = hole;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return [
    `M0 0H${vw}V${vh}H0Z`,
    `M${x + r} ${y}H${x + w - r}`,
    `A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}`,
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
  ].join("");
}

function CardArrow({ side, offset }: { side: Side; offset: number }) {
  // The card sits on `side` of the target, so the arrow is on the opposite edge.
  const style: CSSProperties =
    side === "bottom"
      ? { top: -6, left: offset - 6 }
      : side === "top"
        ? { bottom: -6, left: offset - 6 }
        : side === "right"
          ? { left: -6, top: offset - 6 }
          : { right: -6, top: offset - 6 };
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-10 size-3 rotate-45 bg-[var(--ds-background-elevated)]"
      style={style}
    />
  );
}
