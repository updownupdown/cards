#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const cardBacksDir = path.join(projectRoot, "assets", "card-backs");
const outputFile = path.join(
  projectRoot,
  "src",
  "components",
  "Cards",
  "generated-card-backs.ts",
);

const DEFAULT_CARD_BACK = "DefaultCardBack.png";

function getCardBackFiles() {
  if (!fs.existsSync(cardBacksDir)) {
    return [];
  }

  return fs
    .readdirSync(cardBacksDir)
    .filter((file) => file.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b));
}

function buildGeneratedFile(files) {
  const unionLines =
    files.length > 0
      ? files.map((file) => `  | "${file}"`).join("\n")
      : "  | never";

  const mapLines =
    files.length > 0
      ? files
          .map((file) => `  "${file}": require("@/assets/card-backs/${file}"),`)
          .join("\n")
      : "";

  const resolvedDefault = files.includes(DEFAULT_CARD_BACK)
    ? DEFAULT_CARD_BACK
    : files[0] || DEFAULT_CARD_BACK;

  return `/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run card-backs:generate

export type CardBackName =
${unionLines};

export const defaultCardBackName = "${resolvedDefault}";

export const cardBackAssets: Record<string, any> = {
${mapLines}
};
`;
}

function main() {
  const files = getCardBackFiles();
  const generated = buildGeneratedFile(files);
  fs.writeFileSync(outputFile, generated, "utf8");
}

main();
