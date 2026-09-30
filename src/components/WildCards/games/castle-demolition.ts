import Matter from "matter-js";
import { randomCard, type PlayingCard } from "../engine/cards";
import { PointerTrack } from "../engine/pointer";
import { clamp, pick, random } from "../engine/stage";
import type { WorldTouch } from "../engine/touch";

// Castle Demolition: flick rocks at houses of cards.
//
// The castle stands perfectly still until it's hit: every card starts out
// static, and only comes loose (a dynamic body the physics then topples) once
// the damage done to it passes 1. Rocks do damage by their momentum, and the
// bigger ones splash it around; a card that comes loose weakens the cards
// resting on or against it, and brings down those that lose too much support.
// That keeps castles sturdy enough to take a few pebbles, and still lets a
// boulder or a well-placed shot bring half of one down.

export type RockKind = "pebble" | "stone" | "boulder";

type RockSpec = {
  radius: number;
  density: number;
  /** Throw speed (units a step) per finger speed (units a millisecond). */
  throwScale: number;
  maxSpeed: number;
  /** A finger faster than this, drawing the rock off its pile, loses it. */
  pickMaxSpeed: number;
  /** How far the first hit's damage spreads. */
  splash: number;
};

export const ROCKS: Record<RockKind, RockSpec> = {
  pebble: {
    radius: 6,
    density: 0.004,
    throwScale: 17,
    maxSpeed: 25,
    pickMaxSpeed: Infinity,
    splash: 0,
  },
  stone: {
    radius: 11,
    density: 0.004,
    throwScale: 17,
    maxSpeed: 20,
    pickMaxSpeed: 2.2,
    splash: 34,
  },
  boulder: {
    radius: 21,
    density: 0.005,
    throwScale: 40,
    maxSpeed: 17,
    pickMaxSpeed: 1.1,
    splash: 120,
  },
};
export const ROCK_KINDS: RockKind[] = ["pebble", "stone", "boulder"];

/** A boulder is only thrown by a steady, unhurried push. */
const BOULDER_STEADY = {
  minDuration: 130,
  minSpeed: 0.18,
  maxSpeed: 1.5,
  maxVariation: 0.65,
  maxTurn: 1.5,
};
/** A stone flung harder than this slips out of the hand. */
const STONE_MAX_FLING = 2.8;

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
/** Momentum per point of damage, for a rock... */
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
const MAX_ROCKS = 12;

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
  kind: RockKind;
  body: Matter.Body;
  splashed: boolean;
  /** How long it has lain still; it fades away after a while. */
  still: number;
  gone: boolean;
};

export type Dust = { x: number; y: number; age: number; size: number };

export type HeldRock = {
  pointerId: number;
  kind: RockKind;
  track: PointerTrack;
  x: number;
  y: number;
  /** Still being drawn off its pile. */
  picking: boolean;
};

export type CastleEvent =
  | { type: "pick"; kind: RockKind }
  | { type: "throw"; kind: RockKind }
  | { type: "fumble"; kind: RockKind; reason: "tooFast" | "unsteady" }
  | { type: "slip"; kind: RockKind }
  | { type: "cardsDown"; count: number }
  | { type: "landed"; kind: RockKind; hard: boolean }
  | { type: "destroyed"; castle: number }
  | { type: "newCastle"; castle: number };

type Layout = (build: CastleBuilder, centerX: number) => void;

let nextId = 1;

export class CastleGame {
  readonly W: number;
  readonly H: number;
  readonly groundY: number;
  /** Rocks can be carried no further right than this before they're let go. */
  readonly throwLineX: number;
  readonly piles: { kind: RockKind; x: number; y: number }[];
  readonly engine: Matter.Engine;
  cards: CastleCard[] = [];
  rocks: Rock[] = [];
  dust: Dust[] = [];
  held: HeldRock | null = null;
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
    this.throwLineX = W * 0.38;
    const pileY = this.groundY;
    this.piles = [
      { kind: "pebble", x: 48, y: pileY },
      { kind: "stone", x: 116, y: pileY },
      { kind: "boulder", x: 214, y: pileY },
    ];

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
    // Centred in the right part of the world, clear of the rock piles.
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
        this.onEvent({ type: "landed", kind: rock.kind, hard: speed > 7 });
        this.puff(hitter.position.x, this.groundY, rock.kind === "boulder" ? 3 : 1);
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
      const splash = ROCKS[rock.kind].splash;
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

