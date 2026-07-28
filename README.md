# Latent

A vibe marketing platform for the Hult summer 2026 cohort. Week 3 build, in progress.

> An unclaimed card is latent. A claimed card is developed.

Speak one sentence, get matched with the two or three builders just ahead of you,
with written explanations of why. No account, no form, no typing required, and a
typed path that is a peer of the spoken one.

## Stack

- Next.js (App Router), deployed on Vercel (push to `main` = production; branch deploys off)
- Neon Postgres, `latent` schema, Drizzle ORM (fenced with `schemaFilter`)
- Anthropic API for match explanations; browser Web Speech API for capture
- Newsreader + IBM Plex Mono, self-hosted

## Run locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npm run dev
```

A partner-facing README lands here before submission.
