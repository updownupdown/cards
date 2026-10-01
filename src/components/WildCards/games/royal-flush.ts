import Matter from "matter-js";
import { shuffledDeck, type PlayingCard } from "../engine/cards";
import { clamp, random } from "../engine/stage";
import type { WorldTouch } from "../engine/touch";

// Royal Flush: a carnival stall. Cards ride two conveyor belts, clipped on
// by their bottom edge; a marble shot from a slingshot knocks one off, and it
// drops onto a plate sliding from one side of the stall to the other below.
// The plate collects a hand of five: a flush, a straight or a full house
// scores, and a plate whose cards can no longer make any of them dumps them.
//
// The marble and the belt cards are Matter bodies (the belt cards static,
// moved along each step, until the marble hits one). A card knocked off
// falls freely until it reaches a plate or the floor.

export const CARD_W = 34;
export const CARD_H = 48;
export const MARBLE_RADIUS = 7;
export const PLATE_WIDTH = 104;
export const PLATE_SLOTS = 5;
const BELT_SPEEDS = [42, 58];
const BELT_GAP = [78, 112];
const PLATE_SPEED = 32;
/** Where a card's clip holds it, above the belt. */
export const CLIP_HEIGHT = 6;
export const MAX_PULL = 110;
const MIN_PULL = 16;
/** Marble speed (units a step) at full pull. */
const LAUNCH_SPEED = 25;
/** How long a plate blinks before it pays out or dumps its cards. */
export const BLINK_MS = 1300;

const CATEGORY_MARBLE = 0x0002;
const CATEGORY_BELT_CARD = 0x0004;

export type HandName =
  | "straight"
  | "flush"
  | "fullHouse"
  | "straightFlush"
  | "royalFlush";

export const HAND_POINTS: Record<HandName, number> = {
  straight: 20,
  flush: 25,
  fullHouse: 35,
  straightFlush: 100,
  royalFlush: 250,
};

// ========== Hands ========== //

/** Ranks with the ace both low (1) and high (14). */
const withHighAce = (ranks: number[]) =>
  ranks.includes(1) ? [...ranks, 14] : ranks;

function straightRanks(cards: PlayingCard[]) {
  const ranks = new Set(withHighAce(cards.map((c) => c.rank)));
  for (let top = 14; top >= 5; top--) {
    let run = true;
    for (let rank = top - 4; rank <= top; rank++) {
      if (!ranks.has(rank)) run = false;
    }
    if (run) return top;
  }
  return null;
}

/** The best hand among any five of `cards`, if they hold one. */
export function bestHand(cards: PlayingCard[]): HandName | null {
  if (cards.length < 5) return null;
  let best: HandName | null = null;
  const better = (hand: HandName) => {
    if (!best || HAND_POINTS[hand] > HAND_POINTS[best]) best = hand;
  };
  for (const suit of ["S", "H", "D", "C"] as const) {
    const suited = cards.filter((c) => c.suit === suit);
    if (suited.length >= 5) {
      const top = straightRanks(suited);
      if (top === 14) better("royalFlush");
      else if (top !== null) better("straightFlush");
      else better("flush");
    }
  }
  if (straightRanks(cards) !== null) better("straight");
  const counts = rankCounts(cards);
  if (counts[0] >= 3 && counts[1] >= 2) better("fullHouse");
  return best;
}

function rankCounts(cards: PlayingCard[]) {
  const counts = new Map<number, number>();
  for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  return [...counts.values(), 0, 0].sort((a, b) => b - a);
}

/**
 * Whether `cards` can still become a flush, a straight or a full house with
 * the plate's remaining room.
 */
export function canStillScore(cards: PlayingCard[], slots = PLATE_SLOTS) {
  const room = slots - cards.length;
  if (room < 0) return false;
  if (bestHand(cards)) return true;
  // Flush.
  const suits = new Map<string, number>();
  for (const card of cards) suits.set(card.suit, (suits.get(card.suit) ?? 0) + 1);
  if (Math.max(0, ...suits.values()) + room >= 5) return true;
  // Straight: some run of five with enough of it already there.
  const ranks = new Set(withHighAce(cards.map((c) => c.rank)));
  for (let top = 5; top <= 14; top++) {
    let have = 0;
    for (let rank = top - 4; rank <= top; rank++) if (ranks.has(rank)) have += 1;
    if (have + room >= 5) return true;
  }
  // Full house.
  const [first, second] = rankCounts(cards);
  return Math.max(0, 3 - first) + Math.max(0, 2 - second) <= room;
}

