/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as chatbot from "../chatbot.js";
import type * as clear from "../clear.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as projects from "../projects.js";
import type * as router from "../router.js";
import type * as team from "../team.js";
import type * as updates from "../updates.js";
import type * as userProfiles from "../userProfiles.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  chatbot: typeof chatbot;
  clear: typeof clear;
  github: typeof github;
  http: typeof http;
  projects: typeof projects;
  router: typeof router;
  team: typeof team;
  updates: typeof updates;
  userProfiles: typeof userProfiles;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
