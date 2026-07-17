import { Button } from "@/components/Button/Button";
import { HomeCard } from "@/components/Home/HomeCard";
import { useFade } from "@/hooks/useFade";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, type LayoutChangeEvent, View } from "react-native";
import { RadioButtons } from "../common/RadioButtons";
import { DICE_ROLL_DURATION, RollingDice } from "./RollingDice";

type Mode = "all" | "unplayed";

type RandomGameRollerProps = {
  allEntries: HomeGameEntry[];
  unplayedEntries: HomeGameEntry[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  contentMaxWidth: number;
  pageSidePadding: number;
  /** Current scroll offset of the parent ScrollView. */
  scrollY: number;
  /** Height of the visible viewport. */
  viewportHeight: number;
};

export function RandomGameRoller({
  allEntries,
  unplayedEntries,
  favorites,
  onToggleFavorite,
  contentMaxWidth,
  pageSidePadding,
  scrollY,
  viewportHeight,
}: RandomGameRollerProps) {
  const { spacing } = useResponsiveMetrics();

  const [mode, setMode] = useState<Mode>("all");
  const [entry, setEntry] = useState<HomeGameEntry | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);

  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRolledInViewRef = useRef(false);
  const [layoutTop, setLayoutTop] = useState<number | null>(null);

  const fallbackHeight = spacing(170);
  const diceContainerHeight = Math.max(cardHeight, fallbackHeight);

  const showCard = !rolling && !!entry;
  const showDice = rolling || !entry;
  const { isRendered: isCardRendered, opacity: cardOpacity } =
    useFade(showCard);
  const { isRendered: isDiceRendered, opacity: diceOpacity } =
    useFade(showDice);

  const pickRandom = useCallback((entries: HomeGameEntry[]) => {
    if (entries.length === 0) return null;
    return entries[Math.floor(Math.random() * entries.length)];
  }, []);

  const roll = useCallback(
    (targetMode: Mode) => {
      const source = targetMode === "all" ? allEntries : unplayedEntries;
      const next = pickRandom(source);
      if (!next) return;

      setRolling(true);

      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
      rollTimeoutRef.current = setTimeout(() => {
        setEntry(next);
        setRollKey((prev) => prev + 1);
        setRolling(false);
        rollTimeoutRef.current = null;
      }, DICE_ROLL_DURATION);
    },
    [allEntries, unplayedEntries, pickRandom],
  );

  // Roll for the first time when scrolled into view.
  useEffect(() => {
    if (hasRolledInViewRef.current) return;
    if (layoutTop === null || viewportHeight === 0) return;

    const isInView = scrollY + viewportHeight > layoutTop + spacing(80);
    if (isInView) {
      hasRolledInViewRef.current = true;
      roll(mode);
    }
  }, [scrollY, viewportHeight, layoutTop, roll, mode]);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const onLayout = (event: LayoutChangeEvent) => {
    setLayoutTop(event.nativeEvent.layout.y);
  };

  const onSelectMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    roll(nextMode);
  };

  const onReroll = () => roll(mode);

  return (
    <View
      onLayout={onLayout}
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
        paddingHorizontal: pageSidePadding,
        gap: spacing(20),
      }}
    >
      {/* All / Unplayed toggle */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          {
            gap: spacing(20),
          },
        ]}
      >
        <RadioButtons
          options={[
            { value: "all", label: "All" },
            { value: "unplayed", label: "Unplayed" },
          ]}
          selectedValue={mode}
          onChange={(value) => {
            onSelectMode(value as "all" | "unplayed");
          }}
          selectedBackgroundColor={Colors.suitsRed}
          buttonStyle={{
            height: spacing(38),
          }}
          textStyle={{
            fontSize: spacing(16),
          }}
          containerStyle={{
            backgroundColor: Colors.K900,
          }}
        />

        {/* Reroll button */}
        <Button
          text="Roll"
          iconName="dice"
          uppercase={false}
          size="lg"
          onPress={onReroll}
          style={{ flex: 1 }}
        />
      </View>

      {/* Game card / dice animation */}
      <View
        style={{
          width: "100%",
          minHeight: diceContainerHeight,
          position: "relative",
        }}
      >
        {isCardRendered && entry && (
          <Animated.View
            onLayout={(event: LayoutChangeEvent) =>
              setCardHeight(event.nativeEvent.layout.height)
            }
            style={{ width: "100%", opacity: cardOpacity }}
          >
            <HomeCard
              path={entry[0]}
              game={entry[1]}
              size="large"
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.has(entry[0])}
              style={{ width: "100%" }}
            />
          </Animated.View>
        )}

        {isDiceRendered && (
          <Animated.View
            style={[
              flexStyles.colCentered,
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                minHeight: diceContainerHeight,
                borderRadius: spacing(8),
                backgroundColor: Colors.background,
                opacity: diceOpacity,
              },
            ]}
          >
            <RollingDice rollKey={rollKey} rolling={rolling} />
          </Animated.View>
        )}
      </View>
    </View>
  );
}
