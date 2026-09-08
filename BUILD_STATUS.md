# Build status

## Project
Context Reader 0.1.0 MVP

## Included
- Manifest V3 Chrome extension
- Dedicated reader page
- Local PDF upload and PDF.js rendering
- Selectable PDF text layer
- Context extraction
- AI provider abstraction for Gemini and a token-free dummy provider
- Service-worker AI requests
- User-configured API key with session/local persistence option
- IndexedDB saved words, history, and document metadata
- Settings page
- Popup launcher
- Design system documentation in DESIGN.md

## TypeScript setup fixes
- Added `src/vite-env.d.ts` for Vite module typings, including `?url` imports.
- Uses `@types/chrome` rather than a conflicting custom global Chrome declaration.

## Validation note
The environment used to prepare this package could not complete an npm dependency installation because external npm registry access timed out. Run `npm install`, then `npm run typecheck` and `npm run build` locally.
