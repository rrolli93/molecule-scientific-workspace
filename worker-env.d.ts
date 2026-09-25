/// <reference types="@cloudflare/workers-types" />
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    WORKSPACE_LOCAL_DEMO?: string;
    WORKSPACE_TRUST_SITES_IDENTITY?: string;
    /**
     * Optional. Set it and /api/ask will have a model write the answer from
     * the retrieved records. Leave it unset and nothing leaves this machine:
     * the page quotes the records directly instead. Never commit it; put it in
     * .dev.vars locally and in a secret for any deployment.
     */
    ANTHROPIC_API_KEY?: string;
  }
}
