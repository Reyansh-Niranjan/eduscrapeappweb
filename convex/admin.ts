import { action } from "./_generated/server";
import { v } from "convex/values";

// Validate admin password using Convex environment variable
export const validateAdminPassword = action({
  args: {
    password: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const adminPassword = process.env.ADMIN_PASSWORD || "Cpxadmin2025";
    return args.password === adminPassword;
  },
});

