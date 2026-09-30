import Matter from "matter-js";
import { randomCard, type PlayingCard } from "../engine/cards";
import { PointerTrack } from "../engine/pointer";
import { clamp, pick, random } from "../engine/stage";
import type { WorldTouch } from "../engine/touch";

// Cutting Deck: flick cards from the bottom of the screen to slice fruit
// falling from the top and pop balloons rising from the bottom.
//
// Everything is a Matter body. Fruit falls under gravity; balloons are held
// up by their own lift and blown sideways by a wind they all share. Thrown
// cards are sensors: they fly straight through whatever they cut, so one well
// aimed card can take several in a row, which counts towards a combo.

export const CARD_W = 26;
export const CARD_H = 36;
const GRAVITY = 0.35;
/** Card speed (units a step) per finger speed (units a millisecond). */
const THROW_SCALE = 22;
const MIN_THROW_SPEED = 13;
const MAX_THROW_SPEED = 30;
/** Hits closer together than this keep a combo going. */
const COMBO_MS = 750;
const BALLOON_LIFT = 1.8;
const MAX_WIND = 0.00006;

const CATEGORY_CARD = 0x0002;
const CATEGORY_TARGET = 0x0004;

export const FRUITS = ["🍎", "🍊", "🍋", "🍉", "🍐", "🍑", "🍇", "🥝", "🍓", "🍍"];
export const FRUIT_JUICE: Record<string, string> = {
  "🍎": "#e0413a",
  "🍊": "#f39a2b",
  "🍋": "#f4dd3f",
  "🍉": "#ea4a5c",
  "🍐": "#b8d24a",
  "🍑": "#f7a07a",
  "🍇": "#8a4bb0",
  "🥝": "#8cbf3f",
  "🍓": "#e2344a",
  "🍍": "#f2c43d",
};
export const BALLOON_COLORS = [
  "#e5484d",
  "#3e8ee6",
  "#f2c230",
  "#39b36b",
  "#9b5de5",
  "#f28a2e",
];

/** Combo names, by the number of hits in a row (from two). */
export const COMBOS = [
  "pair",
  "threeOfAKind",
  "straight",
  "flush",
  "fullHouse",
  "fourOfAKind",
  "straightFlush",
  "royalFlush",
] as const;
export type ComboName = (typeof COMBOS)[number];

export const comboName = (hits: number): ComboName | null =>
  hits < 2 ? null : COMBOS[Math.min(hits - 2, COMBOS.length - 1)];

export type Target = {
  id: number;
  kind: "fruit" | "balloon";
  body: Matter.Body;
  radius: number;
  look: string;
};

export type Thrown = {
  id: number;
  face: PlayingCard;
  body: Matter.Body;
  trail: { x: number; y: number }[];
};

export type Half = {
  id: number;
  body: Matter.Body;
  look: string;
  radius: number;
  side: -1 | 1;
  /** The cut's direction, radians: halves are split along it. */
  cut: number;
};

export type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  size: number;
};

export type Pop = { x: number; y: number; age: number; color: string };

export type CuttingDeckEvent =
  | { type: "throw" }
  | { type: "slice"; kind: "fruit" | "balloon"; combo: number; points: number }
  | { type: "combo"; name: ComboName; hits: number };

let nextId = 1;

export class CuttingDeckGame {
  readonly W: number;
  readonly H: number;
  /** Flicks start below this line. */
  readonly zoneTop: number;
  readonly engine: Matter.Engine;
  targets = new Map<number, Target>();
  cards: Thrown[] = [];
  halves: Half[] = [];
  sparks: Spark[] = [];
  pops: Pop[] = [];
  wind = 0;
  private windTarget = 0;
  private windTimer = 0;
  private spawnTimer = 800;
  time = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  private lastHitAt = -Infinity;
  /** The combo being announced, and when it was. */
  announcement: { name: ComboName; at: number } | null = null;
  private pointers = new Map<number, PointerTrack>();
  onEvent: (event: CuttingDeckEvent) => void = () => {};

