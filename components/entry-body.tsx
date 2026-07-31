import Link from "next/link";

/**
 * Renders an entry body: the tiny subset of markdown the generators write —
 * paragraphs, "- " list lines, `backtick` code spans — plus one site-native
 * nicety: @handle links to the builder's page, the same move the match
 * results made. No markdown dependency: the generators are ours, so the
 * grammar is closed.
 */

function renderInline(text: string, keyBase: string) {
  const nodes: React.ReactNode[] = [];
  // Split out code spans first, then linkify handles inside plain segments.
  const segments = text.split(/(`[^`]+`)/g);
  segments.forEach((seg, i) => {
    if (seg.startsWith("`") && seg.endsWith("`")) {
      nodes.push(
        <code key={`${keyBase}-c${i}`} className="font-mono text-[0.9em]">
          {seg.slice(1, -1)}
        </code>
      );
      return;
    }
    const parts = seg.split(/(@[a-z0-9][a-z0-9-]*)/gi);
    parts.forEach((part, j) => {
      if (/^@[a-z0-9][a-z0-9-]*$/i.test(part)) {
        nodes.push(
          <Link
            key={`${keyBase}-h${i}-${j}`}
            href={`/b/${part.slice(1).toLowerCase()}`}
            className="underline decoration-[color-mix(in_srgb,var(--ink)_35%,transparent)] underline-offset-4 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--safelight)]"
          >
            {part}
          </Link>
        );
      } else if (part) {
        nodes.push(part);
      }
    });
  });
  return nodes;
}

export function EntryBody({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/);
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="flex flex-col gap-2">
              {lines.map((l, j) => (
                <li
                  key={j}
                  className="border-l border-[color-mix(in_srgb,var(--ink)_25%,transparent)] pl-4 font-mono text-xs leading-relaxed opacity-70"
                >
                  {renderInline(l.slice(2), `${i}-${j}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="font-mono text-xs leading-relaxed opacity-55">
            {renderInline(block, `${i}`)}
          </p>
        );
      })}
    </div>
  );
}
