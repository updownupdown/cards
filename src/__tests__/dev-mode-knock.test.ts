import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import {
  DEV_MODE_KNOCK_PAUSE_MS,
  DEV_MODE_KNOCK_TAPS,
  createDevModeKnock,
} from "@/data/dev-mode";

function listen() {
  const armed: boolean[] = [];
  const onUnlock = jest.fn();
  const knock = createDevModeKnock({
    onArmedChange: (next) => armed.push(next),
    onUnlock,
  });
  const tap = (times: number) => {
    for (let i = 0; i < times; i++) knock.tap();
  };
  const isArmed = () => armed[armed.length - 1] ?? false;
  return { knock, tap, isArmed, onUnlock };
}

const pause = (ms = DEV_MODE_KNOCK_PAUSE_MS) => jest.advanceTimersByTime(ms);

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("Dev mode knock", () => {
  test("five taps, a pause, five taps turn dev mode on", () => {
    const { tap, isArmed, onUnlock } = listen();
    tap(DEV_MODE_KNOCK_TAPS);
    expect(isArmed()).toBe(false);
    pause(DEV_MODE_KNOCK_PAUSE_MS - 1);
    expect(isArmed()).toBe(false);
    pause(1);
    expect(isArmed()).toBe(true);
    tap(DEV_MODE_KNOCK_TAPS - 1);
    expect(onUnlock).not.toHaveBeenCalled();
    tap(1);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(isArmed()).toBe(false);
  });

  test("tapping on past five does nothing, however long it goes on", () => {
    for (const taps of [6, 10, 11, 25]) {
      const { tap, isArmed, onUnlock } = listen();
      tap(taps);
      expect(isArmed()).toBe(false);
      pause();
      expect(isArmed()).toBe(false);
      expect(onUnlock).not.toHaveBeenCalled();
    }
  });

  test("a tap before the pause is over spoils the knock", () => {
    const { tap, isArmed, onUnlock } = listen();
    tap(DEV_MODE_KNOCK_TAPS);
    pause(DEV_MODE_KNOCK_PAUSE_MS - 1);
    tap(1);
    pause();
    expect(isArmed()).toBe(false);
    // Five more would have finished it, had that tap not counted.
    tap(DEV_MODE_KNOCK_TAPS);
    expect(onUnlock).not.toHaveBeenCalled();
  });

  test("too few taps are forgotten, so stray ones never add up", () => {
    const { tap, isArmed } = listen();
    tap(3);
    pause();
    tap(2);
    pause();
    expect(isArmed()).toBe(false);
  });

  test("armed, a pause before the fifth tap disarms it", () => {
    const { tap, isArmed, onUnlock } = listen();
    tap(DEV_MODE_KNOCK_TAPS);
    pause();
    tap(DEV_MODE_KNOCK_TAPS - 1);
    pause();
    expect(isArmed()).toBe(false);
    tap(1);
    expect(onUnlock).not.toHaveBeenCalled();
  });

  test("the knock can be started again after a spoiled one", () => {
    const { tap, isArmed, onUnlock } = listen();
    tap(7);
    pause();
    tap(DEV_MODE_KNOCK_TAPS);
    pause();
    expect(isArmed()).toBe(true);
    tap(DEV_MODE_KNOCK_TAPS);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  test("reset forgets the knock and its timer", () => {
    const { knock, tap, isArmed } = listen();
    tap(DEV_MODE_KNOCK_TAPS);
    knock.reset();
    pause();
    expect(isArmed()).toBe(false);
  });
});
