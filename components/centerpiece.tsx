"use client";

import { useRef, useState } from "react";

import { Mic } from "@/components/mic";
import { SentenceFrame } from "@/components/sentence-frame";
import {
  composeSentence,
  DEFAULT_MODE,
  detectMode,
  parseSentence,
  type FrameMode,
} from "@/lib/frame-mode";

/**
 * The centerpiece: speak (or type) the blank sentence, and two or three
 * builders develop out of the dark with written explanations. There is no
 * spinner anywhere — waiting looks like latent frames, and the match
 * develops as the stream arrives.
 */

type Section = { handle: string; text: string };
type Meta = { handle: string; name: string | null; line: string | null };

// The second blank holds THE WORK, never a person. This is George's own
// production test from Monday, which is what exposed the old frame: he typed
// "someone who can build" to convert the person-blank into a work-blank by
// hand, mid-sentence.
const EXAMPLE = {
  blank1: "nonprofit director",
  blank2: "a patient community app with AI",
  mode: "build" as FrameMode,
};

function parseSections(body: string, known: Set<string>): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of body.split("\n")) {
    const handleMatch = /^@([A-Za-z0-9-]+)\s*$/.exec(line);
    if (handleMatch && known.has(handleMatch[1].toLowerCase())) {
      current = { handle: handleMatch[1].toLowerCase(), text: "" };
      sections.push(current);
    } else if (current) {
      current.text = current.text ? `${current.text}\n${line}` : line;
    }
  }
  for (const s of sections) s.text = s.text.trim();
  return sections;
}

function playFixTone() {
  try {
    type AudioContextCtor = new () => AudioContext;
    const w = window as unknown as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    // silence is the locked floor
  }
}

