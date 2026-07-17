import { Text } from "@/components/common/Text";
import { INSTRUCTIONS_UNAVAILABLE } from "@/constants/constants";
import {
  getGameInfo,
  normalizeGamePath,
  type GameSettings,
} from "@/data/game-menu";
import { DEFAULT_TIP_PHASE } from "@/data/games-data";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTipsBoxLayout } from "@/hooks/useTipsLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { layoutDims, Colors, rgba, LayerZIndexes } from "@/styles/styles";
import { lightenHexColor } from "@/utils/utils";
import { usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HowToPlay } from "../Modals/GameModal";

interface Props {
  /** The current tip phase key; defaults to the single-phase "default". */
  phase?: string;
  /** Screen-space Y of the header bottom; the box floats just below it. */
  topOffset: number;
}

export function TipsBox({ phase, topOffset }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { updateSettings } = useGameSettings(pathname);
  const { spacing, ui } = useResponsiveMetrics();
  const { active, boxHeight } = useTipsBoxLayout();
  const { height: viewportHeight } = useViewportDimensions();
  const insets = useSafeAreaInsets();

  const [expanded, setExpanded] = useState(false);

  if (!gameInfo || !active) return null;

  const phaseKey = phase ?? DEFAULT_TIP_PHASE;
  const instruction = gameInfo.tip?.[phaseKey];

  function setTipsMode(value: boolean) {
    void updateSettings({ tipsMode: value } as Partial<GameSettings>);
  }

  const expandedMaxHeight = Math.max(
    viewportHeight -
      topOffset -
      spacing(layoutDims.pagePadding) -
      insets.bottom,
    boxHeight,
  );

  return (
    <View
      style={{
        position: "absolute",
        zIndex: LayerZIndexes.tipsContainer,
        top: topOffset,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: spacing(layoutDims.pagePadding / 2),
        pointerEvents: "box-none",
      }}
    >
      <View
        style={{
          transitionDuration: "0.6s",
          transitionProperty: "background-color",
          transitionTimingFunction: "ease",
          width: "100%",
          zIndex: LayerZIndexes.tipsCard,
          maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
          height: expanded ? undefined : boxHeight,
          maxHeight: expanded ? expandedMaxHeight : boxHeight,
          paddingHorizontal: spacing(layoutDims.pagePadding / 8),
          borderRadius: boxHeight / 2,
          backgroundColor: rgba(gameInfo.cardColorBg, expanded ? 1 : 0.8),
          boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.black, 0.3)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
            Colors.black,
            0.3,
          )}`,
        }}
      >
        {/* Header row: instruction + expand/collapse toggle */}
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={[
            flexStyles.rowCentered,
            {
              height: boxHeight,
              paddingVertical: spacing(6),
              paddingLeft: spacing(6),
              paddingRight: spacing(12),
              gap: spacing(8),
              outline: "none",
            },
          ]}
        >
          <View
            style={[
              flexStyles.colCentered,
              {
                width: spacing(32),
                height: "100%",
                padding: spacing(3),
                outline: "none",
              },
            ]}
          >
            <Icon size={24} name={expanded ? "expand-less" : "expand-more"} />
          </View>

          <View style={[flexStyles.colCentered, flexStyles.flex1]}>
            {expanded ? (
              <View
                style={[
                  flexStyles.rowCentered,
                  flexStyles.fullWidth,
                  {
                    gap: spacing(8),
                  },
                ]}
              >
                <Icon
                  name="info-outline"
                  size={20}
                  color={gameInfo.cardColorText}
                />
                <Text size="md" weight={300} color={gameInfo.cardColorText}>
                  Quick Tips
                </Text>
              </View>
            ) : (
              <Text
                size="sm"
                weight={400}
                color={Colors.K100}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {instruction ?? INSTRUCTIONS_UNAVAILABLE}
              </Text>
            )}
          </View>

          <Pressable onPress={() => setTipsMode(false)}>
            <Icon name="close" size={24} color={Colors.K100} />
          </Pressable>
        </Pressable>

        {/* Expanded body: full rules + quick tips toggle */}
        {expanded && (
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{
              padding: spacing(24),
              paddingTop: 0,
              paddingBottom: spacing(50),
              gap: spacing(30),
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Full instructions, and optional tip */}
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.fullWidth,
                {
                  alignItems: "flex-start",
                  gap: spacing(12),
                  padding: spacing(24),
                  borderRadius: spacing(20),
                  backgroundColor: lightenHexColor(gameInfo.cardColorBg, 0.1),
                },
              ]}
            >
              <Text
                size="lg"
                weight={400}
                color={Colors.K100}
                lineHeight={1.4}
                ellipsizeMode="tail"
              >
                {instruction ?? INSTRUCTIONS_UNAVAILABLE}
              </Text>
            </View>

            {/* How to Play */}
            <HowToPlay
              howToPlayText={gameInfo.howToPlay ?? [INSTRUCTIONS_UNAVAILABLE]}
              headingColor={gameInfo.cardColorText}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}
