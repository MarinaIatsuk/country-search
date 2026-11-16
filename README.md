# Country Search

A TypeScript country finder built for the RS School Fullstack Engineering assignment. It uses the public `countries.dev` API directly from the browser; no API key or backend is needed.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm test
npm run dev
```

Open the local URL printed by `http-server` (port 4173). `npm run dev` compiles TypeScript to browser ES modules in `dist/` and serves the static app. `npm run build` creates the deployable `dist/` folder.

## Included

- TypeScript UI and async API client
- Debounced country search, immediate `AbortController` cancellation, timeout and explicit HTTP error handling
- Response mapping, detail dialog, loading/empty/error/retry states
- TDD tests with Vitest; ESLint, Prettier and Husky hooks
- Bonus: in-memory response cache, in-flight deduplication with independent cancellation, and recent-search history in localStorage
- GitHub Pages deployment workflow

See [`GUIDE_RU.md`](./GUIDE_RU.md) for the step-by-step setup, commands, code walkthrough, TDD/RS School commit sequence, manual checklist, and submission instructions. See [`DESIGN.md`](./DESIGN.md) for cancellation, debounce, complexity, and clean-code rationale.

## Submission note

Use a private personal repository and the `country-search` branch. Open the required PR only from that branch into `main` of your own repository, keep it unmerged, and submit its link via RS App. Do not open a PR to the assignment source repository.
