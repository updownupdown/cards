#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const scriptDirectory = path.dirname(fs.realpathSync(process.argv[1]));
const projectRoot = path.resolve(scriptDirectory, "..");
const gamesRoot = path.join(projectRoot, "src", "components", "Games");
const coveragePath = path.join(projectRoot, "coverage", "coverage-final.json");

if (!fs.existsSync(coveragePath)) {
  throw new Error(
    "Missing coverage/coverage-final.json. Run npm run test:coverage:rules.",
  );
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));

function listSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolutePath);
    return /\.(ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

function propertyName(property) {
  const name = property.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function sourceRange(sourceFile, node) {
  return {
    start: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    end: sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
  };
}

function findCoveredFunction(fileCoverage, range) {
  const candidates = Object.entries(fileCoverage.fnMap).filter(
    ([, entry]) =>
      entry.loc.start.line >= range.start && entry.loc.end.line <= range.end,
  );
  if (candidates.length === 0) return null;
  candidates.sort(
    ([, left], [, right]) =>
      left.loc.end.line -
      left.loc.start.line -
      (right.loc.end.line - right.loc.start.line),
  );
  const [id, entry] = candidates[0];
  return { id, entry, count: fileCoverage.f[id] ?? 0 };
}

function branchCounts(fileCoverage, range) {
  const branchIds = Object.entries(fileCoverage.branchMap)
    .filter(
      ([, entry]) =>
        entry.loc.start.line >= range.start && entry.loc.end.line <= range.end,
    )
    .map(([id]) => id);
  const counts = branchIds.flatMap((id) => fileCoverage.b[id] ?? []);
  return {
    covered: counts.filter((count) => count > 0).length,
    total: counts.length,
  };
}

function collectFacades(filePath) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const declarations = new Map();
  const facades = [];

  function visitDeclarations(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      declarations.set(node.name.text, node);
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) ||
        ts.isFunctionExpression(node.initializer))
    ) {
      declarations.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visitDeclarations);
  }
  visitDeclarations(sourceFile);

  function visitFacades(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text.endsWith("Rules") &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const members = node.initializer.properties.flatMap((property) => {
        const name = propertyName(property);
        if (!name) return [];

        let target = null;
        if (ts.isPropertyAssignment(property)) {
          if (ts.isIdentifier(property.initializer)) {
            target = declarations.get(property.initializer.text) ?? null;
          } else if (
            ts.isArrowFunction(property.initializer) ||
            ts.isFunctionExpression(property.initializer)
          ) {
            target = property.initializer;
          }
        } else if (ts.isShorthandPropertyAssignment(property)) {
          target = declarations.get(property.name.text) ?? null;
        } else if (ts.isMethodDeclaration(property)) {
          target = property;
        }

        return target ? [{ name, range: sourceRange(sourceFile, target) }] : [];
      });
      facades.push({ name: node.name.text, filePath, members });
    }
    ts.forEachChild(node, visitFacades);
  }
  visitFacades(sourceFile);
  return facades;
}

const facades = listSourceFiles(gamesRoot).flatMap(collectFacades);
const rows = facades.map((facade) => {
  const fileCoverage = coverage[path.resolve(facade.filePath)];
  const members = facade.members.map((member) => {
    const coveredFunction = fileCoverage
      ? findCoveredFunction(fileCoverage, member.range)
      : null;
    const branches = fileCoverage
      ? branchCounts(fileCoverage, member.range)
      : { covered: 0, total: 0 };
    return { ...member, coveredFunction, branches };
  });
  const functionTotal = members.length;
  const functionCovered = members.filter(
    ({ coveredFunction }) => (coveredFunction?.count ?? 0) > 0,
  ).length;
  const branchCovered = members.reduce(
    (sum, member) => sum + member.branches.covered,
    0,
  );
  const branchTotal = members.reduce(
    (sum, member) => sum + member.branches.total,
    0,
  );
  const uncovered = members
    .filter(({ coveredFunction }) => (coveredFunction?.count ?? 0) === 0)
    .map(({ name }) => name);

  return {
    name: facade.name,
    functionCovered,
    functionTotal,
    branchCovered,
    branchTotal,
    branchPercent:
      branchTotal === 0 ? 100 : (branchCovered / branchTotal) * 100,
    uncovered,
  };
});

rows.sort(
  (left, right) =>
    left.branchPercent - right.branchPercent ||
    left.name.localeCompare(right.name),
);

const facadeWidth = Math.max(...rows.map(({ name }) => name.length), 6);
console.log("Rule facade coverage (lowest branch coverage first)\n");
console.log(
  `${"Facade".padEnd(facadeWidth)}  Functions  Branches       Uncovered members`,
);
for (const row of rows) {
  const functions = `${row.functionCovered}/${row.functionTotal}`.padEnd(9);
  const branches =
    row.branchTotal === 0
      ? "n/a"
      : `${row.branchCovered}/${row.branchTotal} (${row.branchPercent.toFixed(1)}%)`;
  console.log(
    `${row.name.padEnd(facadeWidth)}  ${functions}  ${branches.padEnd(13)}  ${row.uncovered.join(", ") || "-"}`,
  );
}

console.log(
  `\nReported ${rows.length} rule facades. No threshold was applied.`,
);
