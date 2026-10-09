#!/usr/bin/env node

// Makes and removes unlock keys (src/data/unlock-keys.ts). Only each key's
// fingerprint is kept in the repository, so a key is shown once, when it is
// made: send it on then. See docs/unlock-keys.md.
//
//   npm run keys:add -- --label "Sam" [--role friend|dev]
//   npm run keys:remove -- --label "Sam"
//   npm run keys:list
//
// A change reaches players with the next build: the web app's on merging to
// main, the Android app's with its next release.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "src/data/unlock-keys.ts");
/** The web app, for links that enter a key. */
const WEB_APP = "https://solitarius.app/";
/** Crockford's base 32: no I, L, O or U, which read as other characters. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const source = fs.readFileSync(file, "utf8");
const salt = source.match(/UNLOCK_KEY_SALT = "([^"]*)"/)[1];
const begin = source.indexOf("// keys:begin");
const end = source.indexOf("// keys:end");
const listStart = source.indexOf("= [", begin) + 2;
const listEnd = source.lastIndexOf("]", end);
const keys = eval(source.slice(listStart, listEnd + 1));

function normalize(text) {
  return text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
}

function hash(key) {
  return crypto
    .createHash("sha256")
    .update(salt + normalize(key))
    .digest("hex");
}

function makeKey() {
  const bytes = crypto.randomBytes(12);
  const chars = [...bytes].map((byte) => ALPHABET[byte % 32]);
  return [0, 4, 8].map((at) => chars.slice(at, at + 4).join("")).join("-");
}

function write(next) {
  const list =
    next.length === 0
      ? "[]"
      : `[\n${next
          .map(
            (key) =>
              `  {\n    label: ${JSON.stringify(key.label)},\n    role: ${JSON.stringify(key.role)},\n    hash: ${JSON.stringify(key.hash)},\n  },\n`,
          )
          .join("")}]`;
  fs.writeFileSync(
    file,
    source.slice(0, listStart) + list + source.slice(listEnd + 1),
  );
}

function option(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const command = process.argv[2];
const label = option("label");

if (command === "add") {
  const role = option("role") ?? "friend";
  if (!label) throw new Error("Give the key a --label (who it is for).");
  if (role !== "friend" && role !== "dev") {
    throw new Error('--role is "friend" or "dev".');
  }
  if (keys.some((key) => key.label === label)) {
    throw new Error(`There is already a key labelled "${label}".`);
  }
  const key = makeKey();
  write([...keys, { label, role, hash: hash(key) }]);
  console.log(`Key for ${label} (${role}): ${key}`);
  console.log(`Link: ${WEB_APP}?key=${key}`);
  console.log("It isn't kept anywhere: send it on now.");
} else if (command === "remove") {
  const next = keys.filter((key) => key.label !== label);
  if (next.length === keys.length) {
    throw new Error(`No key is labelled "${label}".`);
  }
  write(next);
  console.log(`Removed the key for ${label}.`);
} else if (command === "list") {
  if (keys.length === 0) console.log("No keys yet.");
  keys.forEach((key) => console.log(`${key.label} (${key.role})`));
} else {
  console.log("Usage: npm run keys:add -- --label <name> [--role friend|dev]");
  console.log("       npm run keys:remove -- --label <name>");
  console.log("       npm run keys:list");
}
