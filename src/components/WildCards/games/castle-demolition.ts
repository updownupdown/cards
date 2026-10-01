import Matter from "matter-js";
import { randomCard, type PlayingCard } from "../engine/cards";
import { clamp, pick, random } from "../engine/stage";
import type { WorldTouch } from "../engine/touch";

// Castle Demolition: a catapult against houses of cards.
//
// The castle stands perfectly still until it's hit: every card starts out
// static, and only comes loose (a dynamic body the physics then topples) once
// the damage done to it passes 1. Stones do damage by their momentum, and
// splash it around a little; a card that comes loose weakens the cards
// resting on or against it, and brings down those that lose too much support.
//
// The catapult always fires at the same angle: the only skill is how far its
// arm is wound back, which sets how hard (and so how far) it throws.

/** The catapult's stone. */
export const STONE = {
  radius: 12,
  density: 0.007,
  /** How far the first hit's damage spreads. */
  splash: 80,
};

/** The arm's angle at rest and fully wound (radians, up from the right). */
const ARM_REST = (80 * Math.PI) / 180;
const ARM_WOUND = (195 * Math.PI) / 180;
export const ARM_LENGTH = 92;
/** How far a finger drags to wind the arm all the way back. */
const PULL_RANGE = 170;
/** Less wound than this, and letting go fires nothing. */
const MIN_PULL = 0.06;
/** Launch speed (units a step) unwound and fully wound, and its angle. */
const MIN_SPEED = 5;
const MAX_SPEED = 16;
const LAUNCH_ANGLE = (45 * Math.PI) / 180;
/** How long the arm takes to swing back up once it has fired, ms. */
const RELOAD_MS = 650;
/** The stone leaves the bucket this long after letting go, as the arm comes up. */
const RELEASE_MS = 90;

// Card geometry. A card stood on edge is seen from the side, so it's drawn
// narrow; one lying flat as a floor is drawn flat.
export const CARD_LENGTH = 56;
export const LEAN_THICKNESS = 9;
export const FLOOR_THICKNESS = 7;
const LEAN_ANGLE = (14 * Math.PI) / 180;
const FRAME_HEIGHT = CARD_LENGTH * Math.cos(LEAN_ANGLE);
/** Between neighbouring A-frames' apexes. */
const FRAME_SPACING = 52;

const CARD_DENSITY = 0.0015;
/** Momentum per point of damage, for a stone... */
const ROCK_DAMAGE_MOMENTUM = 8;
/** ...and for a falling card, which does far less. */
const CARD_DAMAGE_MOMENTUM = 40;
/** Damage passed to a card when one it leans against or rests on falls. */
const PARTNER_LOSS_DAMAGE = 0.45;
const FLOOR_SUPPORT_LOSS_DAMAGE = 0.2;
/**
 * Once this share of a castle is down, every card that falls shakes the
 * rest by SHAKE_DAMAGE: the knock-down, where a weakened castle gives way.
 */
const SHAKY_SHARE = 0.55;
const SHAKE_DAMAGE = 0.1;
/** The share of a splash's damage passed on at its centre. */
const SPLASH_SHARE = 0.7;
/** The share of a castle down that brings the rest of it down too. */
const DESTROYED_SHARE = 0.75;
/** How long "Nice!" shows before the next castle goes up. */
export const NEXT_CASTLE_DELAY = 3000;
const MAX_STONES = 12;

export type CastleCard = {
  id: number;
  kind: "lean" | "floor";
  body: Matter.Body;
  face: PlayingCard;
  loose: boolean;
  damage: number;
  /** When it's due to come loose, from a support giving way. */
  fallsAt: number | null;
  /** The lean card it leans against. */
  partner: number | null;
  /** The floor card it stands on (null: the ground). */
  base: number | null;
  /** The lean cards a floor card rests on. */
  supports: number[];
  gone: boolean;
};

export type Rock = {
  id: number;
  body: Matter.Body;
  splashed: boolean;
  /** How long it has lain still; it fades away after a while. */
  still: number;
  gone: boolean;
};

