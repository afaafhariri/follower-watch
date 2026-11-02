# Follower-Watch

A **privacy-first** tool that tells you which Instagram accounts don't follow you back — and who unfollowed you — using Meta's official data export. No Instagram password, no scraping, no third-party API access to your account: the only input is the data Meta itself hands you.

Pick the export zip Meta gives you and see who doesn't follow you back. Everything runs in your browser: the file is never uploaded, and there's no sign-in or backend.

> Prefer a set-and-forget nightly email instead of a browser? The headless pipeline that reads your Meta export straight from Google Drive lives in its own repository: [follower-watch-pipeline](https://github.com/afaafhariri/follower-watch-pipeline).

## How It Works

Your browser parses two files from Meta's export (`connections/followers_and_following/followers_*.json` and `following.json`), builds the follower set and following list, and subtracts: anyone you follow who isn't in your follower set "doesn't follow you back."

If the export includes them, three more lists are shown in their own tabs:

- **Recent requests** (`recent_follow_requests.json`): follow requests you sent, marked Accepted or Not accepted by cross-checking your following list. Requests still waiting appear only under Pending requests.
- **Pending requests** (`pending_follow_requests.json`): requests you've sent that haven't been accepted yet.
- **Unfollowed by you** (`recently_unfollowed_profiles.json`): accounts *you* unfollowed. Instagram's export has no list of who unfollowed you.

Meta keeps only about the last 90 days of the "recent" lists, whatever date range you pick. The export must be requested in **JSON** format. HTML exports are detected and rejected with instructions.

> **Caveat:** a deactivated account disappears from Meta's export entirely, so it's indistinguishable from an unfollow. No export field exposes account status; every tool of this kind has the same false positive. A name that "unfollows" and later "re-follows" without action on their part is usually a deactivation/reactivation cycle.


```
export.zip ──▶ unzip (fflate) ──▶ parse JSON ──▶ diff ──▶ results
                                                   │
                                                   └──▶ IndexedDB (last result)
```

All of this runs in the browser. The host only serves the static HTML, JS and CSS.

1. Pick your Meta export zip. It's read and analyzed **in your browser**; only the follow-list files inside it are decompressed.
2. See, sort, and search the accounts that don't follow you back.
3. Your last result is saved in this browser's IndexedDB so it's there next time. **Clear saved result** removes it.

Production builds include a Content-Security-Policy with `connect-src 'none'`, so the browser blocks any outgoing request: the "never uploaded" promise is enforced, not just stated.

## Project Structure

```
follower-watch/
├── src/
│   ├── lib/analyzeExport.ts  # Meta export parsing and the non-follower diff
│   ├── lib/savedResult.ts    # Last result in IndexedDB
│   ├── hooks/                # File validation and progress for the UI
│   └── components/           # React + MUI UI
├── public/privacy.html       # Privacy policy
├── index.html
└── vite.config.ts            # Build config, including the Content-Security-Policy
```

## Getting Started

**Prerequisites:** [Node.js 18+](https://nodejs.org/).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Tests

```bash
npm test
```

## Deployment

The app is a static site deployed on [Vercel](https://vercel.com/). Import the repository in Vercel and it detects Vite automatically:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Every push to the production branch deploys, and other branches get preview deployments. No environment variables or secrets are needed. Any other static host (Cloudflare Pages, Netlify, GitHub Pages) works with the same settings.

## License

MIT License - see [LICENSE](LICENSE)
