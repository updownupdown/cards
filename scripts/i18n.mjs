// Translation workflow for the content kept in code: game titles,
// descriptions, quick starts and rules, game settings, quotes, Tao Te Ching
// chapters and card facts.
// English is read straight from the TypeScript sources; translations live in
// src/locales/<language>/content/*.json, each with the hash of the English it
// was made from (see src/i18n/content.ts). See docs/localization-plan.md.
//
//   npm run i18n -- status
//     Missing and stale translations, and missing UI keys, per language.
//
//   npm run i18n -- export --lang fr [--type games] [--limit 10] [--out file]
//     Lists content that needs translating: { items: [{ id, english }] }.
//
//   npm run i18n -- import --lang fr --file file
//     Checks translations ({ items: [{ id, translation }] }) against the
//     current English (placeholders, markdown, structure) and saves them with
//     the English hash.
//
//   npm run i18n -- translate --lang fr [--type games] [--limit 10] [--dry-run]
//     Translates what export would list with the Anthropic API
//     (ANTHROPIC_API_KEY, optional I18N_MODEL) in batches, then imports it.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const TYPES = ["games", "settings", "quotes", "tao", "facts"];
const LANGUAGE_NAMES = {
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  it: "Italian",
  tr: "Turkish",
  id: "Indonesian",
};

// ── Reading English from the TypeScript sources ─────────────────────────────

const readFile = (file) => fs.readFileSync(path.join(root, file), "utf8");

function parse(file) {
  return ts.createSourceFile(
    file,
    readFile(file),
    ts.ScriptTarget.Latest,
    true,
  );
}

function unwrap(node) {
  while (
    node &&
    (ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node))
  ) {
    node = node.expression;
  }
  return node;
}

const NOT_LITERAL = Symbol("not literal");

/** The value of a literal expression; parts that aren't literals are NOT_LITERAL. */
function literal(node) {
  node = unwrap(node);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const left = literal(node.left);
    const right = literal(node.right);
    if (typeof left === "string" && typeof right === "string") {
      return left + right;
    }
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const object = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const name =
        ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : property.name.getText();
      object[name] = literal(property.initializer);
    }
    return object;
  }
  return NOT_LITERAL;
}