export type Dust = { x: number; y: number; age: number; size: number };

/** A finger winding the catapult back. */
export type Winding = {
  pointerId: number;
  startX: number;
  startY: number;
  /** How far it's wound, 0 to 1. */
  pull: number;
};

export type CastleEvent =
  | { type: "wind" }
  | { type: "fire"; pull: number }
  | { type: "cardsDown"; count: number }
  | { type: "landed"; hard: boolean }
  | { type: "destroyed"; castle: number }
  | { type: "newCastle"; castle: number };

type Layout = (build: CastleBuilder, centerX: number) => void;

let nextId = 1;

export class CastleGame {
  readonly W: number;
  readonly H: number;
  readonly groundY: number;
  /** Winding starts from a touch left of this. */
  readonly controlX: number;
  /** The arm's pivot. */
  readonly pivot: { x: number; y: number };
  readonly engine: Matter.Engine;
  cards: CastleCard[] = [];
  rocks: Rock[] = [];
  dust: Dust[] = [];
  winding: Winding | null = null;
  /** The arm's angle now (radians, up from the right). */
  armAngle = ARM_REST;
  /** How far it was wound for the last shot, to judge the next by. */
  lastPull: number | null = null;
  /** When the arm last fired: it can't fire again until it's back up. */
  private firedAt = -Infinity;
  /** A shot let go, still swinging up to throw its stone. */
  private swinging: { pull: number; at: number } | null = null;
  time = 0;
  castleNumber = 0;
  /** When the current castle fell, while "Nice!" shows. */
  destroyedAt: number | null = null;
  /** Set by the screen: haptics, the prompt and the score. */
  onEvent: (event: CastleEvent) => void = () => {};
  private cardsById = new Map<number, CastleCard>();

  constructor(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.groundY = H - 40;
    this.controlX = W * 0.42;
    this.pivot = { x: 120, y: this.groundY - 34 };

    this.engine = Matter.Engine.create({
      positionIterations: 8,
      velocityIterations: 6,
    });
    const ground = Matter.Bodies.rectangle(
      W / 2,
      this.groundY + 100,
      W + 800,
      200,
      { isStatic: true, label: "ground", friction: 0.9 },
    );
    Matter.Composite.add(this.engine.world, ground);
    Matter.Events.on(this.engine, "collisionStart", (event) =>
      this.onCollisions(event.pairs),
    );
    this.buildNextCastle();
  }

  // ========== Castles ========== //

