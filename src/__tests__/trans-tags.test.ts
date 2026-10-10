import { describe, expect, test } from "@jest/globals";
import { RESOURCES } from "@/i18n/resources";

/**
 * HTML's empty elements: Trans reads <link>…</link> as an empty <link> and
 * the words after it, so a component given for it never gets its words (the
 * privacy policy's email lost its link this way).
 */
const VOID_ELEMENTS = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

function strings(value: unknown, path: string, out: [string, string][]) {
  if (typeof value === "string") out.push([path, value]);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      strings(child, `${path}.${key}`, out);
    }
  }
  return out;
}

describe("Trans tags", () => {
  test("no string names its tag after an empty HTML element", () => {
    const found = strings(RESOURCES, "", []).filter(([, text]) =>
      VOID_ELEMENTS.some((tag) => text.includes(`<${tag}>`)),
    );
    expect(found.map(([path]) => path)).toEqual([]);
  });
});
