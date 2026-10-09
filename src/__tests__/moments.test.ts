import { describe, expect, test } from "@jest/globals";
import settingsEn from "@/locales/en/settings.json";
import {
  DEFAULT_MOMENT_SETTINGS,
  MOMENT_KINDS,
  momentChance,
  parseMomentSettings,
  rollMoment,
  type Moment,
} from "@/data/moments";
import { momentDuration } from "@/components/Moments/MomentOverlay";

const always = () => 0;
const every = (n: number) => ({ enabled: true, every: n });

describe("Quiet moments", () => {
  test("every kind has a name in the settings", () => {
    for (const kind of MOMENT_KINDS) {
      expect(settingsEn.moments.preview[kind]).toBeTruthy();
    }
    expect(settingsEn.moments.every).toContain("{{count}}");
    expect(settingsEn.moments.everyGame).toBeTruthy();
  });

  test("never comes when turned off, and comes about once in N games", () => {
    const off = { enabled: false, every: 3 };
    expect(rollMoment({ settings: off, random: always })).toBeNull();
    expect(momentChance(every(3))).toBeCloseTo(1 / 3);
    expect(momentChance(every(15))).toBeCloseTo(1 / 15);
    // At 1, every win: whatever is rolled.
    expect(
      rollMoment({
        settings: every(1),
        random: () => 0.999,
        introduced: false,
      }),
    ).not.toBeNull();
    const roll = (n: number, value: number) =>
      rollMoment({ settings: every(n), random: () => value, introduced: true });
    expect(roll(5, 0.15)).not.toBeNull();
    expect(roll(10, 0.15)).toBeNull();
  });

  test("defaults to on, about every three games", () => {
    expect(DEFAULT_MOMENT_SETTINGS).toEqual({ enabled: true, every: 3 });
    expect(parseMomentSettings(null)).toBeNull();
    expect(parseMomentSettings("frequent")).toBeNull();
  });

  test("reads a saved choice, kept between 1 and 15", () => {
    const saved = (value: unknown) =>
      parseMomentSettings(JSON.stringify(value));
    expect(saved({ enabled: false, every: 9 })).toEqual({
      enabled: false,
      every: 9,
    });
    expect(saved({ enabled: true, every: 40 })?.every).toBe(15);
    expect(saved({ enabled: true, every: 0 })?.every).toBe(1);
    // The one-word choices from before the slider.
    expect(parseMomentSettings("off")?.enabled).toBe(false);
    expect(parseMomentSettings("every10")).toEqual(every(10));
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
        settings: every(3),
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
        settings: every(3),
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
        settings: every(3),
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
