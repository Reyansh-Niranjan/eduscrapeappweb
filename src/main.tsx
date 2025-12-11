import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl || typeof convexUrl !== 'string') {
  throw new Error('VITE_CONVEX_URL environment variable is not defined');
}

const convex = new ConvexReactClient(convexUrl);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
