import { convexAuth, getAuthUserId, type AuthProviderConfig } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import { query } from "./_generated/server";

const providers: AuthProviderConfig[] = [Password];

if ((process.env.CONVEX_SITE_URL ?? process.env.SITE_URL) === undefined) {
  console.error("Missing CONVEX_SITE_URL (or SITE_URL) environment variable");
  // Throwing might break deployment if not careful, but for auth to work it is critical.
  // However, let's just log loudly for now or throw if we are sure.
}

const googleClientId = process.env.CONVEX_GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.CONVEX_GOOGLE_CLIENT_SECRET;
if (googleClientId && googleClientSecret) {
  providers.push(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
} else {
  console.warn(
    "[auth] Google OAuth disabled. Configure CONVEX_GOOGLE_CLIENT_ID and CONVEX_GOOGLE_CLIENT_SECRET to enable it."
  );
}

const githubClientId = process.env.CONVEX_GITHUB_CLIENT_ID;
const githubClientSecret = process.env.CONVEX_GITHUB_CLIENT_SECRET;
if (githubClientId && githubClientSecret) {
  providers.push(
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    })
  );
} else {
  console.warn(
    "[auth] GitHub OAuth disabled. Configure CONVEX_GITHUB_CLIENT_ID and CONVEX_GITHUB_CLIENT_SECRET to enable it."
  );
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
