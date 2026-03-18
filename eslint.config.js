const js = require("@eslint/js");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const tseslint = require("@typescript-eslint/eslint-plugin");

const semanticAuthorityBoundaryRules = {
  shared: ["graph", "subject-model", "evaluators", "ts-bridge", "facade", "workspace", "consumer-adapters"],
  graph: ["subject-model", "evaluators", "ts-bridge", "facade", "workspace", "consumer-adapters"],
  "subject-model": ["graph", "evaluators", "ts-bridge", "facade", "workspace", "consumer-adapters"],
  evaluators: ["facade", "workspace", "consumer-adapters"],
  "ts-bridge": ["evaluators", "facade", "workspace", "consumer-adapters"],
  facade: ["evaluators", "workspace", "consumer-adapters"],
  workspace: ["facade", "consumer-adapters"],
  "consumer-adapters": ["graph", "evaluators", "subject-model", "ts-bridge"],
};

function createSemanticAuthorityRestrictions(sourceModule, forbiddenTargets) {
  return [
    {
      group: ["@aurelia-ls/*"],
      message: "semantic-authority is a clean-room package; do not import existing @aurelia-ls sibling packages.",
    },
    ...forbiddenTargets.map((target) => ({
      group: [`**/${target}`, `**/${target}/**`],
      message: `semantic-authority dependency matrix forbids ${sourceModule} -> ${target}.`,
    })),
  ];
}

const semanticAuthorityLintOverrides = [
  {
    files: ["packages/semantic-authority/src/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: createSemanticAuthorityRestrictions("package-root", []),
        },
      ],
    },
  },
  ...Object.entries(semanticAuthorityBoundaryRules).map(([sourceModule, forbiddenTargets]) => ({
    files: [`packages/semantic-authority/src/${sourceModule}/**/*.ts`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: createSemanticAuthorityRestrictions(sourceModule, forbiddenTargets),
        },
      ],
    },
  })),
];

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "packages/**/out/**",
      "packages/**/test/**",
      "coverage/**",
      "dist/**",
      "fixtures/**",
      ".aurelia-cache/**",
      "**/*.tsbuildinfo",
      "examples/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: "module",
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.es2023,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs["recommended-type-checked"].rules,
      "no-empty": "off",
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      // TODO: re-enable if template literal churn is worth enforcing; disabled to reduce noise.
      "prefer-template": "off",
      eqeqeq: ["error", "smart"],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "allow-as-parameter" },
      ],
      "@typescript-eslint/no-explicit-any": ["error", { fixToUnknown: true, ignoreRestArgs: true }],
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true, ignoreIIFE: true }],
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true, allowNullish: false },
      ],
      // TODO: re-evaluate once non-null assertions are cleaned up; disabling to reduce noise while invariants are enforced elsewhere.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          minimumDescriptionLength: 5,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='require']",
          message: "Use ESM imports instead of require().",
        },
      ],
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.es2023,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-empty": "off",
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      // TODO: re-enable if template literal churn is worth enforcing; disabled to reduce noise.
      "prefer-template": "off",
      eqeqeq: ["error", "smart"],
    },
  },
  ...semanticAuthorityLintOverrides,
];