  /** `layout` names one of CASTLE_LAYOUTS; by default it's chosen at random. */
  buildNextCastle(layout?: string) {
    Matter.Composite.remove(
      this.engine.world,
      this.cards.map((card) => card.body),
    );
    this.cards = [];
    this.cardsById.clear();
    this.destroyedAt = null;
    this.castleNumber += 1;

    const build = layout ? LAYOUTS[layout] : chooseLayout(this.castleNumber);
    const builder = new CastleBuilder(this.groundY);
    // Centred in the right part of the world, clear of the catapult.
    const left = this.W * 0.46;
    const right = this.W - 24;
    build(builder, 0);
    const { minX, maxX } = builder.extent();
    const width = maxX - minX;
    const centerX = clamp(
      this.W * 0.72,
      left + width / 2,
      Math.max(left + width / 2, right - width / 2),
    );
    builder.shift(centerX - (minX + maxX) / 2);

    for (const spec of builder.cards) {
      const body = Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        angle: spec.angle,
        density: CARD_DENSITY,
        friction: 0.8,
        frictionStatic: 1,
        restitution: 0.05,
        label: "card",
      });
      Matter.Body.setStatic(body, true);
      const card: CastleCard = {
        id: spec.id,
        kind: spec.kind,
        body,
        face: randomCard(),
        loose: false,
        damage: 0,
        fallsAt: null,
        partner: spec.partner,
        base: spec.base,
        supports: spec.supports,
        gone: false,
      };
      body.plugin = { cardId: card.id };
      this.cards.push(card);
      this.cardsById.set(card.id, card);
    }
    Matter.Composite.add(
      this.engine.world,
      this.cards.map((card) => card.body),
    );
    this.onEvent({ type: "newCastle", castle: this.castleNumber });
  }

  get looseCount() {
    return this.cards.filter((card) => card.loose).length;
  }

  // ========== Damage ========== //

  private damage(card: CastleCard, amount: number, delay = 0) {
    if (card.loose || amount <= 0) return;
    card.damage += amount;
    if (card.damage >= 1) this.scheduleFall(card, delay);
  }

  private scheduleFall(card: CastleCard, delay: number) {
    if (card.loose) return;
    const at = this.time + delay;
    card.fallsAt = card.fallsAt === null ? at : Math.min(card.fallsAt, at);
  }

  /** Lets a card go, and weakens what it held up. */
  private loosen(card: CastleCard, push?: Matter.Vector) {
    if (card.loose) return;
    card.loose = true;
    card.fallsAt = null;
    Matter.Body.setStatic(card.body, false);
    Matter.Body.setAngularVelocity(
      card.body,
      (card.kind === "lean" ? Math.sign(card.body.angle) : random(-1, 1)) *
        random(0.004, 0.02),
    );
    if (push) Matter.Body.setVelocity(card.body, push);
    this.onEvent({ type: "cardsDown", count: 1 });

    const cascade = () => random(70, 170);
    const shaky = this.looseCount >= this.cards.length * SHAKY_SHARE;
    for (const other of this.cards) {
      if (other.loose) continue;
      if (shaky) this.damage(other, SHAKE_DAMAGE, random(80, 320));
      if (other.partner === card.id) {
        this.damage(other, PARTNER_LOSS_DAMAGE, cascade());
      }
      if (other.base === card.id) {
        // Standing on a floor that fell.
        this.scheduleFall(other, cascade());
      }
      if (other.supports.includes(card.id)) {
        // A floor rests on one wall or two (its supports, a pair of cards
        // each): with a whole wall gone, one end has nothing under it.
        const isLoose = (id: number) => !!this.cardsById.get(id)?.loose;
        let wallGone = false;
        for (let i = 0; i < other.supports.length; i += 2) {
          if (other.supports.slice(i, i + 2).every(isLoose)) wallGone = true;
        }
        if (wallGone) this.scheduleFall(other, cascade());
        else this.damage(other, FLOOR_SUPPORT_LOSS_DAMAGE, cascade());
      }
    }
  }

  private onCollisions(pairs: Matter.Pair[]) {
    for (const pair of pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      this.onContact(pair, a, b);
      this.onContact(pair, b, a);
    }
  }

  /** `hitter` ran into `target`. */
  private onContact(pair: Matter.Pair, hitter: Matter.Body, target: Matter.Body) {
    if (hitter.isStatic) return;
    const speed = Math.hypot(
      hitter.velocity.x - target.velocity.x,
      hitter.velocity.y - target.velocity.y,
    );
    const rock = this.rocks.find((r) => r.body === hitter);

    if (target.label === "ground") {
      if (rock && speed > 3) {
        this.onEvent({ type: "landed", hard: speed > 7 });
        this.puff(hitter.position.x, this.groundY, 2);
      } else if (!rock && speed > 2.5) {
        this.puff(hitter.position.x, this.groundY, 1);
      }
      return;
    }

    const card = this.cardFor(target);
    if (!card || card.loose) return;
    const momentum = hitter.mass * speed;
    const amount = rock
      ? momentum / ROCK_DAMAGE_MOMENTUM
      : momentum / CARD_DAMAGE_MOMENTUM;
    this.damage(card, amount);

    if (rock && !rock.splashed) {
      rock.splashed = true;
      const splash = STONE.splash;
      if (splash > 0) {
        for (const other of this.cards) {
          if (other === card || other.loose) continue;
          const distance = Math.hypot(
            other.body.position.x - hitter.position.x,
            other.body.position.y - hitter.position.y,
          );
          if (distance < splash) {
            this.damage(
              other,
              amount * SPLASH_SHARE * (1 - distance / splash),
              distance * 1.2,
            );
          }
        }
      }
    }

    // Broken by this very hit: it gives way now, so the rock carries on
    // through it instead of bouncing off a card that is about to fall.
    if (card.fallsAt !== null && card.fallsAt <= this.time) {
      this.loosen(card);
      pair.inverseMass =
        pair.collision.parentA.inverseMass + pair.collision.parentB.inverseMass;
    }
  }

  private cardFor(body: Matter.Body) {
    const id = (body.plugin as { cardId?: number } | undefined)?.cardId;
    return id === undefined ? undefined : this.cardsById.get(id);
  }

  private puff(x: number, y: number, count: number) {
    for (let i = 0; i < count * 3; i++) {
      this.dust.push({
        x: x + random(-10, 10) * count,
        y: y - random(0, 6),
        age: 0,
        size: random(6, 12) * (0.7 + count * 0.3),
      });
    }
  }

  // ========== Stepping ========== //

  step(dt: number) {
    this.time += dt;
    Matter.Engine.update(this.engine, dt);

    // The arm follows the winding finger, and swings up fast once let go.
    const target = this.winding
      ? ARM_REST + (ARM_WOUND - ARM_REST) * this.winding.pull
      : ARM_REST;
    const ease = this.winding ? 0.5 : 0.35;
    this.armAngle += (target - this.armAngle) * Math.min(1, ease * (dt / 16.7));
    if (this.swinging && this.time >= this.swinging.at) {
      this.fire(this.swinging.pull);
      this.swinging = null;
    }

    for (const card of this.cards) {
      if (card.fallsAt !== null && card.fallsAt <= this.time) this.loosen(card);
      if (card.loose && !card.gone && this.isOffWorld(card.body)) {
        card.gone = true;
        Matter.Composite.remove(this.engine.world, card.body);
      }
    }

    for (const rock of this.rocks) {
      const moving = Math.hypot(rock.body.velocity.x, rock.body.velocity.y) > 0.25;
      rock.still = moving ? 0 : rock.still + dt;
      if (!rock.gone && (rock.still > 2600 || this.isOffWorld(rock.body))) {
        rock.gone = true;
        Matter.Composite.remove(this.engine.world, rock.body);
      }
    }
    this.rocks = this.rocks.filter((rock) => !rock.gone);

    for (const puff of this.dust) puff.age += dt;
    this.dust = this.dust.filter((puff) => puff.age < 900);

    if (
      this.destroyedAt === null &&
      this.cards.length > 0 &&
      this.looseCount >= this.cards.length * DESTROYED_SHARE
    ) {
      this.destroyedAt = this.time;
      // The last few come down with the rest.
      for (const card of this.cards) {
        if (!card.loose) this.scheduleFall(card, random(0, 450));
      }
      this.onEvent({ type: "destroyed", castle: this.castleNumber });
    }
    if (
      this.destroyedAt !== null &&
      this.time - this.destroyedAt >= NEXT_CASTLE_DELAY
    ) {
      this.buildNextCastle();
    }
  }

  private isOffWorld(body: Matter.Body) {
    const { x, y } = body.position;
    return y > this.H + 80 || x < -120 || x > this.W + 120;
  }

  // ========== The catapult ========== //

  /** Whether the arm is back up, with a stone in its bucket. */
  get loaded() {
    return !this.swinging && this.time - this.firedAt >= RELOAD_MS;
  }

  /** Whether a stone sits in the bucket (loaded, or swinging up to throw). */
  get stoneInBucket() {
    return this.loaded || this.swinging !== null;
  }

  /** The bucket at the end of the arm, at `angle`. */
  armTip(angle = this.armAngle) {
    return {
      x: this.pivot.x + Math.cos(angle) * ARM_LENGTH,
      y: this.pivot.y - Math.sin(angle) * ARM_LENGTH,
    };
  }

  /** The arm's angle wound to `pull`. */
  armAngleFor(pull: number) {
    return ARM_REST + (ARM_WOUND - ARM_REST) * pull;
  }

  touchStart(touch: WorldTouch) {
    if (this.winding || !this.loaded || touch.x > this.controlX) return;
    this.winding = { pointerId: touch.id, startX: touch.x, startY: touch.y, pull: 0 };
    this.onEvent({ type: "wind" });
  }

  touchMove(touch: WorldTouch) {
    const winding = this.winding;
    if (!winding || winding.pointerId !== touch.id) return;
    // However the finger goes, the further it drags the more it winds.
    const dragged = Math.hypot(touch.x - winding.startX, touch.y - winding.startY);
    winding.pull = clamp(dragged / PULL_RANGE, 0, 1);
  }

  touchEnd(touch: WorldTouch) {
    const winding = this.winding;
    if (!winding || winding.pointerId !== touch.id) return;
    this.winding = null;
    if (winding.pull < MIN_PULL) return;
    this.swinging = { pull: winding.pull, at: this.time + RELEASE_MS };
  }

  /** Fires a stone, wound back `pull` (0 to 1). */
  fire(pull: number) {
    const speed = this.launchSpeed(pull);
    const tip = this.armTip(ARM_REST);
    this.launch(tip.x, tip.y, {
      x: Math.cos(LAUNCH_ANGLE) * speed,
      y: -Math.sin(LAUNCH_ANGLE) * speed,
    });
    this.firedAt = this.time;
    this.lastPull = pull;
    this.onEvent({ type: "fire", pull });
  }

  launchSpeed(pull: number) {
    return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * clamp(pull, 0, 1);
  }

  /** Puts a stone into the world, moving at `velocity` (units a step). */
  launch(x: number, y: number, velocity: Matter.Vector) {
    const body = Matter.Bodies.circle(x, y, STONE.radius, {
      density: STONE.density,
      friction: 0.3,
      frictionAir: 0.002,
      restitution: 0.15,
      label: "rock",
    });
    Matter.Body.setVelocity(body, velocity);
    Matter.Composite.add(this.engine.world, body);
    const rock: Rock = { id: nextId++, body, splashed: false, still: 0, gone: false };
    this.rocks.push(rock);
    while (this.rocks.length > MAX_STONES) {
      const oldest = this.rocks.shift()!;
      oldest.gone = true;
      Matter.Composite.remove(this.engine.world, oldest.body);
    }
    return rock;
  }
}

