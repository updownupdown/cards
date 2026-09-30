import Matter from "matter-js";
import { randomCard, type PlayingCard } from "../engine/cards";
import { PointerTrack } from "../engine/pointer";
import { clamp } from "../engine/stage";
import type { WorldTouch } from "../engine/touch";

// Shuffleboard: slide cards up a long table into the scoring zones at the
// far end, four cards a round, on a different surface each round.
//
// Seen from above, with no gravity. Matter handles the cards knocking into
// each other; the surface's friction is applied here, each step, as a steady
// braking (so cards slow smoothly and stop, as they do on a table) that is
// stronger across a card than along it: a card sliding at an angle to the
// way it's pointing drifts round towards it. Rubbing the table just ahead of
// a sliding card ("sweeping", as in curling) eases the friction under it.

export const CARD_W = 30;
export const CARD_H = 42;
export const CARDS_PER_ROUND = 4;

export type Surface = "felt" | "mahogany" | "slate";
export const SURFACES: Surface[] = ["felt", "mahogany", "slate"];
/** Braking along a card, in units a second per second. */
const FRICTION: Record<Surface, number> = { felt: 420, mahogany: 240, slate: 115 };
/** Sideways, a card grips this much harder than along its length. */
const ACROSS_GRIP = 1.9;
const SPIN_DAMPING = 2.2;
/** Card speed (units a second) per finger speed (units a millisecond). */
const THROW_SCALE = 650;
const MAX_THROW_SPEED = 1150;
/** Sweeping at its hardest takes off this share of the friction. */
const SWEEP_EASE = 0.35;
/** Units rubbed (recently) for the hardest sweep. */
const FULL_SWEEP = 140;
const SWEEP_FADE = 3;
const STOPPED_SPEED = 3;

/** The zones at the far end, measured from the end of the table. */
export const ZONES = [
  { points: 4, from: 0, to: 34 },
  { points: 3, from: 34, to: 100 },
  { points: 2, from: 100, to: 175 },
  { points: 1, from: 175, to: 255 },
];

export type SlidingCard = {
  id: number;
  face: PlayingCard;
  body: Matter.Body;
  state: "sliding" | "stopped" | "gutter" | "off";
  /** How hard it's being swept, easing off when the rubbing stops. */
  sweep: number;
};

export type SweepMark = { x1: number; y1: number; x2: number; y2: number; age: number };

export type ShuffleboardEvent =
  | { type: "slide" }
  | { type: "sweep" }
  | { type: "knock" }
  | { type: "gutter" }
  | { type: "stopped"; points: number }
  | { type: "roundOver"; points: number; round: number }
  | { type: "newRound"; surface: Surface };

let nextId = 1;

export class ShuffleboardGame {
  readonly W: number;
  readonly H: number;
  readonly engine: Matter.Engine;
  /** The table: its sides, its far end (top) and where the player stands. */
  readonly lane: { left: number; right: number; end: number; start: number };
  /** Cards must be let go before this line. */
  readonly foulY: number;
  readonly home: { x: number; y: number };
  round = 1;
  surface: Surface = "felt";
  cards: SlidingCard[] = [];
  thrownThisRound = 0;
  score = 0;
  roundPoints = 0;
  /** The card waiting at the start, and the finger holding it. */
  waiting: { face: PlayingCard; x: number; y: number } | null;
  held: { pointerId: number; track: PointerTrack; grabX: number; grabY: number } | null =
    null;
  sweepers = new Map<number, PointerTrack>();
  marks: SweepMark[] = [];
  /** Counting down to the next round once this one is scored. */
  private nextRoundIn: number | null = null;
  onEvent: (event: ShuffleboardEvent) => void = () => {};

  constructor(W: number, H: number, top: number, bottom: number) {
    this.W = W;
    this.H = H;
    this.lane = { left: W / 2 - 118, right: W / 2 + 118, end: top + 26, start: bottom - 12 };
    this.foulY = bottom - 150;
    this.home = { x: W / 2, y: bottom - 72 };
    this.waiting = { face: randomCard(), ...this.home };

    this.engine = Matter.Engine.create();
    this.engine.gravity.y = 0;
    Matter.Events.on(this.engine, "collisionStart", () =>
      this.onEvent({ type: "knock" }),
    );
  }

  zoneAt(y: number) {
    const fromEnd = y - this.lane.end;
    return ZONES.find((zone) => fromEnd >= zone.from && fromEnd < zone.to) ?? null;
  }

