"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

// Client-safe module only. Importing lib/builders here would pull the database
// client into the browser bundle, which is what crashed this page once already.
import { lineFor, type SpaceBuilder } from "@/lib/builder-card";

/**
 * The space: the whole cohort, positioned by similarity, developing under
 * attention. This is rung 4 of the degradation ladder — a visitor who never
 * speaks, never types and never clicks anything still lands inside something
 * alive.
 *
 * Positions are static data computed offline (scripts/layout.ts). Distance
 * means one thing: builders near each other work on similar things. There is
 * no axis, no order, no rank.
 *
 * PERFORMANCE CONTRACT (BUILD-PLAN §6):
 *  - one requestAnimationFrame loop, started only while attention is moving
 *  - it writes a CSS custom property directly on each element
 *  - zero React state and zero re-renders on pointer move
 *  - card centres are measured on resize/scroll, never per frame, so the
 *    loop never forces a reflow
 */

/** Pixels from the pointer at which a frame is fully developed / fully latent. */
const NEAR = 90;
const FAR = 330;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function Space({ builders }: { builders: SpaceBuilder[] }) {
  const frames = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const els = () => frames.current.filter((el): el is HTMLAnchorElement => !!el);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");

    // The locked floor. CSS already renders these developed; the loop simply
    // never runs, so a reduced-motion visitor pays nothing for the mechanic.
    if (reduced.matches) return;

    // Cached geometry. Measured on scroll and resize, never inside the loop,
    // so a pointer move never forces a reflow.
    let boxes: {
      x: number;
      y: number;
      left: number;
      right: number;
      top: number;
      bottom: number;
    }[] = [];
    let needsMeasure = true;
    let pointer: { x: number; y: number } | null = null;
    let keyboard: Element | null = null;
    let raf = 0;
    let settleFrames = 0;

    function measure() {
      boxes = els().map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      });
      needsMeasure = false;
    }

    function devFor(centre: { x: number; y: number }): number {
      if (hover.matches) {
        if (!pointer) return 0;
        const d = Math.hypot(centre.x - pointer.x, centre.y - pointer.y);
        return 1 - smoothstep(NEAR, FAR, d);
      }
      // No pointer to follow. Attention is where the viewport is looking, so
      // distance is measured from the centre of the screen as you scroll.
      // Designed for touch, not degraded from the desktop path.
      const mid = window.innerHeight / 2;
      const d = Math.abs(centre.y - mid);
      return 1 - smoothstep(window.innerHeight * 0.12, window.innerHeight * 0.42, d);
    }

    function frame() {
      if (needsMeasure) measure();
      const list = els();
      let changed = false;

      // Two channels, because they answer different questions.
      //   --dev   : how close attention is. Every frame gets a value, which is
      //             what makes the space breathe as you move across it.
      //   --focus : whether this is THE frame being looked at. Only one can
      //             hold it, because a developed frame is five lines tall and
      //             two of them at once is just collided text.
      let best = -1;
      let bestDev = 0;
      for (let i = 0; i < list.length; i++) {
        if (!boxes[i]) continue;
        const d = devFor(boxes[i]);
        if (d > bestDev) {
          bestDev = d;
          best = i;
        }
      }

      // A frame the pointer is actually inside always wins, whatever the
      // centre distances say. CSS :hover is the no-JS fallback for the same
      // thing, and when the two disagree you get two frames both convinced
      // they are the one being read, writing their lines over each other.
      // Uses cached geometry, so agreeing costs nothing per frame.
      if (pointer && hover.matches) {
        const p = pointer;
        const under = boxes.findIndex(
          (b) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom
        );
        if (under !== -1) best = under;
      }

      // Keyboard focus outranks everything, and it has to be handled here
      // rather than in CSS: this loop writes --focus inline on every frame, and
      // an inline value beats any stylesheet rule, so a :focus-visible rule
      // would silently never win and a keyboard user would never see a line.
      if (keyboard) {
        const k = list.indexOf(keyboard as HTMLAnchorElement);
        if (k !== -1) best = k;
      }

      for (let i = 0; i < list.length; i++) {
        const centre = boxes[i];
        if (!centre) continue;
        // Safety net for the keyboard path: if a frame is keyboard-focused,
        // drop our inline value entirely so the :focus-visible rule in the
        // stylesheet can apply. Inline always beats the stylesheet, so writing
        // a 0 here is the difference between a reachable space and one a
        // keyboard user can tab through but never read.
        if (list[i].matches(":focus-visible")) {
          list[i].style.removeProperty("--focus");
          list[i].style.setProperty("--dev", "1");
          list[i].dataset.dev = "1";
          list[i].dataset.focus = "1";
          continue;
        }

        const isKeyboard = keyboard !== null && list[i] === keyboard;
        const next = isKeyboard ? 1 : devFor(centre);
        const focus = i === best && (isKeyboard || next > 0.6) ? 1 : 0;
        const prev = Number(list[i].dataset.dev ?? "0");
        const prevFocus = Number(list[i].dataset.focus ?? "0");
        if (Math.abs(next - prev) > 0.004 || focus !== prevFocus) {
          list[i].dataset.dev = String(next);
          list[i].dataset.focus = String(focus);
          list[i].style.setProperty("--dev", next.toFixed(3));
          list[i].style.setProperty("--focus", String(focus));
          changed = true;
        }
      }
      // Idle for half a second of frames means the space has settled; stop
      // burning the compositor until attention moves again.
      settleFrames = changed ? 0 : settleFrames + 1;
      if (settleFrames > 30) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      settleFrames = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function onPointerMove(e: PointerEvent) {
      pointer = { x: e.clientX, y: e.clientY };
      wake();
    }
    function onPointerLeave() {
      pointer = null;
      wake();
    }
    function onScroll() {
      needsMeasure = true;
      wake();
    }
    function onResize() {
      needsMeasure = true;
      wake();
    }
    function onFocusIn(e: FocusEvent) {
      const el = (e.target as Element | null)?.closest(".frame") ?? null;
      // Only a frame reached by keyboard claims focus; a click already has the
      // pointer path, and letting it claim here would strand the line behind
      // after the pointer moves on.
      keyboard = el && el.matches(":focus-visible") ? el : null;
      needsMeasure = true;
      wake();
    }
    function onFocusOut() {
      keyboard = null;
      wake();
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    wake();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [builders.length]);

  return (
    <section aria-labelledby="space-heading" className="w-full">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2
          id="space-heading"
          className="font-mono text-xs tracking-widest opacity-60"
        >
          all {builders.length} builders
        </h2>
        <p className="mt-3 font-mono text-xs leading-relaxed opacity-55">
          Builders who work on similar things sit near each other. Nothing here
          is ranked. Move across them, or open one.
        </p>
      </div>

      <div
        className="relative mx-auto mt-10 h-[150vh] w-full max-w-6xl px-4 sm:h-[130vh]"
        // The field itself is decorative framing; every frame inside is a real
        // link, so the whole space is reachable by keyboard in handle order.
      >
        {builders.map((b, i) => {
          const line = lineFor(b);
          return (
            <Link
              key={b.handle}
              href={`/b/${b.handle}`}
              ref={(el) => {
                frames.current[i] = el;
              }}
              className="frame space-frame absolute block w-44 -translate-x-1/2 -translate-y-1/2 sm:w-52"
              style={
                {
                  "--x": `${b.x * 100}%`,
                  "--y": `${b.y * 100}%`,
                } as React.CSSProperties
              }
            >
              <span className="block font-mono text-xs tracking-widest">
                @{b.handle}
              </span>
              {b.displayName && (
                <span className="mt-1 block text-sm opacity-70">
                  {b.displayName}
                </span>
              )}
              <span className="frame-line mt-2 block text-[0.8rem] leading-snug">
                {line ? truncate(line.text, 96) : b.languages.join(" · ")}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mx-auto max-w-2xl px-6 text-center font-mono text-xs leading-relaxed opacity-55">
        Dim lines are read from each builder&rsquo;s public GitHub. A builder
        who claims their card replaces that line with their own words.
      </p>
    </section>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = cut.lastIndexOf(" ");
  return `${cut.slice(0, stop > 40 ? stop : max)}…`;
}
