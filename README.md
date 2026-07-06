# AI Radar News Feed

Public, token-free news feed for the AI Radar `Bản tin AI` tab.

This repo is designed to be pushed to a **public GitHub repository**. GitHub Actions runs daily, reads only public RSS/Atom feeds, and commits:

- `latest.json`: fixed JSON URL for AI Radar runtime reads.
- `docs/_posts/YYYY-MM-DD-summary-vi.md`: human-readable daily archive.

No OpenAI API key, GitHub PAT, or private token is required for the web app.

## Daily Update

The workflow runs at `23:30 UTC`, which is `06:30 VNT`.

Manual run:

```bash
npm run update
```

## Configure AI Radar

After pushing this repo to GitHub public, configure Sites env:

```env
HORIZON_PUBLIC_GITHUB_REPO=owner/ai-radar-news-feed
HORIZON_PUBLIC_GITHUB_BRANCH=main
HORIZON_PUBLIC_GITHUB_JSON_PATH=latest.json
```

AI Radar will read:

```text
https://raw.githubusercontent.com/owner/ai-radar-news-feed/main/latest.json
```

If `latest.json` is unavailable, AI Radar can still fall back to `docs/_posts/*-summary-vi.md`.