  pointsFor(card: SlidingCard) {
    if (card.state !== "stopped") return 0;
    return this.zoneAt(card.body.position.y)?.points ?? 0;
  }

  // ========== Throwing ========== //

  touchStart(touch: WorldTouch) {
    const waiting = this.waiting;
    if (
      waiting &&
      !this.held &&
      Math.abs(touch.x - waiting.x) < CARD_W &&
      Math.abs(touch.y - waiting.y) < CARD_H
    ) {
      this.held = {
        pointerId: touch.id,
        track: new PointerTrack(touch.x, touch.y, touch.t),
        grabX: touch.x - waiting.x,
        grabY: touch.y - waiting.y,
      };
      return;
    }
    // Anywhere else, while a card slides, is sweeping.
    this.sweepers.set(touch.id, new PointerTrack(touch.x, touch.y, touch.t));
  }

  touchMove(touch: WorldTouch) {
    const held = this.held;
    if (held && held.pointerId === touch.id && this.waiting) {
      held.track.add(touch.x, touch.y, touch.t);
      this.waiting.x = clamp(
        touch.x - held.grabX,
        this.lane.left + CARD_W / 2,
        this.lane.right - CARD_W / 2,
      );
      this.waiting.y = Math.max(touch.y - held.grabY, this.foulY);
      if (touch.y - held.grabY < this.foulY) this.release(touch);
      return;
    }
    const sweeper = this.sweepers.get(touch.id);
    if (!sweeper) return;
    const last = sweeper.last;
    sweeper.add(touch.x, touch.y, touch.t);
    this.sweep(last.x, last.y, touch.x, touch.y);
  }

  touchEnd(touch: WorldTouch, cancelled: boolean) {
    this.sweepers.delete(touch.id);
    if (this.held?.pointerId !== touch.id) return;
    if (cancelled) {
      this.held = null;
      if (this.waiting) Object.assign(this.waiting, this.home);
      return;
    }
    this.release(touch);
  }

  private release(touch: WorldTouch) {
    const held = this.held;
    const waiting = this.waiting;
    this.held = null;
    if (!held || !waiting) return;
    const stopped = held.track.stoppedBy(touch.t);
    held.track.add(touch.x, touch.y, touch.t);
    const { vx, vy } = held.track.velocity(90);
    const speed = Math.hypot(vx, vy);
    // Only a push up the table sends the card; anything else sets it back.
    if (stopped || vy > -0.15 || speed < 0.2) {
      Object.assign(waiting, this.home);
      return;
    }
    const cardSpeed = Math.min(MAX_THROW_SPEED, speed * THROW_SCALE);
    // Pushed off-centre, it spins: the grab point's lever on the push.
    const lever = (held.grabX * vy - held.grabY * vx) / (speed || 1);
    this.slide(waiting.x, waiting.y, (vx / speed) * cardSpeed, (vy / speed) * cardSpeed, -lever * 0.35);
  }

  /** Sends a card up the table; velocities in units a second. */
  slide(x: number, y: number, vx: number, vy: number, spin = 0, angle = 0) {
    const face = this.waiting?.face ?? randomCard();
    this.waiting = null;
    const body = Matter.Bodies.rectangle(x, y, CARD_W, CARD_H, {
      frictionAir: 0,
      friction: 0.05,
      restitution: 0.35,
      density: 0.002,
      angle,
      label: "card",
    });
    Matter.Body.setVelocity(body, { x: vx / 60, y: vy / 60 });
    Matter.Body.setAngularVelocity(body, spin / 60);
    Matter.Composite.add(this.engine.world, body);
    const card: SlidingCard = { id: nextId++, face, body, state: "sliding", sweep: 0 };
    this.cards.push(card);
    this.thrownThisRound += 1;
    this.onEvent({ type: "slide" });
    return card;
  }

