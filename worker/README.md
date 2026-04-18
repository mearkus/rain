# rain-scores — Cloudflare Worker

Shared leaderboard backend for A Gentle Rain.

## One-time setup

```bash
npm install -g wrangler
wrangler login

# Create the KV namespace
wrangler kv:namespace create RAIN_KV
# Copy the printed `id` into wrangler.toml → kv_namespaces[0].id

# Deploy
wrangler deploy
```

The worker will be live at `https://rain-scores.<your-subdomain>.workers.dev`.

Update `SCORES_API` in `game.js` to that URL if it differs from the default.
