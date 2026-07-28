import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Auth.js v5, ported from Tavern's auth-hardening branch (163912b), then
 * subtracted: Latent has exactly one authenticated surface (/claim) and one
 * door (GitHub OAuth). No password provider, so no credentials timing
 * side-channel to guard. What survives the port:
 *
 *  - the userinfo step narrowed to verified email addresses (the stock
 *    provider's /user/emails fallback ignores the `verified` flag);
 *  - fail-visibly: a sign-in that cannot resolve an identity throws instead
 *    of handing back a login-less session.
 *
 * Claiming stays explicit and separate: signing in never writes a builders
 * row. The /claim flow checks token.login against the card's handle.
 */
const githubUserinfo = {
  url: "https://api.github.com/user",
  async request({ tokens }: { tokens: { access_token?: string } }) {
    const headers = {
      Authorization: `Bearer ${tokens.access_token}`,
      "User-Agent": "authjs",
    };
    const profile = await fetch("https://api.github.com/user", { headers }).then(
      (res) => res.json()
    );

    const res = await fetch("https://api.github.com/user/emails", { headers });
    let verifiedEmail: string | null = null;
    if (res.ok) {
      const emails = (await res.json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      const verified = emails.filter((e) => e.verified);
      verifiedEmail =
        (verified.find((e) => e.primary) ?? verified[0])?.email ?? null;
    }

    // Trust the verified list over the profile field, and never fall back to
    // an address we could not confirm.
    profile.email = verifiedEmail;
    return profile;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [GitHub({ userinfo: githubUserinfo })],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "github") {
        const login = (profile as { login?: string } | null)?.login;
        // Every claim decision keys off the login. A session without one
        // looks signed in and has no identity behind it — fail visibly.
        if (!login) {
          throw new Error("Could not complete GitHub sign-in.");
        }
        token.login = login.toLowerCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.login) {
        session.user.login = token.login as string;
      }
      return session;
    },
  },
});

/**
 * Safe session read for surfaces that must render even before auth is
 * configured. Returns null instead of throwing.
 */
export async function getSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}
