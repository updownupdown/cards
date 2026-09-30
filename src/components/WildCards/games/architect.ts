import Matter from "matter-js";
import { randomCard, type PlayingCard } from "../engine/cards";
import { angleDelta } from "../engine/pointer";
import { clamp, random } from "../engine/stage";
import type { Tilt } from "../engine/tilt";
import type { WorldTouch } from "../engine/touch";

// Architect: build a house of cards by hand.
//
// Cards come from the tray at the bottom. One finger carries a card, a second
// turns it (pinch and rotate). Walls are two cards leaning together; a floor
// is one card laid flat across the tops of walls.
//
// Easy and Medium snap a card let go near a sensible place into it, and it
// stays put there (a static body). On Easy nothing moves it again; on Medium
// a jolt of the phone (the accelerometer) or a heavy tap near it wears it
// loose, and a card that comes loose brings down what it held up. Hard has no
// snapping and no holding up: every card is a free body under gravity, a
// finger holds it by a spring, and more fingers can hold more cards (or one
// card at two points) while the others are placed. Jolts shake it.

export type Difficulty = "easy" | "medium" | "hard";

export const CARD_LENGTH = 56;
export const CARD_THICKNESS = 8;
const LEAN = (14 * Math.PI) / 180;
const FRAME_HEIGHT = CARD_LENGTH * Math.cos(LEAN);
const LIFT = (CARD_THICKNESS / 2) * Math.sin(LEAN);
/** From a leaning card's centre across to its frame's apex. */
const APEX_OFFSET = CARD_THICKNESS * 0.45 + (CARD_LENGTH / 2) * Math.sin(LEAN);

const SNAP: Record<Difficulty, { radius: number; angle: number } | null> = {
  // Easy ignores the angle: any card near a place goes into it.
  easy: { radius: 62, angle: Math.PI },
  medium: { radius: 34, angle: 0.5 },
  hard: null,
};

/** Jolts the phone may give before a Medium tower starts to wear loose. */
const MEDIUM_JOLT_ALLOWANCE = 0.3;
/** Damage a second per unit of jolt past the allowance. */
const MEDIUM_JOLT_DAMAGE = 2.2;
const HARD_JOLT_FORCE = 0.00035;
/** A tap on the table, near cards, knocks them (by distance). */
const TAP_REACH = 110;

export type ArchitectCard = {
  id: number;
  face: PlayingCard;
  body: Matter.Body;
  /** Placed: static, snapped into place. Loose: a free body. */
  state: "held" | "placed" | "loose";
  kind: "lean" | "floor" | null;
  /** The floor it stands on (null: the table), for a leaning card. */
  base: number | null;
  partner: number | null;
  /** The leaning cards a floor rests on. */
  supports: number[];
  damage: number;
  fallsAt: number | null;
};

type Pose = { x: number; y: number; angle: number };

type Slot = Pose & {
  kind: "lean" | "floor";
  base: number | null;
  partner: number | null;
  supports: number[];
  /** Preferred over a plain slot at the same distance. */
  bonus: number;
};

type Holder = {
  pointerId: number;
  cardId: number;
  /** Easy and Medium: the card follows the finger by this offset. */
  offsetX: number;
  offsetY: number;
  /** Hard: the spring from the finger. */
  spring: Matter.Constraint | null;
};

/** A second finger turning a held card. */
type Turner = {
  pointerId: number;
  cardId: number;
  anchorId: number;
  startFinger: number;
  startCard: number;
};

export type ArchitectEvent =
  | { type: "pick" }
  | { type: "snap" }
  | { type: "drop" }
  | { type: "fall" }
  | { type: "bump" };

let nextId = 1;

export class ArchitectGame {
  readonly W: number;
  readonly H: number;
  readonly engine: Matter.Engine;
  readonly groundY: number;
  readonly trayTop: number;
  readonly table: { left: number; right: number };
  difficulty: Difficulty;
  cards: ArchitectCard[] = [];
  holders: Holder[] = [];
  turners: Turner[] = [];
  /** How steady things are, 0 to 1, for the meter. */
  stability = 1;
  /** A small shake of the view after a jolt or bump. */
  shake = 0;
  time = 0;
  bestHeight = 0;
  private cardsById = new Map<number, ArchitectCard>();
  onEvent: (event: ArchitectEvent) => void = () => {};

