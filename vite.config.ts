import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(({ command }) => ({
  server: { host: "localhost" },
  plugins: [
    {
      name: "workspace-loopback-only",
      configResolved(config) {
        if (
          command === "serve" &&
          !["localhost", "127.0.0.1", "::1"].includes(
            String(config.server.host),
          )
        ) {
          throw new Error(
            "The local synthetic notebook requires a loopback-only development server. Use an authenticated deployment for remote access.",
          );
        }
      },
    },
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: {
        ...localBindingConfig,
        vars: command === "serve" ? { WORKSPACE_LOCAL_DEMO: "true" } : {},
      },
    }),
  ],
}));
