import { expect, test } from "@playwright/test";

const games = [
  ["Golf", "/golf"],
  ["Beleaguered Castle", "/beleaguered-castle"],
  ["Black Hole", "/black-hole"],
  ["Baroness", "/baroness"],
  ["Osmosis", "/osmosis"],
  ["Sir Tommy", "/sir-tommy"],
  ["Nestor", "/nestor"],
] as const;

test.describe("setup-sensitive outcomes", () => {
  test.describe.configure({ mode: "serial" });

  for (const [title, route] of games) {
    test(`${title} does not open in a terminal state`, async ({ page }) => {
      await page.addInitScript(() => {
        let value = 1;
        Math.random = () => {
          value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
          return value / 4294967296;
        };
      });

      await page.goto(route);
      await expect(page).toHaveTitle(new RegExp(`^${title}`));
      await expect(page.locator("img").first()).toBeVisible();
      await expect(page.getByText("You won!", { exact: true })).toHaveCount(0);
      await expect(page.getByText("You lost", { exact: true })).toHaveCount(0);
    });
  }
});
