import type { HintTarget } from "./hint";
import type { HintSpot } from "./HintLayer";

type Rect = { x: number; y: number; width: number; height: number };

type PlacedCard = {
  card: { id: string };
  x: number;
  y: number;
  zIndex: number;
  zoneId: string;
};

type Board = {
  cards: PlacedCard[];
  /** The zone's rect on the board, if it's on it. */
  getZoneRect: (zoneId: string) => Rect | null;
  cardWidth: number;
  cardHeight: number;
};

const SAMPLE_COLS = 5;
const SAMPLE_ROWS = 9;

function covers(card: PlacedCard, x: number, y: number, board: Board) {
  return (
    x >= card.x &&
    x <= card.x + board.cardWidth &&
    y >= card.y &&
    y <= card.y + board.cardHeight
  );
}

/**
 * The middle of the part of a card the player can see: its centre when
 * nothing lies on it, else the uncovered point nearest the middle of what
 * shows (the strip of a card in a fanned pile).
 */
export function visibleCardCenter(card: PlacedCard, board: Board) {
  const { cardWidth: width, cardHeight: height } = board;
  const center = { x: card.x + width / 2, y: card.y + height / 2 };
  const above = board.cards.filter(
    (other) =>
      other !== card &&
      other.zIndex > card.zIndex &&
      other.x < card.x + width &&
      other.x + width > card.x &&
      other.y < card.y + height &&
      other.y + height > card.y,
  );
  if (above.length === 0) return center;

  const open: { x: number; y: number }[] = [];
  for (let row = 0; row < SAMPLE_ROWS; row += 1) {
    for (let col = 0; col < SAMPLE_COLS; col += 1) {
      const x = card.x + ((col + 0.5) / SAMPLE_COLS) * width;
      const y = card.y + ((row + 0.5) / SAMPLE_ROWS) * height;
      if (!above.some((other) => covers(other, x, y, board))) {
        open.push({ x, y });
      }
    }
  }
  if (open.length === 0) return center;

  const mean = {
    x: open.reduce((sum, point) => sum + point.x, 0) / open.length,
    y: open.reduce((sum, point) => sum + point.y, 0) / open.length,
  };
  return open.reduce((best, point) =>
    Math.hypot(point.x - mean.x, point.y - mean.y) <
    Math.hypot(best.x - mean.x, best.y - mean.y)
      ? point
      : best,
  );
}

/** Where to draw a hint target on a card map, or null if it isn't there. */
export function locateHintTarget(
  target: HintTarget,
  board: Board,
): HintSpot | null {
  const cardSize = Math.min(board.cardWidth, board.cardHeight);

  if ("card" in target) {
    const card = board.cards.find((placed) => placed.card.id === target.card);
    if (!card) return null;
    return { ...visibleCardCenter(card, board), size: cardSize };
  }

  // A pile shows its top card where the fan puts it; an empty slot or a
  // button's zone, its own rect.
  const zoneCards = board.cards.filter((card) => card.zoneId === target.zone);
  const topCard = zoneCards.reduce<PlacedCard | null>(
    (top, card) => (!top || card.zIndex > top.zIndex ? card : top),
    null,
  );
  if (topCard) {
    return { ...visibleCardCenter(topCard, board), size: cardSize };
  }
  const rect = board.getZoneRect(target.zone);
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    size: Math.min(rect.width, rect.height, board.cardWidth * 1.4),
  };
}