  // ========== Throwing ========== //

  pileAt(x: number, y: number) {
    return this.piles.find(
      (pile) => Math.hypot(x - pile.x, y - (pile.y - 14)) < 34,
    );
  }

  touchStart(touch: WorldTouch) {
    if (this.held) return;
    const pile = this.pileAt(touch.x, touch.y);
    if (!pile) return;
    this.held = {
      pointerId: touch.id,
      kind: pile.kind,
      track: new PointerTrack(touch.x, touch.y, touch.t),
      x: touch.x,
      y: touch.y,
      picking: true,
    };
    this.onEvent({ type: "pick", kind: pile.kind });
  }

  touchMove(touch: WorldTouch) {
    const held = this.held;
    if (!held || held.pointerId !== touch.id) return;
    held.track.add(touch.x, touch.y, touch.t);
    held.x = Math.min(touch.x, this.throwLineX);
    held.y = Math.min(touch.y, this.groundY - ROCKS[held.kind].radius);

    if (held.picking) {
      const pile = this.piles.find((p) => p.kind === held.kind)!;
      const { vx, vy } = held.track.velocity(100);
      if (Math.hypot(vx, vy) > ROCKS[held.kind].pickMaxSpeed) {
        // Snatched too quickly: it tumbles off the pile.
        this.launch(held.kind, held.x, held.y, { x: vx * 4, y: -2 });
        this.held = null;
        this.onEvent({ type: "slip", kind: pile.kind });
        return;
      }
      if (Math.hypot(touch.x - pile.x, touch.y - pile.y) > 46) {
        held.picking = false;
      }
    }
    if (touch.x >= this.throwLineX) this.release(touch);
  }

  touchEnd(touch: WorldTouch) {
    if (this.held?.pointerId === touch.id) this.release(touch);
  }

  private release(touch: WorldTouch) {
    const held = this.held;
    if (!held) return;
    this.held = null;
    const stopped = held.track.stoppedBy(touch.t);
    held.track.add(touch.x, touch.y, touch.t);
    const spec = ROCKS[held.kind];
    if (stopped) {
      // Held still, then let go: it just drops.
      this.launch(held.kind, held.x, held.y, { x: 0, y: 0 });
      return;
    }
    const { vx, vy } = held.track.velocity(90);
    const speed = Math.hypot(vx, vy);

    let fumble: "tooFast" | "unsteady" | null = null;
    if (held.kind === "stone" && speed > STONE_MAX_FLING) fumble = "tooFast";
    if (held.kind === "boulder" && speed > 0.12) {
      const steady = held.track.steadiness(260);
      if (steady.meanSpeed > BOULDER_STEADY.maxSpeed || speed > BOULDER_STEADY.maxSpeed * 1.3) {
        fumble = "tooFast";
      } else if (
        steady.duration < BOULDER_STEADY.minDuration ||
        steady.meanSpeed < BOULDER_STEADY.minSpeed ||
        steady.variation > BOULDER_STEADY.maxVariation ||
        steady.turn > BOULDER_STEADY.maxTurn
      ) {
        fumble = "unsteady";
      }
    }

    if (fumble) {
      this.launch(held.kind, held.x, held.y, {
        x: vx * 3 + random(-0.5, 0.5),
        y: Math.min(vy * 3, 1),
      });
      this.onEvent({ type: "fumble", kind: held.kind, reason: fumble });
      return;
    }

    const throwSpeed = Math.min(spec.maxSpeed, speed * spec.throwScale);
    const scale = speed > 0 ? throwSpeed / speed : 0;
    this.launch(held.kind, held.x, held.y, { x: vx * scale, y: vy * scale });
    if (throwSpeed > 2) this.onEvent({ type: "throw", kind: held.kind });
  }

  /** Puts a rock into the world, moving at `velocity` (units a step). */
  launch(kind: RockKind, x: number, y: number, velocity: Matter.Vector) {
    const spec = ROCKS[kind];
    const body = Matter.Bodies.circle(x, y, spec.radius, {
      density: spec.density,
      friction: 0.3,
      frictionAir: 0.002,
      restitution: 0.15,
      label: "rock",
    });
    Matter.Body.setVelocity(body, velocity);
    Matter.Composite.add(this.engine.world, body);
    const rock: Rock = { id: nextId++, kind, body, splashed: false, still: 0, gone: false };
    this.rocks.push(rock);
    while (this.rocks.length > MAX_ROCKS) {
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
