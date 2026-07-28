"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { lineFor, type SpaceBuilder } from "@/lib/builders";

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

    let centres: { x: number; y: number }[] = [];
    let needsMeasure = true;
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let settleFrames = 0;

    function measure() {
      centres = els().map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
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
      for (let i = 0; i < list.length; i++) {
        const centre = centres[i];
        if (!centre) continue;
        const next = devFor(centre);
        const prev = Number(list[i].dataset.dev ?? "0");
        if (Math.abs(next - prev) > 0.004) {
          list[i].dataset.dev = String(next);
          list[i].style.setProperty("--dev", next.toFixed(3));
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

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    wake();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [builders.length]);

  return (
    <section aria-labelledby="space-heading" className="w-full">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2
          id="space-heading"
          className="font-mono text-xs tracking-widest opacity-60"
        >
          the whole cohort
        </h2>
        <p className="mt-3 font-mono text-xs leading-relaxed opacity-40">
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
              className="frame absolute block w-44 -translate-x-1/2 -translate-y-1/2 sm:w-52"
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
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

      <p className="mx-auto max-w-2xl px-6 text-center font-mono text-xs leading-relaxed opacity-40">
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
