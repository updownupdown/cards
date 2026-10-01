import Matter from "matter-js";
import { shuffledDeck, type PlayingCard } from "../engine/cards";
import { PointerTrack } from "../engine/pointer";
import { clamp, random } from "../engine/stage";
import { TILT_BOOST, type Tilt } from "../engine/tilt";
import type { WorldTouch } from "../engine/touch";

// Hat Trick: flicking cards into a top hat across the floor.
//
// A card flies in three dimensions: across the floor (x sideways, d away from
// the player) and up (z). The floor is drawn in perspective from a camera
// behind and above the player, so a card's height shows as the gap between it
// and its shadow. A flick sets the card's speed and heading; the flick's curl
// sets its spin, which steadies it against the wind and its own flutter. Once
// thrown, tilting the phone nudges it a little ("aftertouch").
//
// Distances are in the world's units (about a millimetre and a half each),
// times in seconds.

const Vec = Matter.Vector;

export const CARD_W = 22;
export const CARD_H = 31;
/** Where cards leave the hand. */
const HAND_Z = 25;
const GRAVITY = 110;
/** Air drag on the card's speed across the floor, per second. */
const DRAG = 0.35;
/** Finger speed (world units a millisecond) to card speed (units a second). */
const THROW_SCALE = 180;
const MAX_THROW_SPEED = 700;
/** Upward speed at release, and how much a harder throw adds. */
const LIFT = 118;
const LIFT_PER_SPEED = 0.02;
/** A flick's curl (radians) to spin (radians a second). */
const SPIN_SCALE = 14;
const MAX_SPIN = 30;
/** Spin at which a card flies as steady as it gets. */
const STEADY_SPIN = 18;
const MAX_WIND = 14;
const FLUTTER = 30;
const SPIN_CURVE = 0.25;
/** Tilt (about the sine of the angle) to acceleration, sideways and forwards. */
const TILT_SIDEWAYS = 90 * TILT_BOOST;
const TILT_FORWARDS = 60 * TILT_BOOST;

export const HAT = {
  brimRadius: 55,
  crownRadius: 39,
  openingRadius: 34,
  height: 55,
};

export const DECK_SIZE = 52;

// The camera: behind and above the player, looking along the floor.
const CAMERA_HEIGHT = 400;
const CAMERA_BACK = 200;
const FAR_D = 700;

export type Projection = {
  cx: number;
  horizon: number;
  focal: number;
};

export type FlyingCard = {
  id: number;
  face: PlayingCard;
  x: number;
  d: number;
  z: number;
  vx: number;
  vd: number;
  vz: number;
  spin: number;
  angle: number;
  /** Tilt when thrown: steering is measured from how the phone was held. */
  tiltX: number;
  tiltY: number;
  flutterPhase: number;
  state: "flying" | "floor" | "hat";
  /** Seconds since it came to rest (or dropped into the hat). */
  restedFor: number;
};

/** A throw, read from a flick: see `HatTrickGame.aim`. */
export type Throw = {
  /** Where it leaves the hand, on the floor plan. */
  x: number;
  d: number;
  speed: number;
  /** Radians from straight ahead, positive to the right. */
  heading: number;
  spin: number;
};

export type HatTrickEvent =
  | { type: "throw" }
  | { type: "inHat"; score: number }
  | { type: "rim" }
  | { type: "landed"; short: boolean; near: boolean }
  | { type: "deckDone"; score: number }
  | { type: "newDeck" };

type Mote = { x: number; d: number; z: number; drift: number };

let nextId = 1;

export class HatTrickGame {
  readonly W: number;
  readonly H: number;
  readonly view: Projection;
  /** The touch area: the bottom of the screen, far larger than the card. */
  readonly zoneTop: number;
  hat = { x: 0, d: 420 };
  wind = { x: 0, d: 0 };
  private windTarget = { x: 0, d: 0 };
  private windTimer = 0;
  deck: PlayingCard[] = shuffledDeck();
  thrown = 0;
  score = 0;
  cards: FlyingCard[] = [];
  motes: Mote[] = [];
  /** The card in the hand, carried by the finger around the mat. */
  hand: { pointerId: number; track: PointerTrack; dx: number; dy: number } | null =
    null;
  /** Seconds until the next card is in the hand. */
  reload = 0;
  onEvent: (event: HatTrickEvent) => void = () => {};

  constructor(
    W: number,
    H: number,
    topClear: number,
    private tilt: { current: Tilt },
  ) {
    this.W = W;
    this.H = H;
    // Fit the floor from the hand (near the bottom) to FAR_D (near the top).
    const handY = H - 110;
    const farY = topClear + 40;
    const near = CAMERA_HEIGHT / CAMERA_BACK;
    const far = CAMERA_HEIGHT / (FAR_D + CAMERA_BACK);
    const focal = (handY - farY) / (near - far);
    this.view = { cx: W / 2, focal, horizon: handY - focal * near };
    this.zoneTop = H * 0.6;
    this.placeHat();
    for (let i = 0; i < 46; i++) {
      this.motes.push({
        x: random(-420, 420),
        d: random(-60, FAR_D + 100),
        z: random(0, 80),
        drift: random(0.6, 1.4),
      });
    }
  }

