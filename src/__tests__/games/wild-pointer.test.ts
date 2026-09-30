import { describe, expect, test } from "@jest/globals";
import { PointerTrack } from "@/components/WildCards/engine/pointer";

describe("Reading a flick", () => {
  test("an even push reads as steady, even when its events come in bursts", () => {
    const track = new PointerTrack(0, 0, 0);
    // 0.5 units a millisecond, but delivered two at a time, 1ms apart.
    for (let t = 16; t <= 320; t += 16) {
      track.add(0.5 * (t - 8), 0, t - 1);
      track.add(0.5 * t, 0, t);
    }
    const steady = track.steadiness(260);
    expect(steady.meanSpeed).toBeCloseTo(0.5, 1);
    expect(steady.variation).toBeLessThan(0.15);
    expect(steady.turn).toBeLessThan(0.1);
  });

  test("a slow drag snapped into a flick reads as unsteady", () => {
    const track = new PointerTrack(0, 0, 0);
    let x = 0;
    for (let t = 16; t <= 320; t += 16) {
      x += t > 240 ? 32 : 3;
      track.add(x, 0, t);
    }
    expect(track.steadiness(260).variation).toBeGreaterThan(0.65);
  });

  test("velocity is read over the last moments", () => {
    const track = new PointerTrack(0, 0, 0);
    track.add(10, 0, 100);
    track.add(40, -20, 150);
    const { vx, vy } = track.velocity(60);
    expect(vx).toBeCloseTo(0.6);
    expect(vy).toBeCloseTo(-0.4);
  });

  test("a hooked swipe curls one way, a straight one not at all", () => {
    const hooked = new PointerTrack(0, 0, 0);
    const straight = new PointerTrack(0, 0, 0);
    for (let i = 1; i <= 10; i++) {
      const angle = -Math.PI / 2 + i * 0.12;
      hooked.add(i * 10 * Math.cos(angle), i * 10 * Math.sin(angle), i * 16);
      straight.add(0, -i * 10, i * 16);
    }
    expect(hooked.curl(200)).toBeGreaterThan(0.5);
    expect(Math.abs(straight.curl(200))).toBeLessThan(0.01);
  });
});

describe("Letting go", () => {
  test("lifting a finger where it last moved doesn't read as a stop", () => {
    const track = new PointerTrack(0, 0, 0);
    for (let t = 16; t <= 320; t += 16) track.add(0.5 * t, 0, t);
    track.add(160, 0, 340); // the lift, 20ms after the last move
    expect(track.stoppedBy(340)).toBe(false);
    expect(track.steadiness(260).variation).toBeLessThan(0.1);
    expect(track.velocity(90).vx).toBeCloseTo(0.5, 2);
  });

  test("a finger held still before lifting has stopped", () => {
    const track = new PointerTrack(0, 0, 0);
    for (let t = 16; t <= 320; t += 16) track.add(0.5 * t, 0, t);
    expect(track.stoppedBy(600)).toBe(true);
  });
});