// ========== Building ========== //

type CardSpec = {
  id: number;
  kind: "lean" | "floor";
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
  partner: number | null;
  base: number | null;
  supports: number[];
};

type Frame = { apexX: number; apexY: number; cards: [number, number] };

export class CastleBuilder {
  cards: CardSpec[] = [];
  constructor(private groundY: number) {}

  /** An A-frame: two cards leaning together, standing on `baseY`. */
  frame(apexX: number, baseY: number, base: number | null): Frame {
    const lift = (LEAN_THICKNESS / 2) * Math.sin(LEAN_ANGLE);
    const halfSpread = (CARD_LENGTH / 2) * Math.sin(LEAN_ANGLE);
    const y = baseY - FRAME_HEIGHT / 2 - lift;
    const leftId = nextId++;
    const rightId = nextId++;
    const offset = LEAN_THICKNESS * 0.45 + halfSpread;
    this.cards.push(
      {
        id: leftId,
        kind: "lean",
        x: apexX - offset,
        y,
        w: LEAN_THICKNESS,
        h: CARD_LENGTH,
        angle: LEAN_ANGLE,
        partner: rightId,
        base,
        supports: [],
      },
      {
        id: rightId,
        kind: "lean",
        x: apexX + offset,
        y,
        w: LEAN_THICKNESS,
        h: CARD_LENGTH,
        angle: -LEAN_ANGLE,
        partner: leftId,
        base,
        supports: [],
      },
    );
    return {
      apexX,
      apexY: baseY - FRAME_HEIGHT - lift * 2,
      cards: [leftId, rightId],
    };
  }

