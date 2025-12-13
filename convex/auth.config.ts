
const siteUrl = process.env.CONVEX_SITE_URL;

if (!siteUrl) {
  throw new Error("Missing CONVEX_SITE_URL environment variable. Please set it in your Convex Dashboard.");
}

export default {
  providers: [
    {
      domain: siteUrl,
      applicationID: "convex",
    },
  ],
};