export function Centerpiece() {
  const [blank1, setBlank1] = useState("");
  const [blank2, setBlank2] = useState("");
  const [mode, setMode] = useState<FrameMode>(DEFAULT_MODE);
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<"idle" | "matching" | "done">("idle");
  const [sections, setSections] = useState<Section[]>([]);
  const [meta, setMeta] = useState<Map<string, Meta>>(new Map());
  const [simpleMatch, setSimpleMatch] = useState(false);
  const [failed, setFailed] = useState(false);
  const spokeRef = useRef(false);
  const runningRef = useRef(false);

  /**
   * The first blank owns the connective, so every write to it goes through
   * here. `detectMode` returning null means the visitor is mid-word over a
   * term, and the last decision stands rather than the sentence flickering
   * under their fingers.
   */
  function setWhoTheyAre(value: string) {
    setBlank1(value);
    if (!value.trim()) return setMode(DEFAULT_MODE);
    const detected = detectMode(value);
    if (detected) setMode(detected);
  }

  async function runMatch(query: string, viaVoice: boolean) {
    if (runningRef.current || !query.trim()) return;
    runningRef.current = true;
    setPhase("matching");
    setSections([]);
    setFailed(false);
    setSimpleMatch(false);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let known: Set<string> | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        if (known === null) {
          const nl = buffer.indexOf("\n");
          if (nl !== -1) {
            const header = JSON.parse(buffer.slice(0, nl)) as {
              mode: "stream" | "keyword";
              candidates: Meta[];
            };
            setMeta(new Map(header.candidates.map((c) => [c.handle, c])));
            setSimpleMatch(header.mode === "keyword");
            known = new Set(header.candidates.map((c) => c.handle));
            buffer = buffer.slice(nl + 1);
          }
        }
        if (known) setSections(parseSections(buffer, known));
        if (done) break;
      }
      setPhase("done");
      // The fix. Only after the mic is confirmed stopped, never over a live one.
      if (viaVoice && spokeRef.current && !listening) playFixTone();
    } catch {
      setFailed(true);
      setPhase("done");
    } finally {
      runningRef.current = false;
    }
  }

  function handleTranscript(text: string, isFinal: boolean) {
    // Speech arrives as one sentence, so the connective it actually contains
    // wins over the keyword test — the visitor said it out loud.
    const parsed = parseSentence(text);
    setWhoTheyAre(parsed.blank1);
    setBlank2(parsed.blank2);
    if (parsed.mode) setMode(parsed.mode);
    if (isFinal) {
      spokeRef.current = true;
      void runMatch(text, true);
    }
  }

  function submitTyped() {
    spokeRef.current = false;
    void runMatch(composeSentence(blank1, blank2, mode), false);
  }

  function seeItRun() {
    spokeRef.current = false;
    setWhoTheyAre(EXAMPLE.blank1);
    setBlank2(EXAMPLE.blank2);
    setMode(EXAMPLE.mode);
    void runMatch(
      composeSentence(EXAMPLE.blank1, EXAMPLE.blank2, EXAMPLE.mode),
      false
    );
  }

  const placeholders = phase === "matching" ? Math.max(0, 3 - sections.length) : 0;

  return (
    <div className="flex w-full flex-col items-center gap-12 px-6">
      <SentenceFrame
        blank1={blank1}
        blank2={blank2}
        mode={mode}
        onChange={(a, b) => {
          setWhoTheyAre(a);
          setBlank2(b);
        }}
        onSubmit={submitTyped}
        disabled={listening || phase === "matching"}
      />

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-5">
          <Mic
            listening={listening}
            onTranscript={handleTranscript}
            onListeningChange={setListening}
            disabled={phase === "matching"}
          />
          <button
            type="button"
            onClick={submitTyped}
            disabled={phase === "matching" || (!blank1.trim() && !blank2.trim())}
            className="border-b border-transparent font-mono text-sm tracking-widest text-[var(--safelight)] transition-opacity hover:border-[var(--safelight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)] disabled:opacity-[var(--latent)]"
          >
            develop
          </button>
        </div>
        <p className="max-w-md text-center font-mono text-xs leading-relaxed tracking-wide opacity-50">
          {listening
            ? "listening · say the sentence, then stop"
            : "Say it out loud, or type it. Nothing is stored: no audio, no transcript."}
        </p>
        {phase === "idle" && (
          <button
            type="button"
            onClick={seeItRun}
            className="font-mono text-xs tracking-widest underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
          >
            see it run
          </button>
        )}
      </div>

      {(sections.length > 0 || placeholders > 0 || failed) && (
        <div aria-live="polite" className="flex w-full max-w-2xl flex-col gap-6 pb-24">
          {simpleMatch && (
            <p className="font-mono text-xs tracking-wide opacity-50">
              the simple match · written explanations are offline right now
            </p>
          )}
          {failed && (
            <p className="font-mono text-sm leading-relaxed opacity-70">
              The darkroom is closed for a moment. The builders are still here;
              try again shortly.
            </p>
          )}
          {sections.map((s) => (
            <article
              key={s.handle}
              className="border-l border-[color-mix(in_srgb,var(--ink)_25%,transparent)] py-1 pl-6 opacity-100 transition-opacity duration-700 motion-reduce:transition-none"
            >
              <h2 className="font-mono text-sm tracking-widest opacity-70">
                @{s.handle}
                {meta.get(s.handle)?.name ? ` · ${meta.get(s.handle)!.name}` : ""}
              </h2>
              <p className="mt-2 text-xl leading-relaxed">{s.text}</p>
              {meta.get(s.handle)?.line && (
                <p className="mt-3 font-mono text-xs leading-relaxed opacity-[var(--latent)]">
                  {meta.get(s.handle)!.line}
                </p>
              )}
            </article>
          ))}
          {Array.from({ length: placeholders }).map((_, i) => (
            <div
              key={`latent-${i}`}
              aria-hidden="true"
              className="border-l border-[color-mix(in_srgb,var(--ink)_25%,transparent)] py-1 pl-6 opacity-[var(--latent)]"
            >
              <div className="h-4 w-40 bg-[color-mix(in_srgb,var(--ink)_30%,transparent)]" />
              <div className="mt-3 h-3 w-full max-w-md bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
