import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const latent = pgSchema("latent");

export const builders = latent.table("builders", {
  // github handle, lowercase
  handle: text("handle").primaryKey(),
  // ONLY populated after claim
  displayName: text("display_name"),
  // public facts: repos, langs, commit cadence, deploys
  github: jsonb("github"),
  // generated, shown dim, clearly machine-derived
  latentLine: text("latent_line"),
  // THEIR words, written at claim. The real content
  developedLine: text("developed_line"),
  // How they want to be reached, in their words. Written ONLY at claim, never
  // derived from GitHub, never shown before claiming. Reachability is the
  // reward for claiming: unclaimed cannot be reached.
  contact: text("contact"),
  // precomputed spatial position; no live layout computation
  x: real("x"),
  y: real("y"),
  // null = latent
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  optedOut: boolean("opted_out").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vouches = latent.table("vouches", {
  id: serial("id").primaryKey(),
  toHandle: text("to_handle")
    .notNull()
    .references(() => builders.handle),
  // the peer who observed
  fromHandle: text("from_handle").notNull(),
  // one observed line, HUMAN written
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Aggregate only, for /proof. Deliberately NO handle column — no per-person
// counts, ever.
export const events = latent.table("events", {
  id: serial("id").primaryKey(),
  // 'claim' | 'share' | 'match'
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The broad engine (BUILD-PLAN §14): the site's self-written marketing copy.
// Every machine entry carries a sourceRef so it can show its receipts; essays
// are inserted only from George-approved text, never generated here.
export const entries = latent.table("entries", {
  id: serial("id").primaryKey(),
  // 'digest' | 'spotlight' | 'demo' | 'essay'
  kind: text("kind").notNull(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // simple markdown: paragraphs and "- " list lines
  body: text("body").notNull(),
  // spotlights only; consent is enforced at generation, not here
  handle: text("handle"),
  // the run/repo/commit the entry was generated from
  sourceRef: text("source_ref"),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rateLimit = latent.table("rate_limit", {
  ipHash: text("ip_hash").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});
