import { Button } from "@/components/Button/Button";
import {
  getScaledTextSize,
  Typography,
  type TextSize,
  type TextWeight,
} from "@/components/common/Text";
import { GameUserStats } from "@/components/Home/GameUserStats";
import { getGameSettings, type GameSettingsMap } from "@/data/game-menu";
import type { GameRating, HexColor } from "@/data/games-data";
import { GAMES_DATA } from "@/data/games-registry";
import type { NodeDefinition, NodeVisualState } from "@/data/nodes-map";
import { setLastPlayedNode } from "@/data/nodes-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { layoutDims, rgba } from "@/styles/styles";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { type Href } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const THEME_TRANSITION_DURATION = 420;
type ReadonlyColorSharedValue = Readonly<Pick<SharedValue<string>, "value">>;

function AnimatedPanelText({
  children,
  size,
  weight,
  textTransform,
  progress,
  fromColor,
  toColor,
}: {
  children: ReactNode;
  size: TextSize;
  weight: TextWeight;
  textTransform?: "uppercase";
  progress: SharedValue<number>;
  fromColor: ReadonlyColorSharedValue;
  toColor: ReadonlyColorSharedValue;
}) {
  const { textScale } = useResponsiveMetrics();
  const fontSize = getScaledTextSize(size, textScale);
  const animatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [fromColor.value, toColor.value],
      "RGB",
    ),
  }));

  return (
    <Animated.Text
      style={[
        {
          fontSize,
          fontFamily: Typography.fontFamily[weight],
          lineHeight: fontSize * 1.3,
          flexShrink: 1,
          textTransform,
        },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.Text>
  );
}

type AnimatedRatingBarProps = {
  label: keyof GameRating;
  progress: SharedValue<number>;
  fromValue: SharedValue<number>;
  toValue: SharedValue<number>;
  fromColor: SharedValue<HexColor>;
  toColor: SharedValue<HexColor>;
  fromLabelColor: SharedValue<string>;
  toLabelColor: SharedValue<string>;
  fromTrackColor: SharedValue<string>;
  toTrackColor: SharedValue<string>;
  trackHeight: number;
};

function AnimatedRatingBar({
  label,
  progress,
  fromValue,
  toValue,
  fromColor,
  toColor,
  fromLabelColor,
  toLabelColor,
  fromTrackColor,
  toTrackColor,
  trackHeight,
}: AnimatedRatingBarProps) {
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [fromTrackColor.value, toTrackColor.value],
      "RGB",
    ),
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(
      progress.value,
      [0, 1],
      [fromValue.value, toValue.value],
    )}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [fromColor.value, toColor.value],
      "RGB",
    ),
  }));

  return (
    <View style={{ flex: 1, gap: trackHeight / 1.6 }}>
      <AnimatedPanelText
        size="xxs"
        weight={400}
        textTransform="uppercase"
        progress={progress}
        fromColor={fromLabelColor}
        toColor={toLabelColor}
      >
        {label}
      </AnimatedPanelText>
      <Animated.View
        style={[
          {
            height: trackHeight,
            borderRadius: trackHeight / 2,
            overflow: "hidden",
          },
          trackStyle,
        ]}
      >
        <Animated.View
          testID={`node-rating-${label}`}
          style={[{ height: "100%", borderRadius: trackHeight / 2 }, fillStyle]}
        />
      </Animated.View>
    </View>
  );
}

type Props = {
  node: NodeDefinition;
  state: NodeVisualState;
  settingsMap: GameSettingsMap;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
};

