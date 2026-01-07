import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

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

// Library proxy routes to bypass CORS from Firebase hosting
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

// ElevenLabs voice proxies (keep ELEVENLABS_API_KEY server-side in Convex env vars)
http.route({
  path: "/eleven/tts",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

http.route({
  path: "/eleven/tts",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }

    try {
      const body = await request.json();
      const text = body?.text;
      const voiceId = (typeof body?.voice_id === "string" && body.voice_id) || process.env.ELEVENLABS_DEFAULT_VOICE_ID;
      const modelId = (typeof body?.model_id === "string" && body.model_id) || process.env.ELEVENLABS_TTS_MODEL_ID || "eleven_flash_v2_5";
      const outputFormat = (typeof body?.output_format === "string" && body.output_format) || process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

      if (!text || typeof text !== "string") {
        return new Response(JSON.stringify({ error: "Missing or invalid text" }), {
          status: 400,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }
      if (!voiceId) {
        return new Response(JSON.stringify({ error: "Missing voice_id and ELEVENLABS_DEFAULT_VOICE_ID not set" }), {
          status: 400,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`;
      const upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          language_code: typeof body?.language_code === "string" ? body.language_code : undefined,
          voice_settings: typeof body?.voice_settings === "object" ? body.voice_settings : undefined,
          apply_text_normalization: typeof body?.apply_text_normalization === "string" ? body.apply_text_normalization : "auto",
        }),
      });

      if (!upstream.ok) {
        const details = await upstream.text();
        return new Response(JSON.stringify({ error: "ElevenLabs TTS error", details }), {
          status: upstream.status,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      return new Response(upstream.body, {
        status: 200,
        headers: corsHeaders({
          "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
          "Cache-Control": "no-store",
        }),
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error", message: (error as Error).message }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }
  }),
});

http.route({
  path: "/eleven/dialogue",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

http.route({
  path: "/eleven/dialogue",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }

    try {
      const body = await request.json();
      const inputs = body?.inputs;
      const outputFormat = (typeof body?.output_format === "string" && body.output_format) || process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

      if (!Array.isArray(inputs) || inputs.length === 0) {
        return new Response(JSON.stringify({ error: "Missing or invalid inputs" }), {
          status: 400,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      const url = `https://api.elevenlabs.io/v1/text-to-dialogue?output_format=${encodeURIComponent(outputFormat)}`;
      const upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          inputs,
          model_id: (typeof body?.model_id === "string" && body.model_id) || "eleven_v3",
          language_code: typeof body?.language_code === "string" ? body.language_code : undefined,
          settings: typeof body?.settings === "object" ? body.settings : undefined,
          apply_text_normalization: typeof body?.apply_text_normalization === "string" ? body.apply_text_normalization : "auto",
        }),
      });

      if (!upstream.ok) {
        const details = await upstream.text();
        return new Response(JSON.stringify({ error: "ElevenLabs dialogue error", details }), {
          status: upstream.status,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      return new Response(upstream.body, {
        status: 200,
        headers: corsHeaders({
          "Content-Type": upstream.headers.get("Content-Type") ?? "audio/mpeg",
          "Cache-Control": "no-store",
        }),
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error", message: (error as Error).message }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }
  }),
});

http.route({
  path: "/eleven/scribe-token",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

http.route({
  path: "/eleven/scribe-token",
  method: "GET",
  handler: httpAction(async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }

    try {
      const upstream = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      });

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: "ElevenLabs token error", details: data }), {
          status: upstream.status,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      if (!data?.token) {
        return new Response(JSON.stringify({ error: "Unexpected response from token endpoint" }), {
          status: 500,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      return new Response(JSON.stringify({ token: data.token }), {
        status: 200,
        headers: corsHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }),
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error", message: (error as Error).message }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }
  }),
});

http.route({
  path: "/eleven/voices",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

http.route({
  path: "/eleven/voices",
  method: "GET",
  handler: httpAction(async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }

    try {
      const upstream = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": apiKey,
        },
      });

      const data = await upstream.json().catch(() => null);

      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: "ElevenLabs voices error", details: data }), {
          status: upstream.status,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        });
      }

      const voices = Array.isArray(data?.voices) ? data.voices : [];
      const slim = voices
        .map((v: any) => ({
          voice_id: v?.voice_id,
          name: v?.name,
        }))
        .filter((v: any) => typeof v.voice_id === "string" && typeof v.name === "string");

      return new Response(JSON.stringify({ voices: slim }), {
        status: 200,
        headers: corsHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }),
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error", message: (error as Error).message }), {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      });
    }
  }),
});

export default http;