// ========== The stall ========== //

export type BeltCard = {
  id: number;
  face: PlayingCard;
  body: Matter.Body;
  belt: number;
  /** Knocked off: falling (or dropping onto a plate). */
  falling: boolean;
  /** Landed on a plate: it's the plate's now. */
  caught: boolean;
};

export type Plate = {
  x: number;
  y: number;
  direction: 1 | -1;
  speed: number;
  minX: number;
  maxX: number;
  cards: PlayingCard[];
  /** Blinking before paying out (a hand) or dumping (null). */
  verdict: { hand: HandName | null; at: number } | null;
};

export type Marble = { id: number; body: Matter.Body };

export type Spilled = {
  id: number;
  face: PlayingCard;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
};

export type RoyalFlushEvent =
  | { type: "stretch"; notch: number }
  | { type: "shoot" }
  | { type: "knock" }
  | { type: "caught"; plate: number }
  | { type: "hand"; plate: number; hand: HandName; points: number }
  | { type: "bust"; plate: number };

let nextId = 1;

export class RoyalFlushGame {
  readonly W: number;
  readonly H: number;
  readonly engine: Matter.Engine;
  readonly beltYs: number[];
  readonly plateY: number;
  readonly displayY: number;
  readonly sling: { x: number; y: number; forkHalf: number };
  cards: BeltCard[] = [];
  marbles: Marble[] = [];
  plates: Plate[];
  spilled: Spilled[] = [];
  /** The pouch while it's being pulled back. */
  pull: { pointerId: number; x: number; y: number; notch: number } | null = null;
  score = 0;
  time = 0;
  private deck: PlayingCard[] = shuffledDeck();
  private beltTimers = [0, 0];
  onEvent: (event: RoyalFlushEvent) => void = () => {};