export function NodeDetailsPanel({
  node,
  state,
  settingsMap,
  collectedTaoIds,
  collectedQuoteIds,
}: Props) {
  const { spacing, ui } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const game = GAMES_DATA[node.path];
  const stats = getGameSettings(settingsMap, node.path).stats;
  const locked = state === "locked";
  const previousGameRef = useRef(game);
  const progress = useSharedValue(1);
  const fromDark = useSharedValue(game.gameColorDark);
  const toDark = useSharedValue(game.gameColorDark);
  const fromPale = useSharedValue(game.gameColorPale);
  const toPale = useSharedValue(game.gameColorPale);
  const fromLabel = useSharedValue(rgba(game.gameColorPale, 0.6));
  const toLabel = useSharedValue(rgba(game.gameColorPale, 0.6));
  const fromBorder = useSharedValue<string>(rgba(game.gameColorPale, 0.1));
  const toBorder = useSharedValue<string>(rgba(game.gameColorPale, 0.1));
  const fromPaleTrack = useSharedValue<string>(rgba(game.gameColorPale, 0.16));
  const toPaleTrack = useSharedValue<string>(rgba(game.gameColorPale, 0.16));
  const fromShadow = useSharedValue<string>(rgba(game.gameColorDark, 0.7));
  const toShadow = useSharedValue<string>(rgba(game.gameColorDark, 0.7));
  const fromComplexity = useSharedValue(game.rating.complexity);
  const toComplexity = useSharedValue(game.rating.complexity);
  const fromDifficulty = useSharedValue(game.rating.difficulty);
  const toDifficulty = useSharedValue(game.rating.difficulty);
  const fromLuck = useSharedValue(game.rating.luck);
  const toLuck = useSharedValue(game.rating.luck);

  useLayoutEffect(() => {
    const previousGame = previousGameRef.current;
    if (previousGame === game) return;

    fromDark.value = previousGame.gameColorDark;
    toDark.value = game.gameColorDark;
    fromPale.value = previousGame.gameColorPale;
    toPale.value = game.gameColorPale;
    fromLabel.value = rgba(previousGame.gameColorPale, 0.6);
    toLabel.value = rgba(game.gameColorPale, 0.6);
    fromBorder.value = rgba(previousGame.gameColorPale, 0.1);
    toBorder.value = rgba(game.gameColorPale, 0.1);
    fromPaleTrack.value = rgba(previousGame.gameColorPale, 0.16);
    toPaleTrack.value = rgba(game.gameColorPale, 0.16);
    fromShadow.value = rgba(previousGame.gameColorDark, 0.7);
    toShadow.value = rgba(game.gameColorDark, 0.7);
    fromComplexity.value = previousGame.rating.complexity;
    toComplexity.value = game.rating.complexity;
    fromDifficulty.value = previousGame.rating.difficulty;
    toDifficulty.value = game.rating.difficulty;
    fromLuck.value = previousGame.rating.luck;
    toLuck.value = game.rating.luck;
    previousGameRef.current = game;
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, { duration: THEME_TRANSITION_DURATION });
  }, [game, progress]);

  // Resolved outside the worklet: on native, useAnimatedStyle runs on the UI
  // thread, where plain JS helpers like spacing() aren't callable.
  const panelShadowOffset = spacing(4);
  const panelShadowBlur = spacing(18);
  const panelStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [fromDark.value, toDark.value],
      "RGB",
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [fromBorder.value, toBorder.value],
      "RGB",
    ),
    boxShadow: `0 ${panelShadowOffset}px ${panelShadowBlur}px ${interpolateColor(
      progress.value,
      [0, 1],
      [fromShadow.value, toShadow.value],
      "RGB",
    )}`,
  }));
  const foregroundFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0.35, 0.65, 1]),
  }));

  const ratingBars = [
    {
      label: "complexity" as const,
      fromValue: fromComplexity,
      toValue: toComplexity,
    },
    {
      label: "difficulty" as const,
      fromValue: fromDifficulty,
      toValue: toDifficulty,
    },
    { label: "luck" as const, fromValue: fromLuck, toValue: toLuck },
  ];

  return (
    <View
      style={{
        position: "absolute",
        right: 0,
        // The tab bar grows by the bottom safe-area inset (Android button or
        // gesture navigation), which is 0 on desktop web.
        bottom: spacing(88) + insets.bottom,
        left: 0,
        alignItems: "center",
        paddingHorizontal: spacing(layoutDims.pagePadding / 2),
        pointerEvents: "box-none",
      }}
    >
      <Animated.View
        testID="node-details-box"
        style={[
          {
            padding: spacing(18),
            gap: spacing(14),
            borderRadius: spacing(12),
            overflow: "hidden",
            width: "100%",
            maxWidth: ui.contentMaxWidth,
            borderWidth: 1,
          },
          panelStyle,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(10),
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AnimatedPanelText
              size="xl"
              weight={600}
              progress={progress}
              fromColor={fromPale}
              toColor={toPale}
            >
              {game.title}
            </AnimatedPanelText>
          </View>

          <Animated.View
            style={[
              { flexDirection: "row", gap: spacing(8), flexWrap: "wrap" },
              foregroundFadeStyle,
            ]}
          >
            {node.rewards.map((reward) => {
              const collected =
                reward.type === "tao"
                  ? collectedTaoIds.has(reward.id)
                  : collectedQuoteIds.has(reward.id);
              return (
                <Icon
                  key={`${reward.type}-${reward.id}`}
                  name={reward.type === "tao" ? "tao" : "quote"}
                  size={24}
                  color={
                    collected
                      ? game.gameColorPale
                      : rgba(game.gameColorPale, 0.2)
                  }
                />
              );
            })}
          </Animated.View>
        </View>

        <View
          style={{
            width: "100%",
            gap: spacing(12),
            flexDirection: "row",
          }}
        >
          {ratingBars.map((bar) => (
            <AnimatedRatingBar
              key={bar.label}
              label={bar.label}
              progress={progress}
              fromValue={bar.fromValue}
              toValue={bar.toValue}
              fromColor={fromPale}
              toColor={toPale}
              fromLabelColor={fromLabel}
              toLabelColor={toLabel}
              fromTrackColor={fromPaleTrack}
              toTrackColor={toPaleTrack}
              trackHeight={spacing(8)}
            />
          ))}
        </View>

        <Animated.View
          style={[
            flexStyles.rowCentered,
            { gap: spacing(20) },
            foregroundFadeStyle,
          ]}
        >
          <GameUserStats
            stats={stats}
            accentColor={game.gameColorPale}
            labelColor={rgba(game.gameColorPale, 0.6)}
            colorProgress={progress}
            fromLabelColor={fromLabel}
            toLabelColor={toLabel}
            fromValueColor={fromPale}
            toValueColor={toPale}
            style={{ width: undefined, flex: 1 }}
            showPlayed={false}
          />

          <Button
            text={locked ? undefined : "Play"}
            iconName={locked ? "lock" : undefined}
            accessibilityLabel={locked ? "Locked" : "Play"}
            size="md"
            theme={game.gameColorMid}
            iconColor={game.gameColorPale}
            disabled={locked}
            onPress={() => {
              void setLastPlayedNode(node.path);
              launchGame({
                pathname: node.path,
                params: { mode: "nodes" },
              } as Href);
            }}
            style={{ minWidth: spacing(100) }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
