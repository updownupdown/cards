import { describe, expect, test } from "@jest/globals";
import settingsEn from "@/locales/en/settings.json";
import {
  MOMENT_CHANCE,
  MOMENT_FREQUENCIES,
  MOMENT_KINDS,
  parseMomentFrequency,
  rollMoment,
  type Moment,
} from "@/data/moments";
import { momentDuration } from "@/components/Moments/MomentOverlay";

const always = () => 0;

describe("Quiet moments", () => {
  test("every kind and frequency has a name in the settings", () => {
    for (const kind of MOMENT_KINDS) {
      expect(settingsEn.moments.preview[kind]).toBeTruthy();
    }
    for (const frequency of MOMENT_FREQUENCIES) {
      expect(settingsEn.moments[frequency]).toBeTruthy();
    }
  });

  test("never comes when disabled, and comes about once in N games", () => {
    expect(rollMoment({ frequency: "off", random: always })).toBeNull();
    expect(MOMENT_CHANCE.every3).toBeCloseTo(1 / 3);
    expect(MOMENT_CHANCE.every10).toBeCloseTo(1 / 10);
    const roll = (frequency: "every5" | "every10", value: number) =>
      rollMoment({ frequency, random: () => value, introduced: true });
    expect(roll("every5", 0.15)).not.toBeNull();
    expect(roll("every10", 0.15)).toBeNull();
  });

  test("defaults to about every five games", () => {
    expect(parseMomentFrequency(null)).toBe("every5");
    expect(parseMomentFrequency("frequent")).toBe("every5");
    expect(parseMomentFrequency("off")).toBe("off");
  });

  test("the first moment is the setting", () => {
    expect(rollMoment({ random: always, introduced: false })).toEqual({
      kind: "intro",
    });
  });

  test("shows only collected quotes, and the game's own picture", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const moment = rollMoment({
        frequency: "every3",
        random: Math.random,
        introduced: true,
        quoteIds: [7, 12],
        artworkPath: "/klondike",
      });
      if (!moment) continue;
      seen.add(moment.kind);
      if (moment.kind === "quote") expect([7, 12]).toContain(moment.quoteId);
      if (moment.kind === "artwork") expect(moment.path).toBe("/klondike");
    }
    expect([...seen].sort()).toEqual(["artwork", "breathe", "quote", "settle"]);

    for (let i = 0; i < 50; i += 1) {
      const moment = rollMoment({
        frequency: "every3",
        random: Math.random,
        introduced: true,
      });
      expect(moment?.kind ?? "breathe").toMatch(/breathe|settle/);
    }
  });

  test("never shows the same kind twice running", () => {
    let last: string | null = null;
    for (let i = 0; i < 200; i += 1) {
      const moment = rollMoment({
        frequency: "every3",
        random: Math.random,
        introduced: true,
        quoteIds: [1, 2, 3],
        artworkPath: "/klondike",
      });
      if (!moment) continue;
      expect(moment.kind).not.toBe(last);
      last = moment.kind;
    }
  });

  test("a quote stays at least ten seconds, a breath for two breaths", () => {
    const quote: Moment = { kind: "quote", quoteId: 2 };
    expect(momentDuration(quote)).toBeGreaterThanOrEqual(10000);
    expect(momentDuration({ kind: "breathe" })).toBeGreaterThanOrEqual(24000);
    expect(momentDuration({ kind: "artwork", path: "/klondike" })).toBe(10000);
    expect(momentDuration({ kind: "intro" })).toBeNull();
  });
});
