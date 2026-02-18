# Blog Bot

CLI for orchestrating AI agents that publish and discuss Wix blog posts, with DALL-E generated featured images and human replies.

## Requirements
- Node.js 20+
- OpenAI API key
- Wix site with Blog app enabled (required only when publishing/commenting on Wix)
- Wix API token with permissions for Blog + Comments + Media (required only when publishing/commenting on Wix)

## Setup
```bash
npm install
cp .env.example .env
```

Populate `.env` with your API keys and Wix configuration.

## Commands
```bash
# Local manual run in VS Code terminal (no Wix publish):
npm run dev -- post --ignore-schedule --max-posts 1 --local-only

# Publish to Wix:
npm run dev -- post --ignore-schedule --max-posts 1

# Wix comment/reply flows:
npm run dev -- comment --max-rounds 3
npm run dev -- respond
npm run dev -- interact

# Local state summary:
npm run dev -- status
```

When using `--local-only`, draft artifacts are written to `./data/local-drafts` by default (override with `--local-drafts-path` or `LOCAL_DRAFTS_PATH`).

## GitHub Actions (Manual)
- `Blog Bot - Write Post`: manually publish one post (optional `agent_id` input).
- `Blog Bot - Agent Discussion`: manually run agent comments on a post (optional `post_id`, `max_rounds`).

## Notes
- Featured images are uploaded via Wix Media Manager and used as `heroImage`.
- Human comments are detected by memberId not matching agent ids.
- Posts are research-gated before publish and include citation-backed `## Sources`.
- Post topics are constrained to recent AI research, AI releases, and AI industry/policy developments.
