import { useFade } from "@/hooks/useFade";
import { act, renderHook } from "@testing-library/react-native";
import { Animated } from "react-native";

describe("useFade", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("keeps content mounted until its fade-out completes", async () => {
    let completeAnimation:
      | ((result: { finished: boolean }) => void)
      | undefined;
    jest.spyOn(Animated, "timing").mockImplementation(
      () =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            completeAnimation = callback;
          },
        }) as Animated.CompositeAnimation,
    );

    const { result, rerender } = await renderHook<
      ReturnType<typeof useFade>,
      { visible: boolean }
    >(({ visible }) => useFade(visible, 100), {
      initialProps: { visible: true },
    });

    await rerender({ visible: false });
    expect(result.current.isRendered).toBe(true);

    await act(async () => {
      completeAnimation?.({ finished: true });
    });

    expect(result.current.isRendered).toBe(false);
  });
});
