import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const strictSchemaUrl = new URL(
  "../../semantic-runtime/schema/aurelia.project.schema.json",
  import.meta.url,
);
const editorSchemaUrl = new URL(
  "../src/schemas/aurelia.project.jsonc.schema.json",
  import.meta.url,
);

function requiredObject(value, path) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected object at ${path}.`);
  }
  return value;
}

function requiredString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected non-empty string at ${path}.`);
  }
  return value;
}

function requiredArray(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Expected non-empty array at ${path}.`);
  }
  return value;
}

function optionalDescription(schema) {
  return typeof schema.description === "string" && schema.description.length > 0
    ? schema.description
    : undefined;
}

function assertExactKeys(value, expectedKeys, path) {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    throw new Error(
      `${path} has fields [${actualKeys.join(", ")}], expected [${sortedExpectedKeys.join(", ")}]. `
      + "Update the editor projection deliberately when the canonical contract grows.",
    );
  }
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Project the strict canonical contract into completion annotations only.
 *
 * Deliberately do not copy assertion or branching keywords. JSONC owns syntax,
 * while semantic-runtime remains the sole authority for project meaning.
 */
export function generateProjectConfigurationEditorSchema(strictSchema) {
  const strict = requiredObject(strictSchema, "$strict");
  const rootProperties = requiredObject(strict.properties, "$strict.properties");
  assertExactKeys(
    rootProperties,
    ["$schema", "version", "authoredSources", "findings"],
    "$strict.properties",
  );
  const version = requiredObject(rootProperties.version, "$strict.properties.version");
  const authoredSources = requiredObject(
    rootProperties.authoredSources,
    "$strict.properties.authoredSources",
  );
  const authoredSourceProperties = requiredObject(
    authoredSources.properties,
    "$strict.properties.authoredSources.properties",
  );
  assertExactKeys(
    authoredSourceProperties,
    ["excludedRoots"],
    "$strict.properties.authoredSources.properties",
  );
  const excludedRoots = requiredObject(
    authoredSourceProperties.excludedRoots,
    "$strict.properties.authoredSources.properties.excludedRoots",
  );
  const findings = requiredObject(rootProperties.findings, "$strict.properties.findings");
  const findingProperties = requiredObject(
    findings.properties,
    "$strict.properties.findings.properties",
  );
  const definitions = requiredObject(strict.$defs, "$strict.$defs");
  const disposition = requiredObject(
    definitions.findingDisposition,
    "$strict.$defs.findingDisposition",
  );
  const dispositionExamples = requiredArray(
    disposition.enum,
    "$strict.$defs.findingDisposition.enum",
  ).map((value, index) => requiredString(
    value,
    `$strict.$defs.findingDisposition.enum[${index}]`,
  ));
  const versionExample = version.const;
  if (versionExample == null) {
    throw new Error("Expected $strict.properties.version.const.");
  }

  const findingDispositionDescription = optionalDescription(disposition);
  const knownFindingProperties = Object.fromEntries(
    Object.entries(findingProperties)
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([ruleId, rawRuleSchema]) => {
        const ruleSchema = requiredObject(
          rawRuleSchema,
          `$strict.properties.findings.properties.${ruleId}`,
        );
        const defaultDisposition = requiredString(
          ruleSchema.default,
          `$strict.properties.findings.properties.${ruleId}.default`,
        );
        if (!dispositionExamples.includes(defaultDisposition)) {
          throw new Error(`Finding '${ruleId}' has an unsupported default disposition.`);
        }
        return [ruleId, {
          ...(optionalDescription(ruleSchema) ?? findingDispositionDescription) == null
            ? {}
            : { description: optionalDescription(ruleSchema) ?? findingDispositionDescription },
          default: defaultDisposition,
          examples: dispositionExamples,
        }];
      }),
  );

  return {
    $schema: requiredString(strict.$schema, "$strict.$schema"),
    $id: "vscode://aurelia/project-configuration-jsonc-editor-assistance",
    title: "Aurelia Project Configuration Editor Assistance",
    description:
      "Offline, non-validating completion hints for aurelia.project.json. Semantic-runtime owns semantic project-configuration validation.",
    allowComments: strict.allowComments === true,
    allowTrailingCommas: strict.allowTrailingCommas === true,
    properties: {
      version: {
        ...(optionalDescription(version) == null ? {} : { description: optionalDescription(version) }),
        default: versionExample,
        examples: [versionExample],
      },
      authoredSources: {
        description: optionalDescription(authoredSources) ?? "Authored-source membership settings.",
        properties: {
          excludedRoots: {
            ...(optionalDescription(excludedRoots) == null
              ? {}
              : { description: optionalDescription(excludedRoots) }),
            items: {
              description: "One project-relative excluded descendant root.",
            },
          },
        },
      },
      findings: {
        ...(optionalDescription(findings) == null ? {} : { description: optionalDescription(findings) }),
        properties: knownFindingProperties,
        additionalProperties: {
          description:
            "Disposition suggestions for manually entered finding IDs. Semantic-runtime determines whether an ID is known and valid.",
          examples: dispositionExamples,
        },
      },
    },
  };
}

export function formatProjectConfigurationEditorSchema(schema) {
  return `${JSON.stringify(schema, null, 2)}\n`;
}

function readStrictSchema() {
  return JSON.parse(readFileSync(strictSchemaUrl, "utf8"));
}

function generatedText() {
  return formatProjectConfigurationEditorSchema(
    generateProjectConfigurationEditorSchema(readStrictSchema()),
  );
}

function run(command) {
  const expected = generatedText();
  if (command === "--write") {
    writeFileSync(editorSchemaUrl, expected, "utf8");
    return;
  }
  if (command === "--check") {
    const actual = readFileSync(editorSchemaUrl, "utf8");
    if (actual !== expected) {
      throw new Error(
        "Generated Aurelia project editor schema is stale. Run this script with --write.",
      );
    }
    return;
  }
  if (command == null || command === "--stdout") {
    process.stdout.write(expected);
    return;
  }
  throw new Error(`Unknown argument '${command}'. Expected --stdout, --write, or --check.`);
}

if (process.argv[1] != null && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv[2]);
}
