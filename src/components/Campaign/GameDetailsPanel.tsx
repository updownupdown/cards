import { Button } from "@/components/Button/Button";
import {
  getScaledTextSize,
  toDisplayUpperCase,
  Typography,
  type TextSize,
  type TextWeight,
} from "@/components/common/Text";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { type GameRating, type HexColor } from "@/data/games-data";
import { CARD_BACK_INKS } from "@/data/card-backs";
import { GAMES_DATA } from "@/data/games-registry";
import type { GameDotDefinition, GameDotState } from "@/data/campaign-map";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { layoutDims, rgba } from "@/styles/styles";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { type Href } from "expo-router";
import { Image } from "expo-image";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
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
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

const THEME_TRANSITION_DURATION = 420;
type ReadonlyColorSharedValue = Readonly<Pick<SharedValue<string>, "value">>;

function AnimatedPanelText({
  children,
  size,
  weight,
  textTransform,
  numberOfLines,
  progress,
  fromColor,
  toColor,
}: {
  children: ReactNode;
  size: TextSize;
  weight: TextWeight;
  textTransform?: "uppercase";
  numberOfLines?: number;
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
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize,
          fontFamily: Typography.fontFamily[weight],
          lineHeight: fontSize * 1.3,
          flexShrink: 1,
        },
        animatedStyle,
      ]}
    >
      {textTransform === "uppercase" && typeof children === "string"
        ? toDisplayUpperCase(children)
        : children}
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
  const { t } = useTranslation("common");
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
        numberOfLines={1}
        progress={progress}
        fromColor={fromLabelColor}
        toColor={toLabelColor}
      >
        {t(`stats.${label}`)}
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
          testID={`game-dot-rating-${label}`}
          style={[{ height: "100%", borderRadius: trackHeight / 2 }, fillStyle]}
        />
      </Animated.View>
    </View>
  );
}

type Props = {
  gameDot: GameDotDefinition;
  state: GameDotState;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
};

export function GameDetailsPanel({
  gameDot,
  state,
  collectedTaoIds,
  collectedQuoteIds,
}: Props) {
  const { spacing, ui } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const game = GAMES_DATA[gameDot.path];
  const title = localizeGameTitle(game, gameDot.path, useDisplayLanguage());
  const { t } = useTranslation("campaign");
  const { t: tCommon } = useTranslation("common");
  const locked = state === "locked";
  const previousGameRef = useRef(game);
  const progress = useSharedValue(1);
  const fromDark = useSharedValue(rgba(game.gameColorDark, 1));
  const toDark = useSharedValue(rgba(game.gameColorDark, 1));
  const fromPale = useSharedValue(game.gameColorPale);
  const toPale = useSharedValue(game.gameColorPale);
  const fromLabel = useSharedValue(rgba(game.gameColorPale, 0.6));
  const toLabel = useSharedValue(rgba(game.gameColorPale, 0.6));
  const fromBorder = useSharedValue<string>(rgba(game.gameColorPale, 0.1));
  const toBorder = useSharedValue<string>(rgba(game.gameColorPale, 0.1));
  const fromPaleTrack = useSharedValue<string>(rgba(game.gameColorPale, 0.16));
  const toPaleTrack = useSharedValue<string>(rgba(game.gameColorPale, 0.16));
  const fromComplexity = useSharedValue(game.rating.complexity);
  const toComplexity = useSharedValue(game.rating.complexity);
  const fromDifficulty = useSharedValue(game.rating.difficulty);
  const toDifficulty = useSharedValue(game.rating.difficulty);
  const fromLuck = useSharedValue(game.rating.luck);
  const toLuck = useSharedValue(game.rating.luck);

  useLayoutEffect(() => {
    const previousGame = previousGameRef.current;
    if (previousGame === game) return;

    fromDark.value = rgba(previousGame.gameColorDark, 1);
    toDark.value = rgba(game.gameColorDark, 1);
    fromPale.value = previousGame.gameColorPale;
    toPale.value = game.gameColorPale;
    fromLabel.value = rgba(previousGame.gameColorPale, 0.6);
    toLabel.value = rgba(game.gameColorPale, 0.6);
    fromBorder.value = rgba(previousGame.gameColorPale, 0.18);
    toBorder.value = rgba(game.gameColorPale, 0.18);
    fromPaleTrack.value = rgba(previousGame.gameColorPale, 0.16);
    toPaleTrack.value = rgba(game.gameColorPale, 0.16);
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
      style={[
        pointerEventsStyles.boxNone,
        {
          position: "absolute",
          right: 0,
          // The tab bar grows by the bottom safe-area inset (Android button or
          // gesture navigation), which is 0 on desktop web.
          bottom: spacing(88) + insets.bottom,
          left: 0,
          alignItems: "center",
          paddingHorizontal: spacing(layoutDims.pagePadding / 2),
        },
      ]}
    >
      <Animated.View
        testID="game-dot-details-box"
        style={[
          {
            padding: spacing(18),
            gap: spacing(14),
            borderRadius: spacing(8),
            overflow: "hidden",
            width: "100%",
            maxWidth:
              ui.contentMaxWidth - spacing(layoutDims.pagePadding / 2) * 2,
            borderWidth: 1,
            ...homeSurfaceShadow(spacing),
          },
          panelStyle,
        ]}
      >
        {/* The game's thumbnail behind everything, faded in once loaded to a
            low opacity over the panel's own opaque colour, so the text and
            controls stand out. */}
        <Image
          source={game.thumbnail && GAME_THUMBNAIL_ASSETS[game.thumbnail]}
          cachePolicy="memory"
          contentFit="cover"
          transition={500}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.2,
          }}
        />
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
              {title}
            </AnimatedPanelText>
          </View>

          <Animated.View
            style={[
              { flexDirection: "row", gap: spacing(8), flexWrap: "wrap" },
              foregroundFadeStyle,
            ]}
          >
            {gameDot.rewards.map((reward) => {
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

        <Animated.View
          style={[
            flexStyles.rowCentered,
            { width: "100%", gap: spacing(16) },
            foregroundFadeStyle,
          ]}
        >
          <View
            style={{
              flex: 1,
              gap: spacing(10),
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

          <Button
            text={locked ? undefined : tCommon("play")}
            iconName={locked ? "lock" : undefined}
            accessibilityLabel={locked ? t("details.locked") : tCommon("play")}
            size="md"
            theme={CARD_BACK_INKS[game.cardBack]}
            iconColor={game.gameColorPale}
            disabled={locked}
            onPress={() => {
              void setLastPlayedGameDot(gameDot.path);
              launchGame({
                pathname: gameDot.path,
                params: { mode: "campaign" },
              } as Href);
            }}
            style={{ minWidth: spacing(100) }}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
