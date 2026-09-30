export default {
  // Entries below use the function form, which tells lint-staged NOT to
  // append staged filenames to the command.
  //
  // Linters and compilers here live in their own workspace's node_modules and
  // lint-staged runs from the repo root, so a bare `eslint`/`tsc` is not on
  // PATH. Going through `npm -w` (workspaces) or `npm --prefix` (the
  // standalone Vite app) resolves them correctly.

  // The Phase 2 React + Vite app. Not an npm workspace, so it keeps --prefix.
  "frontend/**/*.{js,jsx}": () => "npm run lint --prefix frontend",

  // Passing files to `tsc` overrides tsconfig's `include`, so the whole
  // project is type-checked rather than just the staged files.
  "backend/**/*.ts": () => "npm run typecheck -w movie-finder-backend",

  // The shared contract: a break here breaks both consumers, so it is built
  // (not just checked) to make sure the emitted .d.ts is valid too.
  "shared/**/*.ts": () => "npm run build -w @cineblaze/shared",

  // `next typegen` regenerates the PageProps/LayoutProps helpers first,
  // otherwise a freshly cloned or cleaned tree fails on missing globals.
  "web/**/*.{ts,tsx}": () => [
    "npm run typecheck -w web",
    "npm run lint -w web",
  ],

  "*.{js,jsx,ts,tsx}": ["prettier --write"],
  "*.{json,md,css}": ["prettier --write"],
};
