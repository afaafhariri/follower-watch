# FollowerWatch

See which Instagram accounts you follow that don't follow you back, using the data export Instagram itself gives you.

FollowerWatch runs entirely in your browser. Your export is never uploaded, there's no sign-in, and it never asks for your Instagram password.

## Features

- **Don't follow back**: everyone you follow who isn't in your followers list.
- **Recent requests**: follow requests you've sent, marked Accepted or Not accepted.
- **Pending requests**: requests that are still waiting.
- **Unfollowed by you**: accounts you recently unfollowed, and whether they still follow you.
- Search, sort by name or date, copy the list, or export it as CSV.
- Your last result is remembered in your browser, so it's there next time you visit.
- Light and dark themes.

## Privacy

| | |
| --- | --- |
| **Your export** | Opened and analyzed on your device. It's never sent anywhere. |
| **Saved result** | Kept in your browser's IndexedDB. **Clear saved result** removes it. |
| **Accounts and tracking** | None. No sign-in, analytics, ads or cookies. |

This is enforced, not just promised. Production builds set a Content-Security-Policy with `connect-src 'none'`, so the browser blocks every outgoing data request from the app, even to its own site. You can check this yourself in your browser's network tab.

The full policy is in [public/privacy.html](public/privacy.html).

## Getting your Instagram export

1. In Instagram, open **Accounts Center → Your information and permissions → Export your information**.
   - **App:** profile → **☰ menu** (top right) → **Accounts Center**
   - **Web:** [instagram.com](https://www.instagram.com) → **More (☰)** → **Settings** → **Accounts Center**
2. Choose **Create export**, select your profile, then **Export to device**.
3. Under **Customize information**, select only **Followers and following**.
4. Set **Date range** to **All time** and **Format** to **JSON**.
5. Select **Start export**. When Instagram emails you, download the ZIP and open it in FollowerWatch. There's no need to unzip it.

The export usually takes minutes, sometimes a few hours, and the download link expires after a few days.

### Good to know

- **Deactivated accounts look like non-followers.** A deactivated account disappears from the export, so it can't be told apart from someone who doesn't follow you. That's also why the counts can be higher than what the Instagram app shows.
- **"Recent" lists cover about 90 days.** Instagram only includes roughly the last 90 days of follow requests and unfollows, whatever date range you choose.
- **JSON only.** Exports in HTML format are detected, and you'll be asked to request a JSON export instead.
- **There's no "who unfollowed you" list.** Instagram's export doesn't include one. "Unfollowed by you" lists accounts *you* unfollowed.

## How it works

```
export.zip ──▶ unzip ──▶ parse JSON ──▶ following − followers ──▶ results
                                                                     │
                                                                     └──▶ IndexedDB
```

1. The ZIP is read in the browser with [fflate](https://github.com/101arrowz/fflate). Only the follower and following files are decompressed; the rest of the export is skipped.
2. `followers_*.json` and `following.json` are parsed. Both of Instagram's entry formats are supported, and names garbled by Instagram's text encoding are repaired.
3. Anyone you follow who isn't in your followers (compared case-insensitively) doesn't follow you back.
4. If the export includes them, `recent_follow_requests.json`, `pending_follow_requests.json` and `recently_unfollowed_profiles.json` fill the other tabs. A request's Accepted or Not accepted status is worked out from your following list, since the export doesn't record it.

## Development

**Requirements:** [Node.js](https://nodejs.org/) 22.13 or newer and [pnpm](https://pnpm.io/installation). The pnpm version is pinned in `package.json`, and pnpm switches to it on its own. `npm install` is refused on purpose, so the project only ever has a pnpm lockfile.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server with hot reload |
| `pnpm test` | Run the tests (Vitest) |
| `pnpm typecheck` | Check types without building |
| `pnpm build` | Type-check and build to `dist/` |
| `pnpm preview` | Serve the production build locally, with the Content-Security-Policy on |

The Content-Security-Policy is only added to production builds, so use `pnpm preview` to test with it.

### Project structure

```
follower-watch/
├── src/
│   ├── lib/
│   │   ├── analyzeExport.ts       # Export parsing and the non-follower comparison
│   │   ├── analyzeExport.test.ts  # Tests for the above
│   │   └── savedResult.ts         # Saving the last result in IndexedDB
│   ├── hooks/useExportAnalysis.ts # File checks and progress for the UI
│   ├── components/                # React + MUI interface
│   └── App.tsx
├── public/                        # Static files, including privacy.html
├── index.html
└── vite.config.ts                 # Build settings and the Content-Security-Policy
```

## Deployment

FollowerWatch is a static site deployed on [Vercel](https://vercel.com/). Importing the repository is all it takes, since Vercel detects Vite and pnpm (from `pnpm-lock.yaml`) and uses these settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `pnpm install` |
| Build command | `pnpm build` |
| Output directory | `dist` |

Pushes to `master` deploy to production, and other branches get preview deployments. No environment variables or secrets are needed. Any other static host, such as Cloudflare Pages, Netlify or GitHub Pages, works with the same settings.

## Related

Prefer a nightly email over opening a website? [follower-watch-pipeline](https://github.com/afaafhariri/follower-watch-pipeline) reads your Instagram export from Google Drive and sends you the results.

## License

[MIT](LICENSE). FollowerWatch is not affiliated with Instagram or Meta.