function findVariable(sourceFile, predicate) {
  let found;
  const visit = (node) => {
    if (
      !found &&
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      predicate(node)
    ) {
      found = node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

function readEnglish() {
  const english = new Map();

  for (const filename of fs
    .readdirSync(path.join(root, "src/data/games"))
    .sort()) {
    if (!filename.endsWith(".ts")) continue;
    const declaration = findVariable(
      parse(`src/data/games/${filename}`),
      (node) => ts.isObjectLiteralExpression(unwrap(node.initializer)),
    );
    const game = literal(declaration.initializer);
    const slug = game.path.replace(/^\//, "");
    for (const field of ["title", "quickStart", "howToPlay"]) {
      if (game[field] !== undefined)
        english.set(`games/${slug}/${field}`, game[field]);
    }
  }

  const settings = literal(
    findVariable(
      parse("src/data/game-settings.ts"),
      (node) => node.name.getText() === "GAME_SPECIFIC_SETTINGS",
    ).initializer,
  );
  for (const [gamePath, definitions] of Object.entries(settings)) {
    for (const definition of definitions) {
      // The same shape as settingText() in src/i18n/content.ts.
      english.set(`settings/${gamePath.replace(/^\//, "")}/${definition.key}`, {
        label: definition.label,
        description: definition.description,
        options: definition.options.map(({ label, description }) => ({
          label,
          description,
        })),
      });
    }
  }

  const quotes = literal(
    findVariable(
      parse("src/components/Collectibles/QuotesText.ts"),
      (node) => node.name.getText() === "quotes",
    ).initializer,
  );
  quotes.forEach((quote, index) =>
    english.set(`quotes/${index + 1}`, {
      text: quote.text,
      source: quote.source,
    }),
  );

  const tao = literal(
    findVariable(
      parse("src/components/Collectibles/TaoText.ts"),
      (node) => node.name.getText() === "tao",
    ).initializer,
  );
  for (const chapter of tao)
    english.set(`tao/${chapter.chapter}`, chapter.text);

  const facts = literal(
    findVariable(
      parse("src/data/card-facts.ts"),
      (node) => node.name.getText() === "CARD_FACTS",
    ).initializer,
  );
  facts.forEach((fact, index) => english.set(`facts/${index + 1}`, fact));

  for (const [id, value] of english) {
    if (
      JSON.stringify(value)?.includes('"__NOT_LITERAL__"') ||
      containsNotLiteral(value)
    ) {
      throw new Error(
        `${id} isn't a plain literal in the source, so it can't be translated.`,
      );
    }
  }
  return english;
}

function containsNotLiteral(value) {
  if (value === NOT_LITERAL) return true;
  if (Array.isArray(value)) return value.some(containsNotLiteral);
  if (value && typeof value === "object")
    return Object.values(value).some(containsNotLiteral);
  return false;
}

/** FNV-1a of the English as JSON; must match sourceHash() in src/i18n/content.ts. */
function sourceHash(value) {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ── Translation files ────────────────────────────────────────────────────────

const contentFile = (language, type) =>
  `src/locales/${language}/content/${type}.json`;

function readContent(language) {
  return Object.fromEntries(
    TYPES.map((type) => {
      const file = path.join(root, contentFile(language, type));
      return [
        type,
        fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {},
      ];
    }),
  );
}

function sortKeys(value) {
  if (Array.isArray(value) || !value || typeof value !== "object") return value;
  const keys = Object.keys(value);
  const numeric = keys.every((key) => /^\d+$/.test(key));
  keys.sort(
    numeric ? (left, right) => Number(left) - Number(right) : undefined,
  );
  return Object.fromEntries(keys.map((key) => [key, sortKeys(value[key])]));
}

function writeContent(language, content) {
  for (const type of TYPES) {
    const text = JSON.stringify(sortKeys(content[type]), null, 2).replace(
      / /g,
      "\\u00a0",
    );
    fs.mkdirSync(path.dirname(path.join(root, contentFile(language, type))), {
      recursive: true,
    });
    fs.writeFileSync(path.join(root, contentFile(language, type)), `${text}\n`);
  }
}

/** Types keyed by number alone, rather than by game and field. */
const FLAT_TYPES = ["quotes", "tao", "facts"];

function getEntry(content, id) {
  const [type, ...rest] = id.split("/");
  if (FLAT_TYPES.includes(type)) return content[type][rest[0]];
  return content[type][rest[0]]?.[rest[1]];
}

function setEntry(content, id, entry) {
  const [type, ...rest] = id.split("/");
  if (FLAT_TYPES.includes(type)) {
    content[type][rest[0]] = entry;
  } else {
    content[type][rest[0]] ??= {};
    content[type][rest[0]][rest[1]] = entry;
  }
}

function languages() {
  return fs
    .readdirSync(path.join(root, "src/locales"))
    .filter((name) => name !== "en" && name !== "glossary")
    .sort();
}

const words = (value) =>
  (JSON.stringify(value).match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

// ── Checks ───────────────────────────────────────────────────────────────────

/** Interpolations, tags and line breaks, which a translation must keep. */
const tokens = (text) =>
  (text.match(/\{\{[^}]+\}\}|<\/?[a-zA-Z0-9]+>/g) ?? []).sort().join(" ");

/** Markdown at the start of a rule line, bold markers and table pipes. */
const markdown = (line) =>
  `${line.match(/^(##|-+|\|)\s/)?.[1] ?? ""}|${(line.match(/\*\*/g) ?? []).length}|${(line.match(/\|/g) ?? []).length}`;

function checkString(label, english, translation, problems) {
  // Blank English lines (paragraph breaks) stay blank.
  const blank = typeof translation === "string" && translation.trim() === "";
  if (typeof translation !== "string" || (blank && english.trim() !== "")) {
    problems.push(`${label}: missing text`);
    return;
  }
  if (tokens(english) !== tokens(translation)) {
    problems.push(
      `${label}: placeholders or tags differ (${tokens(english)} vs ${tokens(translation)})`,
    );
  }
  if (markdown(english) !== markdown(translation)) {
    problems.push(
      `${label}: markdown differs ("${markdown(english)}" vs "${markdown(translation)}")`,
    );
  }
}

function checkTranslation(id, english, translation) {
  const problems = [];
  const [type] = id.split("/");

  if (type === "games") {
    if (Array.isArray(english)) {
      if (
        !Array.isArray(translation) ||
        translation.length !== english.length
      ) {
        return [`${id}: needs ${english.length} lines`];
      }
      english.forEach((line, index) =>
        checkString(`${id}[${index}]`, line, translation[index], problems),
      );
    } else {
      checkString(id, english, translation, problems);
    }
  } else if (type === "settings") {
    checkString(`${id}.label`, english.label, translation?.label, problems);
    if (
      (english.description === undefined) !==
      (translation?.description === undefined)
    ) {
      problems.push(`${id}.description: present in one only`);
    } else if (english.description !== undefined) {
      checkString(
        `${id}.description`,
        english.description,
        translation.description,
        problems,
      );
    }
    if (translation?.options?.length !== english.options.length) {
      problems.push(`${id}.options: needs ${english.options.length}`);
    } else {
      english.options.forEach((option, index) => {
        const translated = translation.options[index];
        checkString(
          `${id}.options[${index}].label`,
          option.label,
          translated.label,
          problems,
        );
        if (
          (option.description === undefined) !==
          (translated.description === undefined)
        ) {
          problems.push(
            `${id}.options[${index}].description: present in one only`,
          );
        } else if (option.description !== undefined) {
          checkString(
            `${id}.options[${index}].description`,
            option.description,
            translated.description,
            problems,
          );
        }
      });
    }
  } else if (type === "quotes") {
    checkString(`${id}.text`, english.text, translation?.text, problems);
    if (english.source !== undefined) {
      checkString(
        `${id}.source`,
        english.source,
        translation?.source,
        problems,
      );
    }
  } else if (type === "tao" || type === "facts") {
    checkString(id, english, translation, problems);
  }
  return problems;
}

// ── Commands ─────────────────────────────────────────────────────────────────

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1];
}

function pending(language, english, content) {
  const type = option("type");
  if (type && !TYPES.includes(type))
    throw new Error(`--type must be one of ${TYPES.join(", ")}`);
  return [...english.entries()]
    .filter(([id]) => !type || id.startsWith(`${type}/`))
    .filter(([id, value]) => getEntry(content, id)?.hash !== sourceHash(value))
    .map(([id, value]) => ({ id, english: value }));
}

function flattenKeys(value, prefix = "") {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, entry]) =>
    flattenKeys(entry, prefix ? `${prefix}.${key}` : key),
  );
}

