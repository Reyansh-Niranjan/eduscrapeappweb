import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// GitHub webhook endpoint for release notifications
http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Verify it's a release event
      if (body.action === "published" && body.release) {
        const release = body.release;
        
        await ctx.runAction(api.updates.createGitHubRelease, {
          tagName: release.tag_name,
          name: release.name || release.tag_name,
          body: release.body || "",
          htmlUrl: release.html_url,
          publishedAt: release.published_at,
        });
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// Library proxy to bypass CORS from Firebase hosting
const proxiedFetch = async (path: string) => {
  const target = `https://eduscrape-host.web.app${path}`;
  const response = await fetch(target);
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
};

http.route({
  path: "/library/structure.json",
  method: "GET",
  handler: httpAction(async () => proxiedFetch("/structure.json")),
});

http.route({
  path: "/library/zips.json",
  method: "GET",
  handler: httpAction(async () => proxiedFetch("/zips.json")),
});

export default http;
