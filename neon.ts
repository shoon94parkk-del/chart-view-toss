import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Postgres only. The existing FastAPI service owns learning authentication
  // and uses psycopg; database credentials must never enter the Vite client.
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.name === "production" || branch.isDefault) {
      // Production must never inherit the starter's temporary-branch expiry.
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
