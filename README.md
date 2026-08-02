# Latent

**Say what you are trying to build. Meet the two or three people who could build it with you.**

Live: **https://latent-nu.vercel.app**

No account. No form. No sign-up wall. You can be looking at real people and real work about ten
seconds after you land, and if you would rather not speak to a website, one click runs the whole
thing for you.

---

## What this is

Thirty builders spent the summer shipping real products. Latent is where you meet them.

You say one sentence: *"I am a nonprofit director looking to build a patient community app."* The
site reads it against what these people have actually built, in public, and shows you the two or
three whose work sits closest to yours, with a written explanation of why each one fits what you
described.

Then it does the part most sites skip: **it asks you to choose.** You pick the one you would
actually talk to, you say why in your own words if you want to, and the site hands you a finished
message to send. You never have to compose it.

## Why it is built this way

Everyone has someone just ahead of them: a person who does the work and brings others along with
them. Latent manufactures that proximity between you and the person you have not met yet.

The photograph behind the name is the point. Development got faster and faster, from the darkroom
to the one-hour lab to the phone in your pocket, and none of it made anyone a better photographer.
Speed changed. Judgment did not. So this site does not claim to have taste. It hands you a moment
to use yours.

That is also why there is no ranking anywhere. No scores, no leaderboard, no "top builder." An
unclaimed card is **latent**: public facts about someone's work, plus a dim line clearly marked as
machine-written. A claimed card is **developed**: their own words, chosen by them. Distance on the
map means only that two people work on similar things. Nobody is above anybody.

## What you can do here

| | |
|---|---|
| **Say or type one sentence** | Speak it, or type it. Both work the same way; neither is a fallback for the other. |
| **See it run** | One click plays a real example end to end with no input from you at all. |
| **Browse the space** | Thirty people, positioned by what they work on. Move your attention across it and the work develops out of the dark. |
| **Read anyone's page** | Every builder has one, at `/b/their-handle`. Share it and it unfurls with a real card. |
| **Pick one, and say why** | Your choice, your words, your message to send. |

## What we do with what you say

**Nothing. We store none of it.**

No audio is uploaded, no transcript is saved, no sentence is written down, and the reason you type
for picking someone never leaves your browser. There is no account, so there is nothing to
attach it to.

The only thing that reaches us is a count: that *a* match happened, that *a* pick happened. It
carries no name, no handle, and no text, and the table it lands in has no column to put one in, so
a per-person tally cannot exist even by accident.

## About the people on it

Everyone here is a real person who has not necessarily agreed to be marketed to you.

That shapes what an unclaimed card is allowed to say. It shows public facts about their work,
plus one line marked as machine-written, plus any observation a peer recorded about something they
watched them do. It never shows an invented biography, and no page is ever presented as a person's
own words unless they wrote them.

**Reachability is the reward for claiming.** If someone has claimed their card, they have chosen
how they want to be reached and you will see it. If they have not, there is no channel here, and
the site says so rather than guessing. Anyone can remove themselves immediately, without giving a
reason.

## If something is not working

The site is built to degrade rather than break. No microphone, a browser without speech support,
or simply not wanting to talk out loud: the typed path is right there and works identically. If
the explanation service is unavailable, you still get matches with a simpler explanation, clearly
labelled as the simple match. You should never see a spinner or an error page.

---

## For developers

Next.js (App Router) on Vercel, Neon Postgres via Drizzle, Anthropic API for the written
explanations, and the browser's own Web Speech API for capture. Fonts are self-hosted.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build; also the typecheck gate |
| `npm run lint` | Lint. Blocking in CI |
| `npm test` | Integration smoke. Read-only, safe against any database |
| `npm run db:roster` | Seed builders from the cohort's public GitHub facts |
| `npm run db:lines` | Write the machine-derived line for each builder |
| `npm run db:layout` | Compute spatial positions offline |
| `npm run db:vouches` | Seed the human-written observed lines |

The seeding scripts are all re-runnable and none of them overwrite a claimed field.

### Routes

Pages: `/`, `/b/[handle]`, `/claim`, `/proof`, `/developing`, `/developing/[slug]`.
Feed: `/developing/feed.xml`. API: `/api/match`, `/api/event`, `/api/cron/digest`,
`/api/auth/[...nextauth]`.

### Schema

`lib/db/schema.ts`, five tables:

| Table | Shape | Note |
|---|---|---|
| `builders` | `handle` (PK), `displayName`, `github` (jsonb facts), `latentLine`, `developedLine`, `contact`, `x`/`y`, `claimedAt`, `optedOut`, `updatedAt` | `x`/`y` are the spatial layout. `optedOut` is `not null default false` |
| `entries` | `id`, `kind`, `slug` (unique), `title`, `body`, `handle`, `sourceRef`, `publishedAt` | The `/developing` stream. The unique slug makes the spotlight run idempotent per builder |
| `vouches` | `id`, `toHandle`, `fromHandle`, `text`, `createdAt` | Peer vouches on a card |
| `events` | `id`, `kind`, `createdAt` | **No handle, user or IP column, deliberately.** Aggregate counting only, enforced by the schema rather than by discipline |
| rate limit | `ipHash` (PK), `windowStart`, `count` | Hashed, never the address itself |

### The file map

| File | What lives there |
|---|---|
| `lib/db/schema.ts` | The schema above |
| `lib/claim.ts` | The claim write path. Every write keys off `session.user.login` and nothing else, so there is no card parameter to tamper with. Removal is immediate; `restoreCard()` is its inverse, so consent runs both directions |
| `lib/match.ts`, `app/api/match/route.ts` | The three-rung matcher and its endpoint |
| `lib/spotlight.ts` | The daily spotlight generator. Deterministic selection, skips opted-out builders |
| `lib/entries.ts` | Server-only reads for `/developing` |
| `lib/analytics.ts` | Aggregate-only counting, one constant identity, event kind as the whole payload |
| `scripts/integration-smoke.mts` | The smoke below |

### Degradation is designed, not incidental

The matcher has three rungs: the model path, a deterministic ranking, and a keyword fallback. The
bottom two need no API key and no model, so the product still answers a visitor's sentence with the
model offline. `npm test` asserts that rather than assuming it.

### What `npm test` actually proves

`scripts/integration-smoke.mts` checks invariants instead of writing rows, which is why it is safe
to point at any database including production:

- the `events` table has no handle, builder, user or IP column, so the privacy claim on this site
  is enforced by the schema
- the `builders` table carries a `contact` column
- the roster is populated, every builder has a position in the space, every builder has a line to
  show, and zero rows leak
- deterministic ranking returns candidates with the model offline
- the keyword rung returns matches

CI (`.github/workflows/ci.yml`) runs three jobs on Node 22: lint and build, a check that no
database credentials are committed, and this smoke, read-only.

Deploys are git-connected: **a push to `main` is a production deploy.** Unfinished work belongs on
a branch.