function status(english) {
  const namespaces = fs
    .readdirSync(path.join(root, "src/locales/en"))
    .filter((name) => name.endsWith(".json"));
  for (const language of languages()) {
    const content = readContent(language);
    console.log(`\n${language}`);
    for (const type of TYPES) {
      const ids = [...english.keys()].filter((id) => id.startsWith(`${type}/`));
      let current = 0;
      let stale = 0;
      let missingWords = 0;
      for (const id of ids) {
        const entry = getEntry(content, id);
        if (entry?.hash === sourceHash(english.get(id))) current += 1;
        else {
          if (entry) stale += 1;
          missingWords += words(english.get(id));
        }
      }
      console.log(
        `  ${type.padEnd(9)} ${current}/${ids.length} translated, ${stale} stale, ${missingWords} English words to go`,
      );
    }
    for (const namespace of namespaces) {
      const englishKeys = flattenKeys(
        JSON.parse(readFile(`src/locales/en/${namespace}`)),
      );
      const file = `src/locales/${language}/${namespace}`;
      const translatedKeys = fs.existsSync(path.join(root, file))
        ? new Set(flattenKeys(JSON.parse(readFile(file))))
        : new Set();
      const missing = englishKeys.filter((key) => !translatedKeys.has(key));
      if (missing.length > 0) {
        console.log(
          `  ui ${namespace}: ${missing.length} missing keys (${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ", ..." : ""})`,
        );
      }
    }
  }
}