  /** A card laid flat across the apexes of `frames` (one or two). */
  floor(frames: Frame[]) {
    const id = nextId++;
    const x = frames.reduce((sum, f) => sum + f.apexX, 0) / frames.length;
    const apexY = Math.min(...frames.map((f) => f.apexY));
    this.cards.push({
      id,
      kind: "floor",
      x,
      y: apexY - FLOOR_THICKNESS / 2,
      w: CARD_LENGTH,
      h: FLOOR_THICKNESS,
      angle: 0,
      partner: null,
      base: null,
      supports: frames.flatMap((f) => f.cards),
    });
    return { id, x, topY: apexY - FLOOR_THICKNESS };
  }

  /** The classic house of cards: `rows` frames at the bottom, one at the top. */
  pyramid(centerX: number, rows: number, topRows = rows) {
    let baseY = this.groundY;
    let bases: ({ id: number; x: number; topY: number } | null)[] = [];
    for (let row = 0; row < Math.min(rows, topRows); row++) {
      const count = rows - row;
      const firstX = centerX - ((count - 1) * FRAME_SPACING) / 2;
      const frames = Array.from({ length: count }, (_, i) => {
        const base = row === 0 ? null : bases[i];
        return this.frame(firstX + i * FRAME_SPACING, base ? base.topY : baseY, base ? base.id : null);
      });
      if (count === 1) {
        this.floor([frames[0]]);
        break;
      }
      bases = frames.slice(1).map((frame, i) => this.floor([frames[i], frame]));
      if (row === topRows - 1) break;
      baseY = bases[0]?.topY ?? baseY;
    }
  }

