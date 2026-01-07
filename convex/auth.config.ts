const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.SITE_URL;

if (!siteUrl) {
  throw new Error(
    "Missing site URL environment variable. Set CONVEX_SITE_URL (preferred) or SITE_URL in your Convex Dashboard (e.g. https://your-app.vercel.app)."
  );
}

export default {
  providers: [
    {
      domain: siteUrl,
      applicationID: "convex",
    },
  ],
};