  constructor(W: number, H: number, top: number, bottom: number) {
    this.W = W;
    this.H = H;
    const span = bottom - top;
    // The belts themselves: cards stand on them, clipped by their bottom.
    this.beltYs = [0.17, 0.33].map((k) => top + span * k);
    this.plateY = top + span * 0.53;
    this.displayY = top + span * 0.61;
    this.sling = { x: W / 2, y: top + span * 0.8, forkHalf: 30 };
    // One plate, from one edge of the stall to the other.
    this.plates = [
      {
        x: W / 2,
        direction: 1,
        speed: PLATE_SPEED,
        y: this.plateY,
        minX: PLATE_WIDTH / 2 + 8,
        maxX: W - PLATE_WIDTH / 2 - 8,
        cards: [],
        verdict: null,
      },
    ];

    this.engine = Matter.Engine.create();
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) this.onCollision(pair);
    });

    // Belts start full.
    this.beltYs.forEach((_, belt) => {
      for (let x = 30; x < W; x += random(BELT_GAP[0], BELT_GAP[1])) {
        this.addBeltCard(belt, belt % 2 === 0 ? x : W - x);
      }
    });
  }

  private draw() {
    if (this.deck.length === 0) this.deck = shuffledDeck();
    return this.deck.pop()!;
  }

  private beltDirection(belt: number) {
    return Math.sign(beltVelocity(belt));
  }

  /** Where a card on `belt` rides: standing on it, held by its clip. */
  cardY(belt: number) {
    return this.beltYs[belt] - CLIP_HEIGHT - CARD_H / 2;
  }

  private addBeltCard(belt: number, x: number) {
    const body = Matter.Bodies.rectangle(x, this.cardY(belt), CARD_W, CARD_H, {
      density: 0.004,
      frictionAir: 0.01,
      restitution: 0.2,
      collisionFilter: { category: CATEGORY_BELT_CARD, mask: CATEGORY_MARBLE },
      label: "beltCard",
    });
    Matter.Body.setStatic(body, true);
    Matter.Composite.add(this.engine.world, body);
    this.cards.push({
      id: nextId++,
      face: this.draw(),
      body,
      belt,
      falling: false,
      caught: false,
    });
  }

  // ========== Slingshot ========== //

  get pouch() {
    return this.pull ?? { x: this.sling.x, y: this.sling.y + 4 };
  }

  touchStart(touch: WorldTouch) {
    if (this.pull) return;
    if (Math.hypot(touch.x - this.sling.x, touch.y - this.sling.y) > 70) return;
    this.pull = { pointerId: touch.id, x: this.sling.x, y: this.sling.y + 4, notch: 0 };
    this.touchMove(touch);
  }

  touchMove(touch: WorldTouch) {
    const pull = this.pull;
    if (!pull || pull.pointerId !== touch.id) return;
    let dx = touch.x - this.sling.x;
    let dy = touch.y - this.sling.y;
    const length = Math.hypot(dx, dy);
    if (length > MAX_PULL) {
      dx *= MAX_PULL / length;
      dy *= MAX_PULL / length;
    }
    pull.x = this.sling.x + dx;
    pull.y = this.sling.y + dy;
    // The band gets stiffer as it stretches: its notches come closer together.
    const notch = stretchNotch(Math.min(length, MAX_PULL));
    if (notch > pull.notch) this.onEvent({ type: "stretch", notch });
    pull.notch = notch;
  }

  touchEnd(touch: WorldTouch, cancelled: boolean) {
    const pull = this.pull;
    if (!pull || pull.pointerId !== touch.id) return;
    this.pull = null;
    if (cancelled) return;
    const dx = this.sling.x - pull.x;
    const dy = this.sling.y - pull.y;
    const length = Math.hypot(dx, dy);
    if (length < MIN_PULL) return;
    this.shoot(pull.x, pull.y, launchVelocity(dx, dy));
  }

  shoot(x: number, y: number, velocity: Matter.Vector) {
    const body = Matter.Bodies.circle(x, y, MARBLE_RADIUS, {
      density: 0.004,
      frictionAir: 0,
      restitution: 0.5,
      collisionFilter: { category: CATEGORY_MARBLE, mask: CATEGORY_BELT_CARD },
      label: "marble",
    });
    Matter.Body.setVelocity(body, velocity);
    Matter.Composite.add(this.engine.world, body);
    this.marbles.push({ id: nextId++, body });
    this.onEvent({ type: "shoot" });
  }

  /** Where a marble let go from the pouch now would fly: points along it. */
  aimLine(steps = 30) {
    const pull = this.pull;
    if (!pull) return [];
    const dx = this.sling.x - pull.x;
    const dy = this.sling.y - pull.y;
    if (Math.hypot(dx, dy) < MIN_PULL) return [];
    const velocity = launchVelocity(dx, dy);
    const gravity = this.engine.gravity.y * this.engine.gravity.scale * 16.67 * 16.67;
    const points: { x: number; y: number }[] = [];
    let { x, y } = pull;
    let { x: vx, y: vy } = velocity;
    for (let i = 1; i <= steps; i++) {
      vy += gravity;
      x += vx;
      y += vy;
      if (i % 2 === 0) points.push({ x, y });
    }
    return points;
  }

  // ========== Hits ========== //

  private onCollision(pair: Matter.Pair) {
    const card = this.cards.find(
      (c) => (c.body === pair.bodyA || c.body === pair.bodyB) && !c.falling,
    );
    if (!card) return;
    card.falling = true;
    Matter.Body.setStatic(card.body, false);
    // Knocked loose now, so the marble pushes it rather than bouncing off.
    pair.inverseMass =
      pair.collision.parentA.inverseMass + pair.collision.parentB.inverseMass;
    Matter.Body.setAngularVelocity(card.body, random(-0.06, 0.06));
    this.onEvent({ type: "knock" });
  }

  // ========== Stepping ========== //

  step(dt: number) {
    this.time += dt;
    const seconds = dt / 1000;

    // Belts: cards ride along and off the end; new ones come on.
    for (const card of this.cards) {
      if (card.falling) continue;
      const speed = BELT_SPEEDS[card.belt] * this.beltDirection(card.belt);
      Matter.Body.setPosition(card.body, {
        x: card.body.position.x + speed * seconds,
        y: this.cardY(card.belt),
      });
    }
    this.beltTimers = this.beltTimers.map((timer, belt) => {
      const next = timer - dt;
      const onBelt = this.cards.filter((c) => c.belt === belt && !c.falling);
      const direction = this.beltDirection(belt);
      const entry = direction > 0 ? -CARD_W : this.W + CARD_W;
      const nearest = onBelt.reduce(
        (closest, c) => Math.min(closest, Math.abs(c.body.position.x - entry)),
        Infinity,
      );
      if (next <= 0 && nearest > BELT_GAP[0]) {
        this.addBeltCard(belt, entry);
        return (random(BELT_GAP[0], BELT_GAP[1]) / BELT_SPEEDS[belt]) * 1000;
      }
      return next;
    });

    // The plate slides back and forth.
    for (const plate of this.plates) {
      plate.x += plate.direction * plate.speed * seconds;
      if (plate.x > plate.maxX) plate.direction = -1;
      if (plate.x < plate.minX) plate.direction = 1;
      plate.x = clamp(plate.x, plate.minX, plate.maxX);
    }

    const previous = new Map(this.cards.map((c) => [c.id, c.body.position.y]));
    Matter.Engine.update(this.engine, dt);

    // Falling cards land on a plate they come down onto, at least half of
    // them over it; anything less glances off and falls past.
    for (const card of this.cards) {
      if (!card.falling) continue;
      const before = previous.get(card.id) ?? card.body.position.y;
      const { x, y } = card.body.position;
      if (before < this.plateY - 6 && y >= this.plateY - 6 && card.body.velocity.y > 0) {
        const index = this.plates.findIndex(
          (plate) => !plate.verdict && landsOn(x, plate.x),
        );
        if (index >= 0) this.catchCard(card, index);
      }
    }

    this.cards = this.cards.filter((card) => {
      const { x, y } = card.body.position;
      const gone =
        y > this.H + 80 ||
        (!card.falling && (x < -CARD_W * 2 || x > this.W + CARD_W * 2));
      if (gone) Matter.Composite.remove(this.engine.world, card.body);
      return !gone && !card.caught;
    });
    this.marbles = this.marbles.filter((marble) => {
      const { x, y } = marble.body.position;
      const gone = y > this.H + 40 || y < -200 || x < -40 || x > this.W + 40;
      if (gone) Matter.Composite.remove(this.engine.world, marble.body);
      return !gone;
    });

    // Plates that have blinked long enough pay out or dump their cards.
    for (const plate of this.plates) {
      if (!plate.verdict || this.time - plate.verdict.at < BLINK_MS) continue;
      if (!plate.verdict.hand) this.spill(plate);
      plate.cards = [];
      plate.verdict = null;
    }

    for (const card of this.spilled) {
      card.vy += 900 * seconds;
      card.x += card.vx * seconds;
      card.y += card.vy * seconds;
      card.angle += card.spin * seconds;
    }
    this.spilled = this.spilled.filter((card) => card.y < this.H + 80);
  }

  private catchCard(card: BeltCard, index: number) {
    const plate = this.plates[index];
    card.caught = true;
    Matter.Composite.remove(this.engine.world, card.body);
    plate.cards.push(card.face);
    this.onEvent({ type: "caught", plate: index });

    const hand = bestHand(plate.cards);
    if (hand) {
      const points = HAND_POINTS[hand];
      this.score += points;
      plate.verdict = { hand, at: this.time };
      this.onEvent({ type: "hand", plate: index, hand, points });
    } else if (!canStillScore(plate.cards)) {
      plate.verdict = { hand: null, at: this.time };
      this.onEvent({ type: "bust", plate: index });
    }
  }

  /** A bust plate tips its cards off. */
  private spill(plate: Plate) {
    plate.cards.forEach((face, i) => {
      this.spilled.push({
        id: nextId++,
        face,
        x: plate.x + (i - plate.cards.length / 2) * 8,
        y: plate.y - 6,
        vx: plate.direction * random(40, 120),
        vy: random(-160, -60),
        angle: 0,
        spin: random(-6, 6),
      });
    });
  }
}

/** Whether a card coming down with its middle at `x` is at least half on a plate. */
export const landsOn = (x: number, plateX: number) =>
  Math.abs(x - plateX) <= PLATE_WIDTH / 2;

/** A belt's speed, units a second: alternate belts run opposite ways. */
export const beltVelocity = (belt: number) =>
  BELT_SPEEDS[belt] * (belt % 2 === 0 ? 1 : -1);

function launchVelocity(dx: number, dy: number) {
  const k = LAUNCH_SPEED / MAX_PULL;
  return { x: dx * k, y: dy * k };
}

/** Notches along the band, closer together the further it's pulled. */
const NOTCHES = [18, 36, 52, 66, 78, 88, 96, 102, 106, 109];
export function stretchNotch(length: number) {
  let notch = 0;
  for (const at of NOTCHES) if (length >= at) notch += 1;
  return notch;
}