  // ========== Projection ========== //

  /** Screen position and scale of a point on or above the floor. */
  project(x: number, d: number, z: number) {
    const depth = Math.max(40, d + CAMERA_BACK);
    const scale = this.view.focal / depth;
    return {
      sx: this.view.cx + x * scale,
      sy: this.view.horizon + (CAMERA_HEIGHT - z) * scale,
      scale,
      /** How flat a flat thing looks from here: the camera's pitch. */
      squash: clamp((CAMERA_HEIGHT - z) / Math.hypot(CAMERA_HEIGHT - z, depth), 0.25, 1),
    };
  }

  /** The floor point under a screen position. */
  unproject(sx: number, sy: number) {
    const drop = Math.max(1, sy - this.view.horizon);
    const depth = (this.view.focal * CAMERA_HEIGHT) / drop;
    return { x: ((sx - this.view.cx) * depth) / this.view.focal, d: depth - CAMERA_BACK };
  }

  get handScreen() {
    return this.project(0, 0, HAND_Z);
  }

  // ========== Round ========== //

  placeHat() {
    this.hat = { x: random(-70, 70), d: random(330, 540) };
  }

  get finished() {
    return this.thrown >= DECK_SIZE && this.cards.every((c) => c.state !== "flying");
  }

  newDeck() {
    this.deck = shuffledDeck();
    this.thrown = 0;
    this.score = 0;
    this.cards = [];
    this.reload = 0;
    this.hatMovedFor = 0;
    this.placeHat();
    this.onEvent({ type: "newDeck" });
  }

  get nextCard(): PlayingCard | undefined {
    return this.thrown < DECK_SIZE && this.reload <= 0 ? this.deck[this.thrown] : undefined;
  }

  // ========== Throwing ========== //

  touchStart(touch: WorldTouch) {
    if (this.hand || !this.nextCard || touch.y < this.zoneTop) return;
    this.hand = {
      pointerId: touch.id,
      track: new PointerTrack(touch.x, touch.y, touch.t),
      dx: 0,
      dy: 0,
    };
  }

  touchMove(touch: WorldTouch) {
    const hand = this.hand;
    if (!hand || hand.pointerId !== touch.id) return;
    hand.track.add(touch.x, touch.y, touch.t);
    const start = hand.track.samples[0];
    // The card goes where the finger goes, anywhere on the mat.
    const home = this.handScreen;
    const margin = CARD_W * 1.2;
    hand.dx =
      clamp(home.sx + touch.x - start.x, margin, this.W - margin) - home.sx;
    hand.dy =
      clamp(home.sy + touch.y - start.y, this.zoneTop + margin, this.H - margin) -
      home.sy;
  }

  touchEnd(touch: WorldTouch, cancelled: boolean) {
    const hand = this.hand;
    if (!hand || hand.pointerId !== touch.id) return;
    this.hand = null;
    if (cancelled) return;
    hand.track.add(touch.x, touch.y, touch.t);
    const aimed = this.aim(touch.t, hand);
    if (aimed) this.throwCard(aimed.speed, aimed.heading, aimed.spin, aimed);
  }

  /**
   * The throw the card in the hand would make if let go at `t`: none while
   * the finger is still, or moving anywhere but up the screen.
   */
  aim(t: number, hand = this.hand): Throw | null {
    if (!hand || hand.track.stoppedBy(t)) return null;
    const { vx, vy } = hand.track.velocity(90);
    const fingerSpeed = Math.hypot(vx, vy);
    // Only a flick up the screen throws; anything else puts the card back.
    if (fingerSpeed < 0.25 || vy > -0.1) return null;

    // It leaves the hand where the card is.
    const home = this.handScreen;
    const from = this.unprojectAt(home.sx + hand.dx, home.sy + hand.dy, HAND_Z);

    // The swipe's direction on screen, followed out across the floor from
    // there: flicking at the hat on screen heads for the hat.
    const origin = this.project(from.x, from.d, 0);
    const reach = Math.min(300, origin.sy - this.view.horizon - 20);
    const target = this.unproject(
      origin.sx + (vx / -vy) * reach,
      origin.sy - reach,
    );
    const heading = clamp(
      Math.atan2(target.x - from.x, target.d - from.d),
      -1,
      1,
    );
    return {
      x: from.x,
      d: from.d,
      speed: Math.min(MAX_THROW_SPEED, fingerSpeed * THROW_SCALE),
      heading,
      spin: clamp(hand.track.curl(160) * SPIN_SCALE, -MAX_SPIN, MAX_SPIN),
    };
  }

