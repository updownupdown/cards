import { DealMeAGame, swipeOpacity } from "@/components/Home/DealMeAGame";
import {
  COLLECT_HOME_TAB_INDEX,
  getPendingCollectTag,
  NODES_HOME_TAB_INDEX,
} from "@/components/Home/home-view-state";
import {
  type GuideBox,
  StartHereGuide,
} from "@/components/Home/StartHereGuide";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import React from "react";
import { StyleSheet, Text } from "react-native";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

// Mock factories are hoisted above the imports, so they can only use hoisted
// function declarations.
function mockGame(title: string, difficulty: number, tag: string) {
  return {
    title,
    tags: [tag],
    rating: { difficulty, complexity: 1 },
    gameColorDark: "#102030",
    gameColorPale: "#d0e0f0",
  };
}

function mockLaunchGame(...args: unknown[]) {
  launchCalls.push(args);
}
const launchCalls: unknown[][] = [];

// The mock leaves out layout animation config, which only needs to render.
jest.mock("react-native-reanimated", () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ...(require("react-native-reanimated/mock") as object),
  LayoutAnimationConfig: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock("@/data/games-registry", () => ({
  GAMES_DATA: {
    "/klondike": mockGame("Klondike", 2, "KlondikeFamily"),
    "/yukon": mockGame("Yukon", 3, "YukonFamily"),
  },
}));

jest.mock("@/components/Home/CollectTab", () => ({
  COLLECT_TAGS: ["KlondikeFamily", "YukonFamily", "Sports", "CardCombat"],
}));

jest.mock("@/data/nodes-map", () => ({ NODES_START_PATH: "/klondike" }));

jest.mock("@/data/nodes-progress", () => ({
  setLastPlayedNode: () => Promise.resolve(),
}));

jest.mock("@/components/common/GameLaunchOverlay", () => ({
  launchGame: mockLaunchGame,
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

jest.mock("@/components/Button/Button", () => {
  const { Pressable, Text } =
    require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    Button: ({ text, onPress }: { text: string; onPress: () => void }) => (
      <Pressable accessibilityLabel={`button ${text}`} onPress={onPress}>
        <Text>{text}</Text>
      </Pressable>
    ),
  };
});

jest.mock("@/components/Home/HomeCard", () => {
  const { View } = require("react-native") as typeof import("react-native"); // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    HomeCard: ({
      path,
      size,
      campaign,
      style,
    }: {
      path: string;
      size: string;
      campaign?: boolean;
      style?: object;
    }) => (
      <View
        testID={`card ${path}`}
        accessibilityHint={`${size}${campaign ? " campaign" : ""}`}
        style={style}
      />
    ),
  };
});

jest.mock("@/hooks/useResponsiveMetrics", () => ({
  useResponsiveMetrics: () => ({
    spacing: (value: number) => value,
    ui: { contentMaxWidth: 420 },
  }),
}));

// Keys come back as-is, with options appended so interpolation is visible.
jest.mock("@/i18n", () => ({
  useDisplayLanguage: () => "en",
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

jest.mock("@/icons", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native") as typeof import("react-native");
  return { Icon: () => <View /> };
});

const entry = (
  path: string,
  difficulty: number,
  tag = "KlondikeFamily",
): HomeGameEntry =>
  [path, mockGame(path, difficulty, tag)] as unknown as HomeGameEntry;

/** Eleven games: two Yukon, one Sports, the rest Klondike. */
const GAMES: HomeGameEntry[] = [
  entry("/hard", 9),
  entry("/y1", 5, "YukonFamily"),
  entry("/y2", 6, "YukonFamily"),
  entry("/s1", 7, "Sports"),
  ...Array.from({ length: 7 }, (_, index) => entry(`/easy${index}`, index / 2)),
];

const NONE_DISMISSED: Record<GuideBox, boolean> = {
  easy: false,
  campaign: false,
  genres: false,
};

function renderGuide(
  overrides: Partial<React.ComponentProps<typeof StartHereGuide>> = {},
) {
  const props = {
    allEnabledGames: GAMES,
    dismissed: NONE_DISMISSED,
    showCampaign: true,
    campaignStarted: false,
    campaignNextPath: "/klondike",
    favorites: new Set<string>(),
    onToggleFavorite: jest.fn(),
    onSelectTab: jest.fn<(index: number) => void>(),
    onDismiss: jest.fn<(box: GuideBox) => void>(),
    pageSidePadding: 16,
    contentMaxWidth: 420,
    ...overrides,
  };
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<StartHereGuide {...props} />);
  });
  return { renderer, props };
}

