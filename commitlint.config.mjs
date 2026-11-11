// Enforces the commit rules in CLAUDE.md. Runs from the lefthook commit-msg hook.

const AI_ATTRIBUTION =
  /^(co-authored-by:.*(claude|anthropic|copilot|openai|chatgpt|gpt)|.*generated with \[?claude)/im;

/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "no-ai-attribution": ({ raw }) => [
          !AI_ATTRIBUTION.test(raw ?? ""),
          "remove AI attribution (Co-Authored-By / Generated with) from the message",
        ],
      },
    },
  ],
  rules: {
    "header-max-length": [2, "always", 72],
    "scope-enum": [
      1,
      "always",
      ["shop", "desk", "checkout", "catalog", "payments", "store", "e2e", "a11y", "deps"],
    ],
    "no-ai-attribution": [2, "always"],
  },
};

export default config;