  constructor(
    W: number,
    H: number,
    bottom: number,
    difficulty: Difficulty,
    private tilt: { current: Tilt },
  ) {
    this.W = W;
    this.H = H;
    this.difficulty = difficulty;
    this.trayTop = bottom - 110;
    this.groundY = this.trayTop - 16;
    this.table = { left: 16, right: W - 16 };
    this.engine = Matter.Engine.create({
      enableSleeping: true,
      positionIterations: 10,
      velocityIterations: 8,
    });
    const table = Matter.Bodies.rectangle(W / 2, this.groundY + 100, W * 3, 200, {
      isStatic: true,
      friction: 1,
      label: "table",
    });
    Matter.Composite.add(this.engine.world, table);
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const speed = Math.hypot(
          pair.bodyA.velocity.x - pair.bodyB.velocity.x,
          pair.bodyA.velocity.y - pair.bodyB.velocity.y,
        );
        if (speed > 3) this.onEvent({ type: "drop" });
      }
    });
  }

  // ========== Cards ========== //

  private addCard(x: number, y: number, angle: number, dynamic: boolean) {
    const body = Matter.Bodies.rectangle(x, y, CARD_THICKNESS, CARD_LENGTH, {
      angle,
      density: 0.001,
      friction: 0.95,
      frictionStatic: 2,
      frictionAir: 0.02,
      restitution: 0,
      slop: 0.02,
      label: "card",
    });
    if (!dynamic) Matter.Body.setStatic(body, true);
    const card: ArchitectCard = {
      id: nextId++,
      face: randomCard(),
      body,
      state: "held",
      kind: null,
      base: null,
      partner: null,
      supports: [],
      damage: 0,
      fallsAt: null,
    };
    body.plugin = { cardId: card.id };
    this.cards.push(card);
    this.cardsById.set(card.id, card);
    return card;
  }

  card(id: number | null) {
    return id === null ? undefined : this.cardsById.get(id);
  }

  clear() {
    for (const card of this.cards) Matter.Composite.remove(this.engine.world, card.body);
    for (const holder of this.holders) {
      if (holder.spring) Matter.Composite.remove(this.engine.world, holder.spring);
    }
    this.cards = [];
    this.cardsById.clear();
    this.holders = [];
    this.turners = [];
  }

  setDifficulty(difficulty: Difficulty) {
    this.clear();
    this.difficulty = difficulty;
    this.bestHeight = 0;
  }

  /** Cards still up: not lying about on the table. */
  get standing() {
    return this.cards.filter((card) => card.state !== "held" && !this.isFallen(card));
  }

  get fallenCount() {
    return this.cards.filter((card) => card.state === "loose" && this.isFallen(card)).length;
  }

  isFallen(card: ArchitectCard) {
    if (card.state === "placed") return false;
    const flat = Math.abs(Math.abs(angleDelta(0, card.body.angle)) - Math.PI / 2) < 0.35;
    const low = card.body.position.y > this.groundY - CARD_THICKNESS * 1.5;
    return (flat && low) || card.body.position.y > this.H + 50;
  }

  /** The tower's height in storeys: walls counted up from the table. */
  get height() {
    let storeys = 0;
    for (const card of this.standing) {
      const top = card.body.bounds.min.y;
      storeys = Math.max(storeys, Math.round((this.groundY - top) / (FRAME_HEIGHT + CARD_THICKNESS)));
    }
    return storeys;
  }

  // ========== Places to snap to ========== //

  /** Where cards can stand: the table, and the tops of flat cards. */
  private surfaces() {
    const list: { id: number | null; y: number; left: number; right: number }[] = [
      { id: null, y: this.groundY, left: this.table.left, right: this.table.right },
    ];
    for (const card of this.cards) {
      if (card.state !== "placed" || card.kind !== "floor") continue;
      const { x, y } = card.body.position;
      list.push({
        id: card.id,
        y: y - CARD_THICKNESS / 2,
        left: x - CARD_LENGTH / 2 + 4,
        right: x + CARD_LENGTH / 2 - 4,
      });
    }
    return list;
  }

  /** The pose of a leaning card, by the side it leans from and its apex. */
  private leanPose(apexX: number, baseY: number, side: -1 | 1): Pose {
    return {
      x: apexX - side * APEX_OFFSET,
      y: baseY - FRAME_HEIGHT / 2 - LIFT,
      angle: side * LEAN,
    };
  }

  private slotsNear(pose: Pose): Slot[] {
    const slots: Slot[] = [];
    const placed = this.cards.filter((c) => c.state === "placed");
    const surfaces = this.surfaces();

    // Beside a lone leaning card, its partner.
    for (const card of placed) {
      if (card.kind !== "lean" || card.partner !== null) continue;
      const side = card.body.angle > 0 ? 1 : -1;
      const apexX = card.body.position.x + side * APEX_OFFSET;
      const surface = surfaces.find((s) => s.id === card.base);
      if (!surface) continue;
      slots.push({
        ...this.leanPose(apexX, surface.y, side === 1 ? -1 : 1),
        kind: "lean",
        base: card.base,
        partner: card.id,
        supports: [],
        bonus: 18,
      });
    }

    // A new leaning card on whatever surface is under the finger, leaning
    // the way it's tilted (or, held upright, to the right).
    const side: -1 | 1 = pose.angle < -0.08 ? -1 : 1;
    for (const surface of surfaces) {
      const slot = this.leanPose(pose.x + side * APEX_OFFSET, surface.y, side);
      if (slot.x < surface.left || slot.x > surface.right) continue;
      const crowded = placed.some(
        (card) =>
          card.kind === "lean" &&
          card.base === surface.id &&
          Math.abs(card.body.position.x - slot.x) < APEX_OFFSET * 2 - 4,
      );
      if (crowded) continue;
      slots.push({ ...slot, kind: "lean", base: surface.id, partner: null, supports: [], bonus: 0 });
    }

    // Floors: across the tops of one wall, or of two neighbouring walls.
    const frames = placed
      .filter((c) => c.kind === "lean" && c.partner !== null && c.body.angle > 0)
      .map((left) => {
        const right = this.card(left.partner)!;
        return {
          apexX: left.body.position.x + APEX_OFFSET,
          apexY: left.body.bounds.min.y,
          cards: [left.id, right.id],
        };
      });
    const floorTaken = (x: number, y: number) =>
      placed.some(
        (c) =>
          c.kind === "floor" &&
          Math.abs(c.body.position.x - x) < CARD_LENGTH * 0.6 &&
          Math.abs(c.body.position.y - y) < 10,
      );
    const addFloor = (group: typeof frames, bonus: number) => {
      const x = group.reduce((sum, f) => sum + f.apexX, 0) / group.length;
      const y = Math.min(...group.map((f) => f.apexY)) - CARD_THICKNESS / 2;
      if (floorTaken(x, y)) return;
      slots.push({
        x,
        y,
        angle: Math.PI / 2,
        kind: "floor",
        base: null,
        partner: null,
        supports: group.flatMap((f) => f.cards),
        bonus,
      });
    };
    for (const frame of frames) addFloor([frame], 0);
    for (const a of frames) {
      for (const b of frames) {
        const gap = b.apexX - a.apexX;
        if (gap > 26 && gap <= CARD_LENGTH - 6 && Math.abs(a.apexY - b.apexY) < 4) {
          addFloor([a, b], 10);
        }
      }
    }
    return slots;
  }

  /** The place a card let go at `pose` would snap into, if any. */
  snapFor(pose: Pose): Slot | null {
    const snap = SNAP[this.difficulty];
    if (!snap) return null;
    let best: Slot | null = null;
    let bestScore = Infinity;
    for (const slot of this.slotsNear(pose)) {
      const turn = Math.abs(angleDelta(pose.angle, slot.angle));
      // A card is the same either way up.
      const turned = Math.min(turn, Math.PI - turn);
      if (turned > snap.angle) continue;
      const distance = Math.hypot(pose.x - slot.x, pose.y - slot.y);
      if (distance > snap.radius) continue;
      const angleWeight = snap.angle >= Math.PI ? 0 : 20;
      const score = distance + turned * angleWeight - slot.bonus;
      if (score < bestScore) {
        best = slot;
        bestScore = score;
      }
    }
    return best;
  }

  // ========== Hands ========== //

  holderOf(pointerId: number) {
    return this.holders.find((holder) => holder.pointerId === pointerId);
  }

  touchStart(touch: WorldTouch) {
    // From the tray: a new card.
    if (touch.y > this.trayTop) {
      this.pick(touch);
      return;
    }
    // A second finger on the table turns the card the first one holds.
    const turning = this.holders.find(
      (holder) => !this.turners.some((turner) => turner.cardId === holder.cardId),
    );
    if (turning && this.difficulty !== "hard") {
      const anchor = this.lastTouch.get(turning.pointerId);
      const card = this.card(turning.cardId);
      if (anchor && card) {
        this.turners.push({
          pointerId: touch.id,
          cardId: card.id,
          anchorId: turning.pointerId,
          startFinger: Math.atan2(touch.y - anchor.y, touch.x - anchor.x),
          startCard: card.body.angle,
        });
        this.lastTouch.set(touch.id, touch);
        return;
      }
    }
    // Hard: fingers take hold of loose cards, at the point touched.
    if (this.difficulty === "hard") {
      const card = this.cardAt(touch.x, touch.y);
      if (card) {
        this.grab(card, touch);
        return;
      }
    }
    this.bump(touch.x, touch.y);
  }

  private lastTouch = new Map<number, WorldTouch>();

  private pick(touch: WorldTouch) {
    this.lastTouch.set(touch.id, touch);
    const hard = this.difficulty === "hard";
    // Held by its top end, as fingers hold a card being stood up; above the
    // table, as the tray is below it.
    const card = this.addCard(
      touch.x,
      Math.min(touch.y + CARD_LENGTH / 2 - 8, this.groundY - CARD_LENGTH / 2 - 2),
      0,
      hard,
    );
    if (hard) {
      Matter.Composite.add(this.engine.world, card.body);
      card.state = "loose";
      this.grab(card, touch);
    } else {
      this.holders.push({
        pointerId: touch.id,
        cardId: card.id,
        offsetX: 0,
        offsetY: CARD_LENGTH / 2 - 8,
        spring: null,
      });
    }
    this.onEvent({ type: "pick" });
  }

  private grab(card: ArchitectCard, touch: WorldTouch) {
    this.lastTouch.set(touch.id, touch);
    const local = Matter.Vector.rotate(
      { x: touch.x - card.body.position.x, y: touch.y - card.body.position.y },
      -card.body.angle,
    );
    const spring = Matter.Constraint.create({
      pointA: { x: touch.x, y: touch.y },
      bodyB: card.body,
      pointB: Matter.Vector.rotate(local, card.body.angle),
      stiffness: 0.22,
      damping: 0.12,
      length: 0,
    });
    Matter.Composite.add(this.engine.world, spring);
    Matter.Sleeping.set(card.body, false);
    card.state = "loose";
    this.holders.push({ pointerId: touch.id, cardId: card.id, offsetX: 0, offsetY: 0, spring });
  }

  /** The loose card under a finger, forgiving: cards are thin. */
  private cardAt(x: number, y: number) {
    const reach = 14;
    return [...this.cards].reverse().find((card) => {
      if (card.state !== "loose") return false;
      // Distance from the finger to the card's centre line.
      const local = Matter.Vector.rotate(
        { x: x - card.body.position.x, y: y - card.body.position.y },
        -card.body.angle,
      );
      const along = clamp(local.y, -CARD_LENGTH / 2, CARD_LENGTH / 2);
      return Math.hypot(local.x, local.y - along) < reach;
    });
  }

  touchMove(touch: WorldTouch) {
    this.lastTouch.set(touch.id, touch);
    const holder = this.holderOf(touch.id);
    if (holder) {
      const card = this.card(holder.cardId);
      if (!card) return;
      if (holder.spring) {
        holder.spring.pointA = { x: touch.x, y: touch.y };
      } else {
        const angle = card.body.angle;
        // The grab point turns with the card.
        const offset = Matter.Vector.rotate({ x: holder.offsetX, y: holder.offsetY }, angle);
        Matter.Body.setPosition(card.body, {
          x: clamp(touch.x + offset.x, 0, this.W),
          y: Math.min(touch.y + offset.y, this.groundY - this.halfHeight(angle)),
        });
      }
      return;
    }
    const turner = this.turners.find((t) => t.pointerId === touch.id);
    if (turner) {
      const anchor = this.lastTouch.get(turner.anchorId);
      const card = this.card(turner.cardId);
      if (!anchor || !card) return;
      const finger = Math.atan2(touch.y - anchor.y, touch.x - anchor.x);
      const angle = turner.startCard + angleDelta(turner.startFinger, finger);
      const holder = this.holders.find((h) => h.cardId === card.id);
      // Turned about the finger that holds it.
      if (holder) {
        const before = Matter.Vector.rotate({ x: holder.offsetX, y: holder.offsetY }, card.body.angle);
        const after = Matter.Vector.rotate({ x: holder.offsetX, y: holder.offsetY }, angle);
        Matter.Body.setPosition(card.body, {
          x: card.body.position.x - before.x + after.x,
          y: card.body.position.y - before.y + after.y,
        });
      }
      Matter.Body.setAngle(card.body, angle);
    }
  }

  touchEnd(touch: WorldTouch, cancelled: boolean) {
    this.lastTouch.delete(touch.id);
    this.turners = this.turners.filter((t) => t.pointerId !== touch.id && t.anchorId !== touch.id);
    const holder = this.holderOf(touch.id);
    if (!holder) return;
    this.holders = this.holders.filter((h) => h !== holder);
    const card = this.card(holder.cardId);
    if (!card) return;
    if (holder.spring) {
      Matter.Composite.remove(this.engine.world, holder.spring);
      // No card balances on its edge for long.
      if (!this.holders.some((h) => h.cardId === card.id)) {
        Matter.Body.setAngularVelocity(
          card.body,
          card.body.angularVelocity + random(-0.004, 0.004),
        );
      }
      return;
    }
    if (cancelled) {
      this.remove(card);
      return;
    }
    this.place(card);
  }

  /** Easy and Medium: into the nearest place, or dropped. */
  place(card: ArchitectCard) {
    const { x, y } = card.body.position;
    const slot = this.snapFor({ x, y, angle: card.body.angle });
    if (slot) {
      Matter.Body.setPosition(card.body, { x: slot.x, y: slot.y });
      Matter.Body.setAngle(card.body, slot.angle);
      Matter.Composite.add(this.engine.world, card.body);
      card.state = "placed";
      card.kind = slot.kind;
      card.base = slot.base;
      card.supports = slot.supports;
      if (slot.partner !== null) {
        card.partner = slot.partner;
        const partner = this.card(slot.partner);
        if (partner) partner.partner = card.id;
      }
      this.onEvent({ type: "snap" });
    } else {
      Matter.Body.setStatic(card.body, false);
      Matter.Composite.add(this.engine.world, card.body);
      card.state = "loose";
      this.onEvent({ type: "drop" });
    }
  }

  /** How far a card at `angle` reaches below its centre. */
  private halfHeight(angle: number) {
    return (
      (CARD_LENGTH / 2) * Math.abs(Math.cos(angle)) +
      (CARD_THICKNESS / 2) * Math.abs(Math.sin(angle))
    );
  }

  private remove(card: ArchitectCard) {
    Matter.Composite.remove(this.engine.world, card.body);
    this.cards = this.cards.filter((c) => c !== card);
    this.cardsById.delete(card.id);
  }

  // ========== Shakes ========== //

  /** A tap on the table: Medium and Hard feel it, nearby. */
  bump(x: number, y: number) {
    if (this.difficulty === "easy") return;
    this.shake = Math.max(this.shake, 0.4);
    this.onEvent({ type: "bump" });
    for (const card of this.cards) {
      const distance = Math.hypot(card.body.position.x - x, card.body.position.y - y);
      if (distance > TAP_REACH) continue;
      const strength = 1 - distance / TAP_REACH;
      if (card.state === "placed") {
        this.damage(card, 0.3 * strength, 0);
      } else if (card.state === "loose") {
        Matter.Sleeping.set(card.body, false);
        Matter.Body.applyForce(card.body, card.body.position, {
          x: random(-1, 1) * 0.0006 * strength * card.body.mass * 10,
          y: -0.0004 * strength * card.body.mass * 10,
        });
      }
    }
  }

  private damage(card: ArchitectCard, amount: number, delay: number) {
    if (card.state !== "placed") return;
    card.damage += amount;
    if (card.damage >= 1) {
      const at = this.time + delay;
      card.fallsAt = card.fallsAt === null ? at : Math.min(card.fallsAt, at);
    }
  }

  private loosen(card: ArchitectCard) {
    if (card.state !== "placed") return;
    card.state = "loose";
    card.fallsAt = null;
    Matter.Body.setStatic(card.body, false);
    Matter.Sleeping.set(card.body, false);
    Matter.Body.setAngularVelocity(card.body, random(-0.02, 0.02));
    Matter.Body.setVelocity(card.body, { x: random(-0.8, 0.8), y: 0 });
    for (const other of this.cards) {
      if (other.state !== "placed") continue;
      if (other.partner === card.id) this.damage(other, 0.55, random(60, 160));
      if (other.base === card.id) this.damage(other, 1, random(60, 160));
      if (other.supports.includes(card.id)) {
        const lost = other.supports.filter((id) => this.card(id)?.state !== "placed").length;
        if (lost >= Math.min(other.supports.length, 3)) this.damage(other, 1, random(60, 160));
        else this.damage(other, 0.25, random(60, 160));
      }
    }
    this.onEvent({ type: "fall" });
  }

  /** Shakes every free card, as a jolt of the phone would. */
  private jostle(strength: number) {
    for (const card of this.cards) {
      if (card.state !== "loose") continue;
      Matter.Sleeping.set(card.body, false);
      Matter.Body.applyForce(card.body, card.body.position, {
        x: random(-1, 1) * HARD_JOLT_FORCE * strength * card.body.mass * 10,
        y: 0,
      });
    }
  }

  /**
   * A card stood exactly upright on its edge would balance for ever in the
   * simulation (and sleep there); a real one never does. One nearly upright
   * is tipped on its way, the way it already leans.
   */
  private tipUpright() {
    for (const card of this.cards) {
      if (card.state !== "loose" || this.holders.some((h) => h.cardId === card.id)) continue;
      const tilt = angleDelta(0, card.body.angle);
      // Thick enough in the simulation to stand to about 8°: past that.
      const upright = Math.abs(tilt) < 0.18 || Math.abs(Math.abs(tilt) - Math.PI) < 0.18;
      if (!upright) continue;
      const sign = Math.sign(tilt) || (card.id % 2 ? 1 : -1);
      Matter.Sleeping.set(card.body, false);
      Matter.Body.setAngularVelocity(card.body, card.body.angularVelocity + sign * 0.0008);
    }
  }

  // ========== Stepping ========== //

  step(dt: number) {
    this.time += dt;
    const seconds = dt / 1000;
    const jolt = this.tilt.current.live ? this.tilt.current.jolt : 0;

    if (this.difficulty === "medium") {
      const excess = Math.max(0, jolt - MEDIUM_JOLT_ALLOWANCE);
      if (excess > 0) {
        this.shake = Math.max(this.shake, excess);
        this.jostle(excess);
        for (const card of this.cards) {
          if (card.state !== "placed") continue;
          // Higher cards feel it more.
          const height = 1 + (this.groundY - card.body.position.y) / 300;
          this.damage(card, excess * MEDIUM_JOLT_DAMAGE * seconds * height * random(0.6, 1.4), 0);
        }
      }
      this.stability = clamp(1 - jolt / (MEDIUM_JOLT_ALLOWANCE * 2.5), 0, 1);
    } else if (this.difficulty === "hard") {
      if (jolt > 0.04) {
        this.shake = Math.max(this.shake, jolt);
        this.jostle(jolt);
      }
      // Anything still moving is a wobble.
      const wobble = this.cards.reduce(
        (sum, card) =>
          card.state === "loose" && !card.body.isSleeping && !this.isFallen(card)
            ? sum + Math.abs(card.body.angularVelocity) * 20
            : sum,
        0,
      );
      this.stability = clamp(1 - jolt / 0.3 - wobble, 0, 1);
    } else {
      this.stability = 1;
    }
    this.shake *= Math.exp(-6 * seconds);

    for (const holder of this.holders) {
      const card = this.card(holder.cardId);
      if (card && holder.spring) Matter.Sleeping.set(card.body, false);
    }

    this.tipUpright();
    Matter.Engine.update(this.engine, dt);

    for (const card of this.cards) {
      if (card.fallsAt !== null && card.fallsAt <= this.time) this.loosen(card);
    }
    const lost = this.cards.filter((card) => card.body.position.y > this.H + 80);
    lost.forEach((card) => this.remove(card));
    this.bestHeight = Math.max(this.bestHeight, this.height);
  }
}
