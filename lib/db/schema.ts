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

export const rateLimit = latent.table("rate_limit", {
  ipHash: text("ip_hash").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});