function importItems(language, english, items) {
  const content = readContent(language);
  let saved = 0;
  const problems = [];
  for (const { id, translation } of items) {
    if (!english.has(id)) {
      problems.push(`${id}: no such English content`);
      continue;
    }
    const itemProblems = checkTranslation(id, english.get(id), translation);
    if (itemProblems.length > 0) {
      problems.push(...itemProblems);
      continue;
    }
    setEntry(content, id, {
      hash: sourceHash(english.get(id)),
      value: translation,
    });
    saved += 1;
  }
  writeContent(language, content);
  console.log(`Saved ${saved} of ${items.length} ${language} translations.`);
  if (problems.length > 0) {
    console.log(`Not saved:\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
  }
}

async function translate(language, english) {
  const items = pending(language, english, readContent(language)).slice(
    0,
    Number(option("limit", Infinity)),
  );
  const glossaryFile = `src/locales/glossary/${language}.json`;
  const glossary = fs.existsSync(path.join(root, glossaryFile))
    ? readFile(glossaryFile)
    : "{}";
  const batches = [];
  let batch = [];
  let batchWords = 0;
  for (const item of items) {
    const itemWords = words(item.english);
    if (batch.length > 0 && batchWords + itemWords > 2500) {
      batches.push(batch);
      batch = [];
      batchWords = 0;
    }
    batch.push(item);
    batchWords += itemWords;
  }
  if (batch.length > 0) batches.push(batch);

  console.log(
    `${items.length} items in ${batches.length} batches (${items.reduce((sum, item) => sum + words(item.english), 0)} English words).`,
  );
  const system = [
    `You translate Solitarius, a mobile app of solo playing-card games, from English into ${LANGUAGE_NAMES[language] ?? language}.`,
    "Translate each item's English faithfully and naturally for players. Game rules must stay exactly as precise as the English.",
    "Keep {{placeholders}}, <tags>, line breaks, markdown (## headings, - list markers, | table cells |, **bold**) and the JSON structure exactly. Arrays must keep their length.",
    "Translate game titles: use the language's established name for a classic solitaire when there is one, translate descriptive titles, and keep proper names that don't translate. When rules mention another game, use that game's translated title. Quote authors are not included; translate quote sources, but keep book and work titles recognizable. Card facts are trivia for players: keep names, dates and numbers exact, and name suits and ranks as the glossary does.",
    `Follow this style guide and glossary:\n${glossary}`,
    'Reply with JSON only, in the form {"items":[{"id":"...","translation":...}]}.',
  ].join("\n\n");

  if (process.argv.includes("--dry-run")) {
    console.log(
      `\nSystem prompt:\n${system}\n\nFirst batch ids: ${batches[0]?.map((item) => item.id).join(", ")}`,
    );
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Set ANTHROPIC_API_KEY (for example in .env.local) to translate with the API.",
    );
  }

  for (const [index, current] of batches.entries()) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.I18N_MODEL ?? "claude-opus-5",
        max_tokens: 32000,
        system,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              items: current.map(({ id, english: value }) => ({
                id,
                english: value,
              })),
            }),
          },
        ],
      }),
    });
    if (!response.ok)
      throw new Error(`API error ${response.status}: ${await response.text()}`);
    const message = await response.json();
    const text = message.content.map((part) => part.text ?? "").join("");
    const json = JSON.parse(
      text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    );
    console.log(`Batch ${index + 1}/${batches.length}:`);
    importItems(language, readEnglish(), json.items);
  }
}

const command = process.argv[2];
const english = readEnglish();

if (command === "status") {
  status(english);
} else if (command === "export") {
  const language = option("lang");
  if (!language) throw new Error("--lang is required");
  const items = pending(language, english, readContent(language)).slice(
    0,
    Number(option("limit", Infinity)),
  );
  const output = JSON.stringify({ language, items }, null, 2);
  const out = option("out");
  if (out) {
    fs.writeFileSync(out, `${output}\n`);
    console.log(
      `Wrote ${items.length} items (${items.reduce((sum, item) => sum + words(item.english), 0)} words) to ${out}.`,
    );
  } else {
    console.log(output);
  }
} else if (command === "import") {
  const language = option("lang");
  const file = option("file");
  if (!language || !file) throw new Error("--lang and --file are required");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  importItems(language, english, data.items);
} else if (command === "translate") {
  const language = option("lang");
  if (!language) throw new Error("--lang is required");
  await translate(language, english);
} else {
  console.log(
    "Usage: npm run i18n -- status | export | import | translate (see scripts/i18n.mjs)",
  );
}
