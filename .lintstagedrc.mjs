export default {
  // Both entries below use the function form, which tells lint-staged NOT to
  // append staged filenames to the command.
  //
  // eslint lives in frontend/node_modules, but lint-staged runs from the repo
  // root, so a bare `eslint` is not on PATH and fails with "not recognized".
  // Going through `npm --prefix` resolves it from the frontend workspace.
  "frontend/**/*.{js,jsx}": () => "npm run lint --prefix frontend",

  // Passing files to `tsc` overrides tsconfig's `include`, so the whole
  // backend project is type-checked rather than just the staged files.
  "backend/**/*.ts": () => "npm run typecheck --prefix backend",

  "*.{js,jsx,ts,tsx}": ["prettier --write"],
  "*.{json,md,css}": ["prettier --write"],
};
