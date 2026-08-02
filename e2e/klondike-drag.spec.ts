import { expect, test, type Page } from "@playwright/test";

type RenderedCard = {
  rank: string;
  suit: string;
  code: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const rankValues: Record<string, number> = {
  A: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
};

function isRed(suit: string) {
  return suit === "D" || suit === "H";
}

async function getExposedTableauCards(page: Page) {
  const cards = await page.locator("img").evaluateAll((images) => {
    const faceCards = images.flatMap((image) => {
      const source = decodeURIComponent(image.getAttribute("src") ?? "");
      const match = source.match(/\/(10|[2-9AJQK])([CDHS])\.png$/);
      if (!match) return [];

      const rect = image.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 50) return [];
      return [
        {
          rank: match[1],
          suit: match[2],
          code: `${match[1]}${match[2]}`,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      ];
    });

    const topRow = Math.min(...faceCards.map(({ y }) => y));
    const tableauCards = faceCards.filter(
      ({ y, height }) => y > topRow + height,
    );
    const piles = new Map<number, (typeof tableauCards)[number]>();
    for (const card of tableauCards) {
      const exposed = piles.get(card.x);
      if (!exposed || card.y > exposed.y) piles.set(card.x, card);
    }
    return [...piles.values()].sort((left, right) => left.x - right.x);
  });

  return cards as RenderedCard[];
}

test("drags a legal exposed tableau card onto its destination", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let value = 1;
    Math.random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  });
  await page.goto("/klondike");

  await expect
    .poll(async () => (await getExposedTableauCards(page)).length)
    .toBe(7);
  const before = await getExposedTableauCards(page);
  const move = before
    .flatMap((source) => before.map((destination) => ({ source, destination })))
    .find(
      ({ source, destination }) =>
        source.x !== destination.x &&
        isRed(source.suit) !== isRed(destination.suit) &&
        rankValues[source.rank] + 1 === rankValues[destination.rank],
    );

  expect(move, "seeded deal must expose a legal tableau move").toBeDefined();
  const { source, destination } = move!;
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect
    .poll(async () => {
      const after = await getExposedTableauCards(page);
      return after.find(({ x }) => x === destination.x)?.code;
    })
    .toBe(source.code);
  const after = await getExposedTableauCards(page);
  expect(after.find(({ x }) => x === source.x)?.code).not.toBe(source.code);
});
