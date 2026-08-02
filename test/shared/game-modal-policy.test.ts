import { shouldReloadGameAfterSettingChange } from "../../src/components/Modals/game-modal-policy";

describe("game modal setting policy", () => {
  test("reloads when a next-game setting changes", () => {
    expect(
      shouldReloadGameAfterSettingChange("easy", "hard", "next-game"),
    ).toBe(true);
  });

  test("does not reload for immediate or unchanged settings", () => {
    expect(
      shouldReloadGameAfterSettingChange("easy", "hard", "immediate"),
    ).toBe(false);
    expect(
      shouldReloadGameAfterSettingChange("easy", "easy", "next-game"),
    ).toBe(false);
    expect(shouldReloadGameAfterSettingChange(false, true, undefined)).toBe(
      false,
    );
  });
});
