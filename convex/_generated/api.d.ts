/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as chapterText from "../chapterText.js";
import type * as chapterTextJobs from "../chapterTextJobs.js";
import type * as chapterTextWorker from "../chapterTextWorker.js";
import type * as chatbot from "../chatbot.js";
import type * as clear from "../clear.js";
import type * as debug from "../debug.js";
import type * as deepsearch from "../deepsearch.js";
import type * as github from "../github.js";
import type * as http from "../http.js";
import type * as notes from "../notes.js";
import type * as progress from "../progress.js";
import type * as projects from "../projects.js";
import type * as quizGen from "../quizGen.js";
import type * as quizzes from "../quizzes.js";
import type * as router from "../router.js";
import type * as team from "../team.js";
import type * as updates from "../updates.js";
import type * as userBookText from "../userBookText.js";
import type * as userBookTextJobs from "../userBookTextJobs.js";
import type * as userBookTextWorker from "../userBookTextWorker.js";
import type * as userBooks from "../userBooks.js";
import type * as userProfiles from "../userProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  chapterText: typeof chapterText;
  chapterTextJobs: typeof chapterTextJobs;
  chapterTextWorker: typeof chapterTextWorker;
  chatbot: typeof chatbot;
  clear: typeof clear;
  debug: typeof debug;
  deepsearch: typeof deepsearch;
  github: typeof github;
  http: typeof http;
  notes: typeof notes;
  progress: typeof progress;
  projects: typeof projects;
  quizGen: typeof quizGen;
  quizzes: typeof quizzes;
  router: typeof router;
  team: typeof team;
  updates: typeof updates;
  userBookText: typeof userBookText;
  userBookTextJobs: typeof userBookTextJobs;
  userBookTextWorker: typeof userBookTextWorker;
  userBooks: typeof userBooks;
  userProfiles: typeof userProfiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
