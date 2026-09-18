#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const scriptDir = path.dirname(
  process.argv[1] ? path.resolve(process.argv[1]) : process.cwd(),
);
const projectRoot = path.resolve(scriptDir, "..");
const iconsDir = path.join(projectRoot, "src", "icons");
const outputFile = path.join(iconsDir, "generated.ts");

function toPascalCase(fileName) {
  return fileName
    .replace(/\.svg$/i, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toKebabCase(fileName) {
  return fileName
    .replace(/\.svg$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getSvgFiles() {
  if (!fs.existsSync(iconsDir)) {
    return [];
  }

  return fs
    .readdirSync(iconsDir)
    .filter((file) => file.toLowerCase().endsWith(".svg"))
    .sort((a, b) => a.localeCompare(b));
}

function buildGeneratedFile(svgFiles) {
  const entries = svgFiles.map((file) => {
    const componentName = `${toPascalCase(file)}Icon`;
    const iconName = toKebabCase(file);
    return { file, componentName, iconName };
  });

  const importLines = entries
    .map((entry) => `import ${entry.componentName} from "./${entry.file}";`)
    .join("\n");

  const iconNameUnion =
    entries.length > 0
      ? entries.map((entry) => `  | "${entry.iconName}"`).join("\n")
      : "  | never";

  const iconMapEntries =
    entries.length > 0
      ? entries
          .map((entry) => `  "${entry.iconName}": ${entry.componentName},`)
          .join("\n")
      : "";

  return `/* eslint-disable */
// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run icons:generate

import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";
${importLines ? `\n${importLines}\n` : ""}
export type IconName =
${iconNameUnion};

export const icons: Record<IconName, ComponentType<SvgProps>> = {
${iconMapEntries}
};
`;
}

function main() {
  const svgFiles = getSvgFiles();
  const generated = buildGeneratedFile(svgFiles);

  fs.writeFileSync(outputFile, generated, "utf8");
}

main();
