import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
// The boundary expo-router puts around a route that exports ErrorBoundary.
import { Try } from "expo-router/build/views/Try";
// What the root layout's ErrorBoundary renders (the layout itself pulls in
// fonts and native modules the test environment doesn't have).
import { AppErrorScreen } from "@/components/common/AppErrorScreen";
import { ErrorBoundary as WildGameErrorBoundary } from "@/app/wild/[game]";

const mockReportCrash = jest.fn();
const mockReplace = jest.fn();
const mockToast = jest.fn();

jest.mock("@/utils/crash-reporting", () => ({
  reportCrash: (...args: unknown[]) => mockReportCrash(...args),
  withCrashReporting: (component: unknown) => component,
}));

jest.mock("@/components/common/Toast", () => ({
  useToast: () => (message: string) => mockToast(message),
}));

jest.mock("expo-router", () => ({
  ...(jest.requireActual("expo-router") as object),
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

let shouldThrow = true;

function Flaky() {
  if (shouldThrow) throw new Error("boom");
  return <Text>recovered</Text>;
}

function texts(renderer: ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(""));
}

beforeEach(() => {
  shouldThrow = true;
  mockReportCrash.mockClear();
  mockReplace.mockClear();
  mockToast.mockClear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("error boundaries", () => {
  test("a screen outside a game shows a way back instead of crashing", async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(
        <Try catch={AppErrorScreen}>
          <Flaky />
        </Try>,
      );
    });

    expect(texts(renderer)).toEqual(["Something went wrong.", "Try again"]);
    expect(mockReportCrash).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
    );

    shouldThrow = false;
    await act(async () => {
      renderer.root
        .find(
          (node) =>
            node.props.accessibilityRole === "button" && !!node.props.onPress,
        )
        .props.onPress();
    });
    expect(texts(renderer)).toEqual(["recovered"]);
  });

  test("a Wild Cards game that crashes goes back home", async () => {
    await act(async () => {
      create(
        <Try catch={WildGameErrorBoundary}>
          <Flaky />
        </Try>,
      );
    });

    expect(mockReportCrash).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
    );
    expect(mockToast).toHaveBeenCalledWith(
      "Something went wrong with that game.",
    );
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
