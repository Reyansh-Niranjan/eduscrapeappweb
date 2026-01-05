# AGRIHORIZON Project Notes (Style + Features + How It Works)

This document summarizes the **code structure**, **libraries/techniques**, **how features work**, **UI/UX characteristics**, **backend features**, and **environment variables** used in this project.

---

## 1) Tech Stack / Libraries

### Frontend
- **React 19 + Vite 6** (fast dev/build)
- **Tailwind CSS** for styling
- **shadcn/ui configuration** (New York preset) via `components.json`
- **sonner** for toast notifications
- **date-fns** for date/time formatting (used in some modules)
- **clsx + tailwind-merge** for className composition (utility patterns)

### Backend
- **Convex** (database, real-time queries, server functions, HTTP routes)
- **@convex-dev/auth** (authentication + providers)
- **node-fetch** (used where node runtime fetch behavior is needed)

### Build / Quality
- TypeScript, ESLint, Prettier

---

## 2) Project Layout (Where Things Live)

- `src/` → React UI
- `convex/` → Convex backend functions + schema + HTTP routes
- `tailwind.config.js` → Tailwind theme tokens + animations
- `src/index.css` → global CSS + reusable Tailwind utility classes

---

## 3) “Code Blocks” (Representative Snippets)

### 3.1 App bootstrap (Convex + Auth Provider)
From `src/main.tsx`:
```tsx
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
```
Why it matters:
- Real-time Convex hooks (`useQuery`, `useMutation`, `useAction`) work throughout the app.
- Auth state is globally available.

### 3.2 Role-based routing (Authenticated vs Unauthenticated)
From `src/App.tsx`:
```tsx
<Unauthenticated>
  <SignInForm />
</Unauthenticated>

<Authenticated>
  {userProfile && !userProfile.profile ? (
    <ProfileSetup />
  ) : userProfile?.profile?.role === "buyer" ? (
    <BuyerDashboard userProfile={userProfile as any} />
  ) : (
    <SellerDashboard userProfile={userProfile as any} />
  )}
</Authenticated>
```
Why it matters:
- The product experience is “role-aware” without a full router.
- Onboarding is enforced (profile required) before dashboards.

### 3.3 UI “feel”: global utility classes
From `src/index.css`:
```css
.glass-card {
  @apply bg-white/80 backdrop-blur-md border border-white/20 shadow-xl;
}

.modern-shadow {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

.auth-input-field {
  @apply w-full px-5 py-3.5 rounded-container bg-white border border-slate-200
  focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-300;
}
```
Why it matters:
- Instead of repeating long Tailwind className strings everywhere, the app defines a few “house style” utilities.

### 3.4 Convex schema (tables + indexes)
From `convex/schema.ts`:
```ts
vegPrices: defineTable({
  vegetable: v.string(),
  location: v.string(),
  date: v.string(),
  price: v.number(),
  source: v.string(),
  timestamp: v.number(),
}).index("by_vegetable_location_date", ["vegetable", "location", "date"]),
```
Why it matters:
- Fast lookups for “today’s price for veg+location”, plus history queries.

### 3.5 AI feature pattern (server-side OpenRouter call)
From `convex/vegPrices.ts`:
```ts
export const predictWithAI = action({
  args: { vegetable: v.string(), location: v.string(), searchResults: v.any(), history: v.any() },
  handler: async (ctx, args) => {
    const aiApiKey = process.env.OPENROUTER_API_KEY;
    if (!aiApiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "...",
        messages: [{ role: "user", content: "...prompt..." }],
      }),
    });

    return await response.json();
  },
});
```
Why it matters:
- The API key stays **server-side** (never shipped to the browser).
- This “action” is a clean pattern for any AI feature: gather inputs → call model → return structured result.

### 3.6 Public HTTP endpoints (optional external integration)
From `convex/router.ts`:
```ts
http.route({
  path: "/api/getPrice",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const vegetable = url.searchParams.get("veg");
    const location = url.searchParams.get("location");

    const priceData = await ctx.runAction(api.vegPrices.fetchCurrentPrice, {
      vegetable,
      location,
    });

    return new Response(JSON.stringify(priceData), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }),
});
```
Why it matters:
- You can consume the feature from anywhere (mobile app, other website) without exposing DB internals.

---

## 4) How Features Work (Conceptual)

### Authentication + Profiles
- Auth is provided by `@convex-dev/auth` with providers (Password + Anonymous).
- UI uses `<Authenticated/>` / `<Unauthenticated/>` wrappers.
- After sign-in, user completes a **profile** stored in `userProfiles`.
- Everything role-specific is driven by `userProfiles.role`.

### Products (Seller inventory)
- `products` table stores listings.
- Seller views call Convex queries like “getSellerProducts”, then uses mutations for add/update.

### Orders
- Orders store buyer/seller/product IDs plus status workflow (`pending → processing → shipped → delivered`).
- Dashboard shows status chips + analytics derived from queries.

### Messaging
- Conversations track participants + last message.
- Messages are stored in `messages` by `conversationId`.
- Client uses Convex queries for “live chat style” updates.

### Notifications
- Notifications table stores userId + type + read state.
- UI shows unread counts and lets user mark as read.

### Market Prices (Web + AI)
- Step 1: server action runs a **DuckDuckGo HTML search** to pull price hints.
- Step 2: server query pulls recent price history (last ~7 days).
- Step 3: server action calls OpenRouter to produce **tomorrow prediction + analysis**.
- Step 4: optionally stores a new price record for history.
- UI consumes via a single “get comprehensive price data” action and displays cards + a mini chart.

---

## 5) UI Features (What You See)

- Role-based dashboards: Buyer vs Seller.
- Modern header with translucency + blur (`backdrop-blur`) and sticky positioning.
- Card-based sections with consistent rounding (`rounded-2xl`, `rounded-3xl`) and shadows.
- Micro-animations: fade/slide/float.
- Toast notifications for feedback (success/error).

---

## 6) UX Features (How It Feels)

- Fast perceived performance: skeleton/loading spinners, simple screens, minimal routing.
- Clear onboarding gate: profile must exist before full dashboard.
- Strong visual hierarchy: large headings, “stats cards”, clear CTAs.
- One feature per “tab” mental model for dashboards.
- AI feature provides *explanations* (analysis + sources), not just a number.

---

## 7) Backend Features (What It Provides)

- Real-time reactive data via Convex queries.
- Atomic writes via Convex mutations.
- External calls (web search, OpenRouter) via Convex actions.
- Public HTTP API routes for price + history.
- Table design includes practical indexes for performance.

---

## 8) Environment Variables (ENVs)

### Required / Important
- `VITE_CONVEX_URL` (frontend) — used by `ConvexReactClient` to connect.
- `OPENROUTER_API_KEY` (Convex backend) — used for AI predictions in `convex/vegPrices.ts`.
- `CONVEX_SITE_URL` (Convex backend) — referenced in `convex/auth.config.ts` for auth configuration.

### How to set (Convex)
```bash
npx convex env set OPENROUTER_API_KEY your-api-key-here
```

---

## 9) Why It’s “Best” (the real reasons)

- **Consistency**: a small number of design primitives used everywhere.
- **Speed of iteration**: Convex + hooks removes lots of boilerplate.
- **Feature completeness**: marketplace + chat + notifications + analytics + AI is a strong combo.
- **Good product thinking**: AI output is explainable (analysis/sources/history), not a black box.
