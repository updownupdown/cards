import { describe, expect, test } from "@jest/globals";
import en from "@/locales/en/game.json";
import settingsEn from "@/locales/en/settings.json";
import {
  MOMENT_CHANCE,
  MOMENTS,
  parseMomentFrequency,
  rollMoment,
} from "@/data/moments";

describe("Quiet moments", () => {
  test("every moment has its words, or a name to preview it by", () => {
    for (const moment of MOMENTS) {
      if (moment.kind === "words") {
        expect(
          en.moments.lines[moment.id as keyof typeof en.moments.lines],
        ).toBeTruthy();
      } else {
        expect(
          settingsEn.moments.preview[
            moment.kind as keyof typeof settingsEn.moments.preview
          ],
        ).toBeTruthy();
      }
    }
  });

  test("never comes when off, and comes as often as chosen", () => {
    expect(rollMoment("off", () => 0)).toBeNull();
    expect(MOMENT_CHANCE.infrequent).toBeLessThan(MOMENT_CHANCE.frequent);
    expect(rollMoment("infrequent", () => 0.2)).toBeNull();
    expect(rollMoment("frequent", () => 0.2)).not.toBeNull();
  });

  test("never shows the same moment twice running", () => {
    let last: string | null = null;
    for (let i = 0; i < 200; i += 1) {
      const moment = rollMoment("frequent", () => (i % 7) / 7 / 3);
      if (!moment) continue;
      expect(moment.id).not.toBe(last);
      last = moment.id;
    }
  });

  test("reads an unknown saved value as the default", () => {
    expect(parseMomentFrequency(null)).toBe("infrequent");
    expect(parseMomentFrequency("often")).toBe("infrequent");
    expect(parseMomentFrequency("off")).toBe("off");
  });
});