  /**
   * Where `aimed` would fly with no wind or flutter: points along its flight
   * (with how hard it was thrown, 0 to 1), to show before it's let go.
   */
  predict(aimed: Throw) {
    const card = this.launch(aimed, aimed.speed, aimed.heading, aimed.spin);
    const points: { x: number; d: number; z: number }[] = [];
    const dt = 1 / 60;
    for (let i = 0; i < 240 && card.z > 0; i++) {
      this.integrate(card, this.spinCurve(card), dt);
      if (i % 3 === 0) points.push({ x: card.x, d: card.d, z: Math.max(0, card.z) });
    }
    return { points, strength: aimed.speed / MAX_THROW_SPEED };
  }

  /** The floor plan point at height `z` that shows at a screen position. */
  unprojectAt(sx: number, sy: number, z: number) {
    const drop = Math.max(1, sy - this.view.horizon);
    const depth = Math.max(60, (this.view.focal * (CAMERA_HEIGHT - z)) / drop);
    return {
      x: ((sx - this.view.cx) * depth) / this.view.focal,
      d: Math.max(-120, depth - CAMERA_BACK),
    };
  }

  private launch(
    from: { x: number; d: number } | undefined,
    speed: number,
    heading: number,
    spin: number,
  ): FlyingCard {
    return {
      id: 0,
      face: this.deck[this.thrown] ?? this.deck[0],
      x: from?.x ?? 0,
      d: from?.d ?? 0,
      z: HAND_Z,
      vx: Math.sin(heading) * speed,
      vd: Math.cos(heading) * speed,
      vz: LIFT + LIFT_PER_SPEED * speed,
      spin,
      angle: random(-0.2, 0.2),
      tiltX: this.tilt.current.x,
      tiltY: this.tilt.current.y,
      flutterPhase: random(0, 100),
      state: "flying",
      restedFor: 0,
    };
  }

  /**
   * `heading` is radians from straight ahead, positive to the right; `from`
   * is where it leaves the hand (the middle, by default).
   */
  throwCard(
    speed: number,
    heading: number,
    spin: number,
    from?: { x: number; d: number },
  ) {
    const face = this.deck[this.thrown];
    if (!face) return;
    const card = this.launch(from, speed, heading, spin);
    this.thrown += 1;
    this.reload = 0.45;
    this.cards.push({
      ...card,
      id: nextId++,
      face,
    });
    // Old cards on the floor make way.
    const resting = this.cards.filter((c) => c.state !== "flying");
    if (resting.length > 24) {
      const oldest = resting[0];
      this.cards = this.cards.filter((c) => c !== oldest);
    }
    this.onEvent({ type: "throw" });
  }

  // ========== Stepping ========== //

  step(dtMs: number) {
    const dt = dtMs / 1000;
    this.reload -= dt;
    this.stepWind(dt);

    for (const card of this.cards) {
      if (card.state !== "flying") {
        card.restedFor += dt;
        continue;
      }
      this.stepCard(card, dt);
    }

    for (const mote of this.motes) {
      mote.x += (this.wind.x * 3 * mote.drift + random(-4, 4)) * dt;
      mote.d += (this.wind.d * 3 * mote.drift + random(-4, 4)) * dt;
      if (mote.x > 420) mote.x -= 840;
      if (mote.x < -420) mote.x += 840;
      if (mote.d > FAR_D + 100) mote.d -= FAR_D + 160;
      if (mote.d < -60) mote.d += FAR_D + 160;
    }

    if (this.thrown >= DECK_SIZE && !this.announcedEnd && this.finished) {
      this.announcedEnd = true;
      this.onEvent({ type: "deckDone", score: this.score });
    }
    if (this.thrown === 0) this.announcedEnd = false;
  }

  private announcedEnd = false;

