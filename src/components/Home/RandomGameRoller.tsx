import { Button } from "@/components/Button/Button";
import { HomeCard } from "@/components/Home/HomeCard";
import type { GameSettingsMap } from "@/data/game-menu";
import { useFade } from "@/hooks/useFade";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, View } from "react-native";
import { RadioButtons } from "../common/RadioButtons";
import { DICE_ROLL_DURATION, RollingDice } from "./RollingDice";

type Mode = "all" | "unplayed";

type RandomGameRollerProps = {
  allEntries: HomeGameEntry[];
  unplayedEntries: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  isActive: boolean;
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  contentMaxWidth: number;
  pageSidePadding: number;
};

export function RandomGameRoller({
  allEntries,
  unplayedEntries,
  settingsMap,
  isActive,
  favorites,
  onToggleFavorite,
  contentMaxWidth,
  pageSidePadding,
}: RandomGameRollerProps) {
  const { spacing } = useResponsiveMetrics();

  const [mode, setMode] = useState<Mode>("all");
  const [entries, setEntries] = useState<HomeGameEntry[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);

  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  const showCard = !rolling && entries.length > 0;
  const showDice = rolling || entries.length === 0;
  const { isRendered: isCardRendered, opacity: cardOpacity } =
    useFade(showCard);
  const { isRendered: isDiceRendered, opacity: diceOpacity } =
    useFade(showDice);

  const pickRandom = useCallback((source: HomeGameEntry[]) => {
    const available = [...source];
    const selected: HomeGameEntry[] = [];

    while (available.length > 0 && selected.length < 2) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available[index]);
      available.splice(index, 1);
    }

    return selected;
  }, []);

  const roll = useCallback(
    (targetMode: Mode) => {
      const source = targetMode === "all" ? allEntries : unplayedEntries;
      const next = pickRandom(source);
      if (next.length === 0) return;

      setRolling(true);

      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
      rollTimeoutRef.current = setTimeout(() => {
        setEntries(next);
        setRollKey((prev) => prev + 1);
        setRolling(false);
        rollTimeoutRef.current = null;
      }, DICE_ROLL_DURATION);
    },
    [allEntries, unplayedEntries, pickRandom],
  );

  useEffect(() => {
    if (!isActive || hasStartedRef.current || allEntries.length === 0) return;
    hasStartedRef.current = true;
    roll(mode);
  }, [allEntries.length, isActive, mode, roll]);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  const onSelectMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    roll(nextMode);
  };

  const onReroll = () => roll(mode);

  return (
    <View
      style={{
        width: "100%",
        maxWidth: contentMaxWidth,
        alignSelf: "center",
        flex: 1,
        paddingHorizontal: pageSidePadding,
        gap: spacing(20),
      }}
    >
      <View
        style={[
          flexStyles.colCentered,
          {
            flex: 1,
            width: "100%",
            position: "relative",
            gap: spacing(20),
          },
        ]}
      >
        {isCardRendered &&
          entries.map(([path, game]) => (
            <Animated.View
              key={path}
              style={{
                // flex: 1,
                justifyContent: "center",
                gap: spacing(20),
                width: "100%",
                opacity: cardOpacity,
              }}
            >
              <HomeCard
                path={path}
                game={game}
                size="large"
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
                style={{ width: "100%" }}
                showCompleted={!!settingsMap[path]?.stats.wins}
              />
            </Animated.View>
          ))}

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

      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          { gap: spacing(20) },
        ]}
      >
        <RadioButtons
          options={[
            { value: "all", label: "All" },
            { value: "unplayed", label: "Unplayed" },
          ]}
          selectedValue={mode}
          onChange={(value) => onSelectMode(value as Mode)}
          textStyle={{ fontSize: spacing(16) }}
          buttonStyle={{
            height: spacing(40),
            borderRadius: spacing(20),
            paddingHorizontal: spacing(24),
          }}
          containerStyle={{
            backgroundColor: Colors.K950,
            height: spacing(52),
            borderRadius: spacing(26),
            padding: spacing(6),
          }}
        />

        <Button
          text="Roll"
          iconName="dice"
          uppercase={false}
          size="lg"
          onPress={onReroll}
          disabled={rolling}
          style={{ flex: 1, height: spacing(52), borderRadius: spacing(26) }}
          theme={Colors.suitsRed}
        />
      </View>
    </View>
  );
}