const texts = (node: ReactTestRenderer | ReactTestInstance) =>
  ("root" in node ? node.root : node)
    .findAllByType(Text)
    .map((node) => React.Children.toArray(node.props.children).join(""));

/** Pressables, found by what they do: Pressable itself is a memo wrapper. */
const pressables = (
  renderer: ReactTestRenderer,
  match: (node: ReactTestInstance) => boolean = () => true,
) =>
  renderer.root.findAll(
    (node) =>
      typeof node.type === "function" &&
      typeof node.props.onPress === "function" &&
      match(node),
  );

const pressableByLabel = (renderer: ReactTestRenderer, label: string) => {
  const [pressable] = pressables(
    renderer,
    (node) => node.props.accessibilityLabel === label,
  );
  return pressable;
};

beforeEach(() => {
  launchCalls.length = 0;
});

describe("Start here guide", () => {
  test("shows all three boxes, with titles and bodies but no icons", () => {
    const { renderer } = renderGuide();
    const shown = texts(renderer);
    for (const box of ["easy", "campaign", "genres"]) {
      expect(shown).toContain(`guide.${box}.title`);
    }
    expect(shown).toContain("guide.easy.body");
    expect(shown).toContain("guide.campaign.body");
  });

  test("each heading shares its row with a Dismiss button, text then X", () => {
    const { renderer, props } = renderGuide();
    const dismissButtons = pressables(
      renderer,
      (node) => node.props.accessibilityLabel === "guide.dismiss",
    );
    expect(dismissButtons).toHaveLength(3);

    const [first] = dismissButtons;
    // The heading is the button's sibling, in a centred row.
    const row = first.parent!;
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({
      flexDirection: "row",
      alignItems: "center",
    });
    expect(texts(row).slice(0, 2)).toEqual([
      "guide.easy.title",
      "guide.dismiss",
    ]);

    // No background: the pressed state only dims it.
    const style = first.props.style({ pressed: false });
    expect(style.backgroundColor).toBeUndefined();

    act(() => first.props.onPress());
    expect(props.onDismiss).toHaveBeenCalledWith("easy");
  });

  test("dismissed boxes stay hidden, and nothing shows once all are", () => {
    const { renderer } = renderGuide({
      dismissed: { easy: true, campaign: false, genres: true },
    });
    expect(texts(renderer)).not.toContain("guide.easy.title");
    expect(texts(renderer)).toContain("guide.campaign.title");
    expect(texts(renderer)).not.toContain("guide.genres.title");

    const { renderer: empty } = renderGuide({
      dismissed: { easy: true, campaign: true, genres: true },
    });
    expect(empty.toJSON()).toBeNull();
  });

  test("the easy box lists the eight easiest games, easiest first", () => {
    const { renderer } = renderGuide({
      dismissed: { easy: false, campaign: true, genres: true },
    });
    const cards = renderer.root
      .findAll((node) => String(node.props.testID).startsWith("card "))
      .filter((node) => typeof node.type !== "string");
    expect(cards.map((node) => node.props.testID)).toEqual([
      ...Array.from({ length: 7 }, (_, index) => `card /easy${index}`),
      "card /y1",
    ]);
  });

  describe("Campaign box", () => {
    const campaignOnly = { easy: true, campaign: false, genres: true };

    test("shows the next Campaign game as a large card that plays in Campaign mode", () => {
      const { renderer } = renderGuide({
        dismissed: campaignOnly,
        campaignNextPath: "/yukon",
      });
      const card = renderer.root.find(
        (node) =>
          node.props.testID === "card /yukon" && typeof node.type !== "string",
      );
      expect(card.props.accessibilityHint).toBe("large campaign");
    });

    test("before starting, the button starts the Campaign at Klondike", () => {
      const { renderer } = renderGuide({ dismissed: campaignOnly });
      expect(texts(renderer)).toContain("guide.campaign.start");
      expect(texts(renderer)).not.toContain("guide.campaign.resume");

      act(() =>
        pressableByLabel(
          renderer,
          "button guide.campaign.start",
        ).props.onPress(),
      );
      expect(launchCalls).toEqual([
        [{ pathname: "/klondike", params: { mode: "nodes" } }],
      ]);
    });

    test("once started, the button resumes on the Campaign map", () => {
      const { renderer, props } = renderGuide({
        dismissed: campaignOnly,
        campaignStarted: true,
      });
      expect(texts(renderer)).toContain("guide.campaign.resume");

      act(() =>
        pressableByLabel(
          renderer,
          "button guide.campaign.resume",
        ).props.onPress(),
      );
      expect(props.onSelectTab).toHaveBeenCalledWith(NODES_HOME_TAB_INDEX);
      expect(launchCalls).toEqual([]);
    });

    test("is left out when the player is well into the Campaign", () => {
      const { renderer } = renderGuide({ showCampaign: false });
      expect(texts(renderer)).not.toContain("guide.campaign.title");
    });
  });

  describe("Collect box", () => {
    const genresOnly = { easy: true, campaign: true, genres: false };

    test("counts the games and the categories that have any", () => {
      const { renderer } = renderGuide({ dismissed: genresOnly });
      expect(texts(renderer)).toContain(
        `guide.genres.body ${JSON.stringify({ games: 11, categories: 3 })}`,
      );
    });

    test("tiles each category with its game count, alphabetically, without icons", () => {
      const { renderer } = renderGuide({ dismissed: genresOnly });
      const tiles = pressables(
        renderer,
        (node) =>
          node.props.accessibilityRole === "button" &&
          node.props.accessibilityLabel === undefined,
      );
      expect(tiles.map((tile) => texts(tile))).toEqual([
        ["tags.KlondikeFamily", 'guide.genres.gameCount {"count":8}'],
        ["tags.Sports", 'guide.genres.gameCount {"count":1}'],
        ["tags.YukonFamily", 'guide.genres.gameCount {"count":2}'],
      ]);
    });

    test("a category tile opens that category on the Collect tab", () => {
      const { renderer, props } = renderGuide({ dismissed: genresOnly });
      const [sports] = pressables(
        renderer,
        (node) => texts(node)[0] === "tags.Sports",
      );
      act(() => sports.props.onPress());
      expect(getPendingCollectTag()).toBe("Sports");
      expect(props.onSelectTab).toHaveBeenCalledWith(COLLECT_HOME_TAB_INDEX);
    });
  });
});