  private stepWind(dt: number) {
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      // A new breeze every few seconds, eased into.
      this.windTimer = random(2.5, 5);
      const angle = random(0, Math.PI * 2);
      const strength = random(0.2, 1) * MAX_WIND;
      this.windTarget = { x: Math.cos(angle) * strength, d: Math.sin(angle) * strength * 0.6 };
    }
    const ease = Math.min(1, dt * 0.5);
    this.wind.x += (this.windTarget.x - this.wind.x) * ease;
    this.wind.d += (this.windTarget.d - this.wind.d) * ease;
  }

  private stepCard(card: FlyingCard, dt: number) {
    const steadiness = clamp(Math.abs(card.spin) / STEADY_SPIN, 0, 1);
    const speed = Math.hypot(card.vx, card.vd);

    // Wind, less on a spinning card.
    let ax = this.wind.x * (1 - 0.7 * steadiness);
    let ad = this.wind.d * (1 - 0.7 * steadiness);

    // Flutter: a card thrown flat wobbles off course.
    card.flutterPhase += dt * 3.1;
    const wobble = Math.sin(card.flutterPhase) + Math.sin(card.flutterPhase * 2.3 + 1);
    const across = speed > 1 ? Vec.create(card.vd / speed, -card.vx / speed) : Vec.create(1, 0);
    ax += across.x * wobble * FLUTTER * (1 - steadiness);
    ad += across.y * wobble * FLUTTER * (1 - steadiness);

    // Spin curls it a little, as a frisbee's does.
    const curve = this.spinCurve(card);
    ax += curve.ax;
    ad += curve.ad;

    // Aftertouch: the phone's tilt since the throw.
    const tilt = this.tilt.current;
    if (tilt.live) {
      ax += clamp(tilt.x - card.tiltX, -0.5, 0.5) * TILT_SIDEWAYS;
      ad += clamp(tilt.y - card.tiltY, -0.5, 0.5) * TILT_FORWARDS;
    }

    const previousZ = card.z;
    this.integrate(card, { ax, ad }, dt);

    this.collideWithHat(card, previousZ);

    if (card.state === "flying" && card.z <= 0) {
      card.z = 0;
      card.state = "floor";
      card.restedFor = 0;
      this.onEvent({
        type: "landed",
        short: card.d < this.hat.d,
        near: Math.hypot(card.x - this.hat.x, card.d - this.hat.d) < 160,
      });
    }
    if (card.state !== "flying") this.maybeMoveHat();
  }

  /** The sideways pull of a card's spin, across its path. */
  private spinCurve(card: FlyingCard) {
    const speed = Math.hypot(card.vx, card.vd);
    const across =
      speed > 1 ? Vec.create(card.vd / speed, -card.vx / speed) : Vec.create(1, 0);
    return { ax: across.x * card.spin * SPIN_CURVE, ad: across.y * card.spin * SPIN_CURVE };
  }

  /** Moves a card on by `dt` under `pull`, drag and gravity. */
  private integrate(card: FlyingCard, pull: { ax: number; ad: number }, dt: number) {
    card.vx += (pull.ax - card.vx * DRAG) * dt;
    card.vd += (pull.ad - card.vd * DRAG) * dt;
    card.vz -= GRAVITY * dt;
    card.spin *= 1 - 0.15 * dt;
    card.angle += card.spin * dt;
    card.x += card.vx * dt;
    card.d += card.vd * dt;
    card.z += card.vz * dt;
  }

  /** The hat moves after every 13 cards, once they have all come down. */
  private maybeMoveHat() {
    const suit = Math.floor(this.thrown / 13);
    if (
      suit > this.hatMovedFor &&
      this.thrown < DECK_SIZE &&
      this.cards.every((c) => c.state !== "flying")
    ) {
      this.hatMovedFor = suit;
      this.placeHat();
    }
  }

  private hatMovedFor = 0;

  private collideWithHat(card: FlyingCard, previousZ: number) {
    const dx = card.x - this.hat.x;
    const dd = card.d - this.hat.d;
    const distance = Math.hypot(dx, dd);

    // Coming down through the height of the hat's opening.
    if (previousZ > HAT.height && card.z <= HAT.height) {
      if (distance < HAT.openingRadius) {
        card.state = "hat";
        card.restedFor = 0;
        card.z = HAT.height;
        this.score += 1;
        this.onEvent({ type: "inHat", score: this.score });
        return;
      }
      if (distance < HAT.crownRadius + 4) {
        // Off the rim: bounced up and away.
        this.bounceOff(card, dx, dd, distance, 0.35);
        card.z = HAT.height + 0.5;
        card.vz = Math.abs(card.vz) * 0.3;
        this.onEvent({ type: "rim" });
        return;
      }
    }

    // Into the side of the crown.
    if (card.z < HAT.height && card.z > 0 && distance < HAT.crownRadius) {
      this.bounceOff(card, dx, dd, distance, 0.25);
      const push = (HAT.crownRadius - distance + 0.5) / Math.max(distance, 0.01);
      card.x += dx * push;
      card.d += dd * push;
      this.onEvent({ type: "rim" });
    }
  }

  private bounceOff(card: FlyingCard, dx: number, dd: number, distance: number, keep: number) {
    const nx = distance > 0 ? dx / distance : 0;
    const nd = distance > 0 ? dd / distance : -1;
    const along = card.vx * nx + card.vd * nd;
    if (along < 0) {
      card.vx -= 2 * along * nx;
      card.vd -= 2 * along * nd;
    }
    card.vx *= keep;
    card.vd *= keep;
    card.spin *= 0.5;
  }
}
