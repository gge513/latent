"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Web Speech capture. Renders nothing when the browser has no Speech API —
 * the typed path is a peer, never a browser-support error. Permission is
 * requested on click only; the explaining line lives next to this button in
 * the centerpiece. The parent learns when recognition has fully stopped so
 * the fix tone can never bleed into a live mic.
 */
export function Mic({
  listening,
  onTranscript,
  onListeningChange,
  disabled,
}: {
  listening: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
  onListeningChange: (listening: boolean) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)
    );
    return () => recognitionRef.current?.abort();
  }, []);

  if (!supported) return null;

  function start() {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    finalRef.current = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      onTranscript((finalRef.current + interim).trim(), false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      onListeningChange(false);
      const text = finalRef.current.trim();
      if (text) onTranscript(text, true);
    };
    recognition.onerror = () => {
      // onend fires after onerror; nothing to do — the typed path is right there
    };
    recognitionRef.current = recognition;
    recognition.start();
    onListeningChange(true);
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      disabled={disabled}
      aria-label={listening ? "Stop listening" : "Speak"}
      className={`inline-flex h-14 w-14 items-center justify-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)] ${
        listening
          ? "border-[var(--safelight)] text-[var(--safelight)]"
          : "border-[color-mix(in_srgb,var(--ink)_35%,transparent)] text-[var(--ink)] hover:border-[var(--ink)]"
      } disabled:opacity-[var(--latent)]`}
    >
      <svg width="20" height="28" viewBox="0 0 20 28" fill="none" aria-hidden="true">
        <rect x="6" y="2" width="8" height="14" rx="4" fill="currentColor" />
        <path
          d="M2 12v1a8 8 0 0 0 16 0v-1"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <line x1="10" y1="21" x2="10" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