  /** A column of single A-frames, each on a flat card over the last. */
  tower(centerX: number, storeys: number) {
    let base: { id: number; topY: number } | null = null;
    for (let storey = 0; storey < storeys; storey++) {
      const frame = this.frame(centerX, base ? base.topY : this.groundY, base ? base.id : null);
      base = this.floor([frame]);
    }
  }

  extent() {
    const xs = this.cards.map((card) => card.x);
    return {
      minX: Math.min(...xs) - CARD_LENGTH / 2,
      maxX: Math.max(...xs) + CARD_LENGTH / 2,
    };
  }

  shift(dx: number) {
    for (const card of this.cards) card.x += dx;
  }
}

const SPAN = FRAME_SPACING;

const LAYOUTS: Record<string, Layout> = {
  cottage: (b, x) => b.pyramid(x, 2),
  house: (b, x) => b.pyramid(x, 3),
  manor: (b, x) => b.pyramid(x, 4),
  palace: (b, x) => b.pyramid(x, 5),
  lookout: (b, x) => b.tower(x, 4),
  wall: (b, x) => b.pyramid(x, 6, 2),
  keep: (b, x) => {
    b.tower(x - SPAN * 2.2, 3);
    b.pyramid(x, 3);
    b.tower(x + SPAN * 2.2, 3);
  },
  twinTowers: (b, x) => {
    b.tower(x - SPAN * 1.3, 4);
    b.pyramid(x, 1);
    b.tower(x + SPAN * 1.3, 4);
  },
  citadel: (b, x) => {
    b.tower(x - SPAN * 3, 4);
    b.pyramid(x, 4, 3);
    b.tower(x + SPAN * 3, 4);
  },
};

/** The first castles are small; after that, anything goes. */
function chooseLayout(castleNumber: number): Layout {
  if (castleNumber === 1) return LAYOUTS.cottage;
  if (castleNumber === 2) return LAYOUTS.house;
  return LAYOUTS[
    pick([
      "house",
      "house",
      "manor",
      "manor",
      "palace",
      "lookout",
      "wall",
      "keep",
      "twinTowers",
      "citadel",
    ])
  ];
}

export const CASTLE_LAYOUTS = LAYOUTS;
