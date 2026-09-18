const ACCENTED: Record<string, string> = {
  a: "á",
  b: "ƀ",
  c: "ç",
  d: "ð",
  e: "é",
  f: "ƒ",
  g: "ĝ",
  h: "ĥ",
  i: "í",
  j: "ĵ",
  k: "ķ",
  l: "ļ",
  m: "ɱ",
  n: "ñ",
  o: "ö",
  p: "þ",
  r: "ŕ",
  s: "š",
  t: "ţ",
  u: "ü",
  w: "ŵ",
  y: "ý",
  z: "ž",
  A: "Á",
  C: "Ç",
  D: "Ð",
  E: "É",
  G: "Ĝ",
  H: "Ĥ",
  I: "Í",
  J: "Ĵ",
  K: "Ķ",
  L: "Ļ",
  N: "Ñ",
  O: "Ö",
  R: "Ŕ",
  S: "Š",
  T: "Ţ",
  U: "Ü",
  W: "Ŵ",
  Y: "Ý",
  Z: "Ž",
};

// Interpolations like {{count}} and tags like <link>…</link> must survive.
const PROTECTED = /(\{\{[^}]*\}\}|<\/?[a-zA-Z0-9]+\/?>)/;

/**
 * English made to look foreign and about 40% longer, e.g. "Stock" becomes
 * "[Šţöçķ ~~]", so untranslated or overflowing text stands out on screen.
 */
export function pseudoLocalize(text: string) {
  if (text.trim() === "") return text;
  const accented = text
    .split(PROTECTED)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : [...part].map((char) => ACCENTED[char] ?? char).join(""),
    )
    .join("");
  return `[${accented} ${"~".repeat(Math.ceil(text.length * 0.4))}]`;
}

/** Applies pseudoLocalize to every string in a nested resource object. */
export function pseudoLocalizeDeep<T>(value: T): T {
  if (typeof value === "string") return pseudoLocalize(value) as T;
  if (Array.isArray(value)) return value.map(pseudoLocalizeDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        pseudoLocalizeDeep(entry),
      ]),
    ) as T;
  }
  return value;
}