  constructor(W: number, H: number, private topClear: number) {
    this.W = W;
    this.H = H;
    this.zoneTop = H * 0.74;
    this.engine = Matter.Engine.create();
    this.engine.gravity.y = GRAVITY;
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) this.onHit(pair.bodyA, pair.bodyB);
    });
  }

  // ========== Spawning ========== //

  /** Waves come quicker the longer the game goes on. */
  private spawnInterval() {
    return clamp(1700 - this.time / 60, 750, 1700);
  }

  private spawnWave() {
    const fruitWave = Math.random() < 0.55;
    const count = 1 + Math.floor(Math.random() * (this.time > 30000 ? 3 : 2));
    for (let i = 0; i < count; i++) {
      if (fruitWave) this.spawnFruit(random(40, this.W - 40), -40 - i * 70);
      else this.spawnBalloon(random(50, this.W - 50), this.H + 50 + i * 60);
    }
  }

  spawnFruit(x: number, y: number) {
    const radius = random(18, 26);
    const body = Matter.Bodies.circle(x, y, radius, {
      frictionAir: 0,
      isSensor: false,
      collisionFilter: { category: CATEGORY_TARGET, mask: CATEGORY_CARD },
      label: "fruit",
    });
    Matter.Body.setVelocity(body, { x: 0, y: random(0.2, 1.2) });
    Matter.Body.setAngularVelocity(body, random(-0.03, 0.03));
    return this.addTarget("fruit", body, radius, pick(FRUITS));
  }

  spawnBalloon(x: number, y: number) {
    const radius = random(20, 25);
    const body = Matter.Bodies.circle(x, y, radius, {
      frictionAir: 0.03,
      collisionFilter: { category: CATEGORY_TARGET, mask: CATEGORY_CARD },
      label: "balloon",
    });
    return this.addTarget("balloon", body, radius, pick(BALLOON_COLORS));
  }

  private addTarget(kind: Target["kind"], body: Matter.Body, radius: number, look: string) {
    const target: Target = { id: body.id, kind, body, radius, look };
    this.targets.set(body.id, target);
    Matter.Composite.add(this.engine.world, body);
    return target;
  }

  // ========== Throwing ========== //

  touchStart(touch: WorldTouch) {
    if (touch.y < this.zoneTop) return;
    this.pointers.set(touch.id, new PointerTrack(touch.x, touch.y, touch.t));
  }

  touchMove(touch: WorldTouch) {
    this.pointers.get(touch.id)?.add(touch.x, touch.y, touch.t);
  }

  touchEnd(touch: WorldTouch, cancelled: boolean) {
    const track = this.pointers.get(touch.id);
    this.pointers.delete(touch.id);
    if (!track || cancelled || track.stoppedBy(touch.t)) return;
    track.add(touch.x, touch.y, touch.t);
    const { vx, vy } = track.velocity(80);
    const speed = Math.hypot(vx, vy);
    if (speed < 0.35) return;
    const throwSpeed = clamp(speed * THROW_SCALE, MIN_THROW_SPEED, MAX_THROW_SPEED);
    // From where the flick left off, but no higher than the bottom band.
    this.throwCard(
      clamp(touch.x, 10, this.W - 10),
      Math.max(touch.y, this.zoneTop),
      { x: (vx / speed) * throwSpeed, y: (vy / speed) * throwSpeed },
    );
  }

  /** The finger trails drawn while swiping. */
  get swipes() {
    return [...this.pointers.values()].map((track) => track.recent(120));
  }

  throwCard(x: number, y: number, velocity: Matter.Vector) {
    const body = Matter.Bodies.rectangle(x, y, CARD_W, CARD_H, {
      isSensor: true,
      frictionAir: 0,
      collisionFilter: { category: CATEGORY_CARD, mask: CATEGORY_TARGET },
      label: "card",
    });
    Matter.Body.setVelocity(body, velocity);
    Matter.Body.setAngularVelocity(body, (velocity.x >= 0 ? 1 : -1) * random(0.35, 0.5));
    Matter.Composite.add(this.engine.world, body);
    const card = { id: body.id, face: randomCard(), body, trail: [{ x, y }] };
    this.cards.push(card);
    this.onEvent({ type: "throw" });
    return card;
  }

  // ========== Hits ========== //

  private onHit(a: Matter.Body, b: Matter.Body) {
    const card = a.label === "card" ? a : b.label === "card" ? b : null;
    const other = card === a ? b : a;
    if (!card) return;
    const target = this.targets.get(other.id);
    if (!target) return;
    this.targets.delete(other.id);
    Matter.Composite.remove(this.engine.world, other);

    this.combo = this.time - this.lastHitAt < COMBO_MS ? this.combo + 1 : 1;
    this.lastHitAt = this.time;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const points = this.combo;
    this.score += points;

    const cut = Math.atan2(card.velocity.y, card.velocity.x);
    if (target.kind === "fruit") this.slice(target, cut);
    else this.pop(target);

    this.onEvent({ type: "slice", kind: target.kind, combo: this.combo, points });
    const name = comboName(this.combo);
    if (name) {
      this.announcement = { name, at: this.time };
      this.onEvent({ type: "combo", name, hits: this.combo });
    }
  }

  private slice(target: Target, cut: number) {
    const { x, y } = target.body.position;
    const across = { x: -Math.sin(cut), y: Math.cos(cut) };
    for (const side of [-1, 1] as const) {
      const body = Matter.Bodies.circle(
        x + across.x * side * target.radius * 0.3,
        y + across.y * side * target.radius * 0.3,
        target.radius * 0.7,
        { collisionFilter: { mask: 0 }, frictionAir: 0.005, label: "half" },
      );
      Matter.Body.setAngle(body, cut);
      Matter.Body.setVelocity(body, {
        x: target.body.velocity.x * 0.5 + across.x * side * 2.2,
        y: target.body.velocity.y * 0.5 + across.y * side * 2.2 - 1.5,
      });
      Matter.Body.setAngularVelocity(body, side * random(0.04, 0.1));
      Matter.Composite.add(this.engine.world, body);
      this.halves.push({ id: nextId++, body, look: target.look, radius: target.radius, side, cut });
    }
    this.splash(x, y, FRUIT_JUICE[target.look] ?? "#e0413a", 10);
  }

  private pop(target: Target) {
    const { x, y } = target.body.position;
    this.pops.push({ x, y, age: 0, color: target.look });
    this.splash(x, y, target.look, 7);
  }

  private splash(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(40, 190);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        age: 0,
        life: random(350, 700),
        color,
        size: random(2, 4.5),
      });
    }
  }

  // ========== Stepping ========== //

  step(dt: number) {
    this.time += dt;
    this.stepWind(dt);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = this.spawnInterval() * random(0.8, 1.2);
    }

    const gravity = this.engine.gravity.y * this.engine.gravity.scale;
    for (const target of this.targets.values()) {
      if (target.kind !== "balloon") continue;
      const body = target.body;
      // Lift a little more than its weight, and the shared breeze.
      Matter.Body.applyForce(body, body.position, {
        x: this.wind * body.mass,
        y: -gravity * body.mass * BALLOON_LIFT,
      });
    }
    // Cards fly straight: gravity doesn't take them.
    for (const card of this.cards) {
      Matter.Body.applyForce(card.body, card.body.position, {
        x: 0,
        y: -gravity * card.body.mass,
      });
    }

    Matter.Engine.update(this.engine, dt);

    for (const card of this.cards) {
      card.trail.push({ x: card.body.position.x, y: card.body.position.y });
      if (card.trail.length > 9) card.trail.shift();
    }

    this.cards = this.cards.filter((card) => this.keep(card.body, 60));
    this.halves = this.halves.filter((half) => this.keep(half.body, 80));
    for (const [id, target] of this.targets) {
      const { y } = target.body.position;
      const gone =
        target.kind === "fruit" ? y > this.H + 60 : y < this.topClear - 80 || y < -80;
      if (gone || !this.inWorld(target.body, 120)) {
        this.targets.delete(id);
        Matter.Composite.remove(this.engine.world, target.body);
      }
    }

    for (const spark of this.sparks) {
      spark.age += dt;
      spark.x += (spark.vx * dt) / 1000;
      spark.y += (spark.vy * dt) / 1000;
      spark.vy += (420 * dt) / 1000;
    }
    this.sparks = this.sparks.filter((spark) => spark.age < spark.life);
    for (const pop of this.pops) pop.age += dt;
    this.pops = this.pops.filter((pop) => pop.age < 320);

    if (this.announcement && this.time - this.announcement.at > 1300) {
      this.announcement = null;
    }
  }

  private stepWind(dt: number) {
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.windTimer = random(2500, 5000);
      this.windTarget = random(-1, 1) * MAX_WIND;
    }
    this.wind += (this.windTarget - this.wind) * Math.min(1, dt / 1500);
  }

  /** Keeps a body in the world while it's near the screen, or removes it. */
  private keep(body: Matter.Body, margin: number) {
    if (this.inWorld(body, margin)) return true;
    Matter.Composite.remove(this.engine.world, body);
    return false;
  }

  private inWorld(body: Matter.Body, margin: number) {
    const { x, y } = body.position;
    return x > -margin && x < this.W + margin && y > -margin * 3 && y < this.H + margin * 2;
  }
}
