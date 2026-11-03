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

## License

[MIT](LICENSE). FollowerWatch is not affiliated with Instagram or Meta.
