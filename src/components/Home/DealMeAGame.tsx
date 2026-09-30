import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import {
  HOME_CARD_HEIGHT,
  HomeCard,
  homeCardStarReach,
} from "@/components/Home/HomeCard";
import { SectionTitle } from "@/components/ui/Nocturne";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStableCallback } from "@/hooks/useStableCallback";
import { useTranslation } from "@/i18n";
import { theme } from "@/styles/styles";
import { type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** Cards visible in the stack: the top one and those peeking behind it. */
const STACK_DEPTH = 3;
/** Share of the card width a drag must pass to count as a swipe. */
const SWIPE_THRESHOLD = 0.3;
/** A quick flick counts as a swipe whatever its distance (points/s). */
const SWIPE_VELOCITY = 800;
const FLY_OUT_DURATION = 220;

type SwipeDirection = "left" | "right";

/**
 * Cards are solid in the stack, so only the next one shows beneath the top
 * card, and fade out as they are swiped away, either way.
 */
export function swipeOpacity(translateX: number, width: number) {
  "worklet";
  return Math.max(0, 1 - Math.abs(translateX) / width);
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

type DealMeAGameProps = {
  allEnabledGames: HomeGameEntry[];
  unplayedGamePaths: string[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  pageSidePadding: number;
  contentMaxWidth: number;
};

/**
 * A shuffled deck of games, dealt one at a time: swipe right (or tap) to
 * play, left to pass. Games not played yet come first.
 */
export function DealMeAGame({
  allEnabledGames,
  unplayedGamePaths,
  favorites,
  onToggleFavorite,
  pageSidePadding,
  contentMaxWidth,
}: DealMeAGameProps) {
  const { t } = useTranslation("home");
  const { spacing } = useResponsiveMetrics();
  const cardHeight = spacing(HOME_CARD_HEIGHT);
  const [cardWidth, setCardWidth] = useState(0);
  const [position, setPosition] = useState(0);
  // Buttons ask the top card to fly off, as if it had been swiped.
  const [fling, setFling] = useState<{
    direction: SwipeDirection;
    id: number;
  }>();

  // Dealt once per visit, so the order holds while the player swipes.
  const deck = useMemo(() => {
    const unplayed = new Set(unplayedGamePaths);
    return [
      ...shuffle(allEnabledGames.filter(([path]) => unplayed.has(path))),
      ...shuffle(allEnabledGames.filter(([path]) => !unplayed.has(path))),
    ];
    // Reshuffling as games get played would jump the stack around.
  }, [allEnabledGames.length]);

  // Stable, since the card's gesture worklets hold on to it.
  const onSwiped = useStableCallback(() => {
    setFling(undefined);
    setPosition((current) => current + 1);
  });

  if (deck.length === 0) return null;

  const visible = Array.from(
    { length: Math.min(STACK_DEPTH, deck.length) },
    (_, depth) => deck[(position + depth) % deck.length],
  );

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
      }}
    >
      <View style={{ paddingHorizontal: pageSidePadding }}>
        <SectionTitle
          action={
            <Text size="xs" weight={400} color={theme.dim}>
              {t("deal.intro")}
            </Text>
          }
        >
          {t("deal.title")}
        </SectionTitle>
      </View>
      <View style={{ paddingHorizontal: pageSidePadding }}>
        <View
          onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}
          style={{
            height: cardHeight + spacing(12) * (STACK_DEPTH - 1),
          }}
        >
          {cardWidth > 0 &&
            [...visible]
              .map((entry, depth) => ({ entry, depth }))
              .reverse()
              .map(({ entry, depth }) => (
                <DealtCard
                  // Keyed by deck position, so a card keeps its own drag
                  // state while it moves up the stack.
                  key={position + depth}
                  entry={entry}
                  depth={depth}
                  width={cardWidth}
                  height={cardHeight}
                  isFavorite={favorites.has(entry[0])}
                  onToggleFavorite={onToggleFavorite}
                  fling={depth === 0 ? fling : undefined}
                  onSwiped={onSwiped}
                />
              ))}
        </View>
      </View>
    </View>
  );
}

type DealtCardProps = {
  entry: HomeGameEntry;
  depth: number;
  width: number;
  height: number;
  isFavorite: boolean;
  onToggleFavorite: (path: string) => void;
  fling?: { direction: SwipeDirection; id: number };
  onSwiped: (path: string, direction: SwipeDirection) => void;
};

function DealtCard({
  entry: [path, game],
  depth,
  width,
  height,
  isFavorite,
  onToggleFavorite,
  fling,
  onSwiped,
}: DealtCardProps) {
  const { spacing } = useResponsiveMetrics();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const stackDepth = useSharedValue(depth);
  const stackOffset = spacing(18);
  const star = homeCardStarReach(spacing);
  const isTop = depth === 0;

  useEffect(() => {
    stackDepth.value = withTiming(depth, { duration: 180 });
  }, [depth, stackDepth]);

  const flyOut = (direction: SwipeDirection) => {
    "worklet";
    const sign = direction === "right" ? 1 : -1;
    translateX.value = withTiming(
      sign * width * 1.4,
      { duration: FLY_OUT_DURATION },
      (finished) => {
        if (finished) scheduleOnRN(onSwiped, path, direction);
      },
    );
  };

  useEffect(() => {
    if (fling) flyOut(fling.direction);
    // Only a new request should throw the card.
  }, [fling?.id, fling?.direction]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(isTop)
      // Horizontal drags only, so the page still scrolls under a thumb.
      .activeOffsetX([-12, 12])
      .failOffsetY([-14, 14])
      .onUpdate((event) => {
        "worklet";
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.2;
      })
      .onEnd((event) => {
        "worklet";
        const passed =
          Math.abs(event.translationX) > width * SWIPE_THRESHOLD ||
          Math.abs(event.velocityX) > SWIPE_VELOCITY;
        if (passed) {
          flyOut(event.translationX > 0 ? "right" : "left");
        } else {
          translateX.value = withTiming(0, { duration: 180 });
          translateY.value = withTiming(0, { duration: 180 });
        }
      });
    const tap = Gesture.Tap()
      .withTestId(`deal-tap ${path}`)
      .enabled(isTop)
      .onEnd((event, success) => {
        "worklet";
        if (!success) return;
        // The card is only a picture, so its star is pressed from here too.
        if (event.x >= width - star.fromRight && event.y <= star.fromTop) {
          scheduleOnRN(onToggleFavorite, path);
        } else {
          scheduleOnRN(launchGame, path as Href);
        }
      });
    return Gesture.Exclusive(pan, tap);
  }, [isTop, path, width, star.fromRight, star.fromTop, onToggleFavorite]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      {
        translateY: translateY.value + stackDepth.value * stackOffset,
      },
      { rotate: `${(translateX.value / width) * 14}deg` },
      { scale: 1 - stackDepth.value * 0.05 },
    ],
    opacity: swipeOpacity(translateX.value, width),
  }));
  return (
    // On the web the detector blocks the browser's own touch scrolling
    // unless told otherwise: vertical swipes are left to scroll the page.
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            width,
            height,
          },
          cardStyle,
        ]}
      >
        {/* The card is only a picture here: the gestures above play it. */}
        <View style={{ flex: 1, pointerEvents: "none" }}>
          <HomeCard
            path={path}
            game={game}
            isFavorite={isFavorite}
            // Keeps its usual drop shadow, which parts the cards in the stack.
            style={{ width: "100%", height }}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
