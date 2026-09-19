import {
  NodesWinOverlay,
  NodesWinRewardPreview,
} from "@/components/Nodes/NodesWinOverlay";
import { getQuote } from "@/data/collectibles";
import { DEFAULT_NODES_PROGRESS } from "@/data/nodes-progress";
import { describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { Animated } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

jest.mock("@/components/Button/Button", () => {
  const { Pressable } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    Button: ({
      accessibilityLabel,
      onPress,
    }: {
      accessibilityLabel: string;
      onPress: () => void;
    }) => (
      <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} />
    ),
  };
});

jest.mock("@/components/Cards/CardAssets", () => ({
  getCollectibleCardImageSource: () => 1,
}));

jest.mock("@/components/common/Text", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native") as typeof import("react-native");
  return {
    Text: ({ children }: { children?: React.ReactNode }) => (
      <Text>{children}</Text>
    ),
  };
});

jest.mock("@/components/Modals/ModalFull", () => {
  const { Pressable, View } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    __esModule: true,
    default: ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View>
        <Pressable accessibilityLabel="reward.dismiss" onPress={onClose} />
        {children}
      </View>
    ),
  };
});

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: { "/unlocked": { title: "Unlocked game" } },
}));

jest.mock("@/data/nodes-map", () => ({
  getNodeDefinition: () => ({}),
}));

jest.mock("@/hooks/useGlobalSettings", () => ({
  useGlobalSettings: () => ({ settings: { translateCollectibles: false } }),
}));

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    ui: { contentMaxWidth: 420 },
  }),
}));

jest.mock("@/i18n", () => ({
  useDisplayLanguage: () => "en",
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@/icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native") as typeof import("react-native");
  return { Icon: () => <View /> };
});

describe("NodesWinOverlay", () => {
  test("shows reward copy in the win/loss preview and opens the collectible modal", () => {
    const onClose = jest.fn();
    const onOpen = jest.fn();
    const quote = getQuote(1)!;
    let renderer!: ReactTestRenderer;
    const animation = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    jest
      .spyOn(Animated, "timing")
      .mockReturnValue(animation as ReturnType<typeof Animated.timing>);
    jest
      .spyOn(Animated, "loop")
      .mockReturnValue(animation as ReturnType<typeof Animated.loop>);

    act(() => {
      renderer = create(
        <NodesWinRewardPreview
          result={{
            progress: DEFAULT_NODES_PROGRESS,
            awardedReward: { type: "quote", id: 1 },
            newlyUnlockedPaths: ["/unlocked"],
            duplicate: false,
          }}
          onPress={onOpen}
        />,
      );
    });

    expect(
      renderer.root.findAll((node) => node.props.children === quote.text),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "reward.dismiss",
      ),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll((node) => node.props.children === "reward.earned"),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAll((node) => node.props.children === "Unlocked game"),
    ).not.toHaveLength(0);

    act(() => {
      renderer.root
        .findAll((node) => node.props.accessibilityLabel === "reward.earned")[0]
        .props.onPress();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.unmount();
      renderer = create(
        <NodesWinOverlay
          path="/klondike"
          result={{
            progress: DEFAULT_NODES_PROGRESS,
            awardedReward: { type: "quote", id: 1 },
            newlyUnlockedPaths: ["/unlocked"],
            duplicate: false,
          }}
          onClose={onClose}
        />,
      );
    });

    expect(
      renderer.root.findAll((node) => node.props.children === quote.text),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "reward.dismiss",
      ),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAll((node) => node.props.children === "Unlocked game"),
    ).toHaveLength(0);

    act(() => {
      renderer.root
        .findAll(
          (node) => node.props.accessibilityLabel === "reward.dismiss",
        )[0]
        .props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => renderer.unmount());
  });
});