  /** A stroke of the finger: it sweeps any sliding card it passes ahead of. */
  private sweep(x1: number, y1: number, x2: number, y2: number) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 0.5) return;
    let swept = false;
    for (const card of this.cards) {
      if (card.state !== "sliding") continue;
      const { x, y } = card.body.position;
      const { x: vx, y: vy } = card.body.velocity;
      const speed = Math.hypot(vx, vy);
      if (speed < 0.05) continue;
      // Measured along the card's path: just ahead of it, and near its line.
      const dx = x2 - x;
      const dy = y2 - y;
      const ahead = (dx * vx + dy * vy) / speed;
      const aside = Math.abs(dx * vy - dy * vx) / speed;
      if (ahead > 10 && ahead < 190 && aside < 70) {
        card.sweep += length;
        swept = true;
      }
    }
    this.marks.push({ x1, y1, x2, y2, age: 0 });
    if (swept) this.onEvent({ type: "sweep" });
  }

  // ========== Stepping ========== //

  step(dt: number) {
    const seconds = dt / 1000;
    const friction = FRICTION[this.surface];

    for (const card of this.cards) {
      if (card.state !== "sliding") continue;
      const body = card.body;
      card.sweep *= Math.exp(-SWEEP_FADE * seconds);
      const ease = 1 - SWEEP_EASE * clamp(card.sweep / FULL_SWEEP, 0, 1);

      // Braking, split along and across the card.
      const along = { x: -Math.sin(body.angle), y: Math.cos(body.angle) };
      const vx = body.velocity.x * 60;
      const vy = body.velocity.y * 60;
      let vAlong = vx * along.x + vy * along.y;
      let vAcross = vx * along.y - vy * along.x;
      vAlong = brake(vAlong, friction * ease * seconds);
      vAcross = brake(vAcross, friction * ACROSS_GRIP * ease * seconds);
      const nx = vAlong * along.x + vAcross * along.y;
      const ny = vAlong * along.y - vAcross * along.x;
      Matter.Body.setVelocity(body, { x: nx / 60, y: ny / 60 });
      Matter.Body.setAngularVelocity(
        body,
        body.angularVelocity * Math.exp(-SPIN_DAMPING * seconds),
      );
    }

    Matter.Engine.update(this.engine, dt);

    for (const card of this.cards) {
      if (card.state !== "sliding") continue;
      const { x, y } = card.body.position;
      const speed = Math.hypot(card.body.velocity.x, card.body.velocity.y) * 60;
      if (y < this.lane.end - 4) {
        this.drop(card, "off");
      } else if (x < this.lane.left + 4 || x > this.lane.right - 4) {
        this.drop(card, "gutter");
        this.onEvent({ type: "gutter" });
      } else if (speed < STOPPED_SPEED && Math.abs(card.body.angularVelocity) < 0.002) {
        card.state = "stopped";
        Matter.Body.setVelocity(card.body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(card.body, 0);
        this.onEvent({ type: "stopped", points: this.pointsFor(card) });
      }
    }
    // A stopped card knocked by another slides again.
    for (const card of this.cards) {
      if (card.state === "stopped" && Math.hypot(card.body.velocity.x, card.body.velocity.y) * 60 > STOPPED_SPEED * 2) {
        card.state = "sliding";
      }
    }

    for (const mark of this.marks) mark.age += dt;
    this.marks = this.marks.filter((mark) => mark.age < 1200);

    this.advance(dt);
  }

  private drop(card: SlidingCard, state: "gutter" | "off") {
    card.state = state;
    Matter.Composite.remove(this.engine.world, card.body);
  }

  /** The next card once all have stopped; the next round after the fourth. */
  private advance(dt: number) {
    const moving = this.cards.some((card) => card.state === "sliding");
    if (this.nextRoundIn !== null) {
      this.nextRoundIn -= dt;
      if (this.nextRoundIn <= 0) this.startRound(this.round + 1);
      return;
    }
    if (moving || this.waiting || this.held) return;
    if (this.thrownThisRound < CARDS_PER_ROUND) {
      this.waiting = { face: randomCard(), ...this.home };
      return;
    }
    this.roundPoints = this.cards.reduce((sum, card) => sum + this.pointsFor(card), 0);
    this.score += this.roundPoints;
    this.onEvent({ type: "roundOver", points: this.roundPoints, round: this.round });
    this.nextRoundIn = 2200;
  }

  startRound(round: number) {
    Matter.Composite.clear(this.engine.world, false);
    this.cards = [];
    this.round = round;
    this.surface = SURFACES[(round - 1) % SURFACES.length];
    this.thrownThisRound = 0;
    this.nextRoundIn = null;
    this.waiting = { face: randomCard(), ...this.home };
    this.onEvent({ type: "newRound", surface: this.surface });
  }
}

/** Slows `speed` towards zero by `amount`, never past it. */
function brake(speed: number, amount: number) {
  if (Math.abs(speed) <= amount) return 0;
  return speed - Math.sign(speed) * amount;
}