describe("Random Deal", () => {
  test("cards are fully opaque in the stack and fade out as they are swiped", () => {
    expect(swipeOpacity(0, 300)).toBe(1);
    expect(swipeOpacity(150, 300)).toBeCloseTo(0.5);
    expect(swipeOpacity(-150, 300)).toBeCloseTo(0.5);
    expect(swipeOpacity(300, 300)).toBe(0);
    // Flying out goes past the card's width.
    expect(swipeOpacity(-420, 300)).toBe(0);
  });

  test("stacked cards keep the home cards' usual drop shadow", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <DealMeAGame
          allEnabledGames={GAMES}
          unplayedGamePaths={[]}
          favorites={new Set()}
          pageSidePadding={16}
          contentMaxWidth={420}
        />,
      );
    });
    // Cards wait for the stack's width.
    const stack = renderer.root.find(
      (node) =>
        typeof node.type === "string" &&
        typeof node.props.onLayout === "function",
    );
    act(() =>
      stack.props.onLayout({ nativeEvent: { layout: { width: 300 } } }),
    );

    const cards = renderer.root.findAll(
      (node) =>
        typeof node.type !== "string" &&
        String(node.props.testID).startsWith("card "),
    );
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      const style = StyleSheet.flatten(card.props.style);
      expect(style).not.toHaveProperty("boxShadow");
      expect(style).not.toHaveProperty("elevation");
    }
  });
});
