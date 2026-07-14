import { Text } from "@/components/common/Text";
import {
  getGameInfo,
  normalizeGamePath,
  type GameSettings,
} from "@/data/game-menu";
import { DEFAULT_TUTORIAL_PHASE } from "@/data/games-data";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTutorialBoxLayout } from "@/hooks/useTutorialLayout";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, ContentSidePadding, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { HowToPlay } from "../Modals/GameModal";

interface Props {
  /** The current tutorial phase key; defaults to the single-phase "default". */
  phase?: string;
  /** Screen-space Y of the header bottom; the box floats just below it. */
  topOffset: number;
}

const INSTRUCTIONS_UNAVAILABLE = "Instructions unavailable";

export function TutorialBox({ phase, topOffset }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const { updateSettings } = useGameSettings(pathname);
  const { spacing, ui } = useResponsiveMetrics();
  const { active, topMargin, boxHeight } = useTutorialBoxLayout();
  const { height: viewportHeight } = useViewportDimensions();

  const [expanded, setExpanded] = useState(false);

  if (!gameInfo || !active) return null;

  const phaseKey = phase ?? DEFAULT_TUTORIAL_PHASE;
  const instruction = gameInfo.tutorial?.[phaseKey];
  const howToPlayText = gameInfo.howToPlay ?? gameInfo.briefRules;

  function setTutorialMode(value: boolean) {
    void updateSettings({ tutorialMode: value } as Partial<GameSettings>);
  }

  const expandedMaxHeight = Math.max(
    viewportHeight - topOffset - topMargin - spacing(ContentSidePadding),
    boxHeight,
  );

  return (
    <View
      style={{
        position: "absolute",
        zIndex: 11,
        top: topOffset + topMargin,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: spacing(ContentSidePadding * 0.75),
        pointerEvents: "box-none",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          height: expanded ? undefined : boxHeight,
          maxHeight: expanded ? expandedMaxHeight : boxHeight,
          borderRadius: spacing(8),
          backgroundColor: gameInfo.cardColorBg,
          boxShadow: `1px 2px 10px ${rgba(gameInfo.cardColorBg, 0.75)}, 2px 4px 20px ${rgba(gameInfo.cardColorBg, 0.6)}`,
          overflow: "hidden",
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
              paddingLeft: spacing(14),
              paddingRight: spacing(6),
              gap: spacing(12),
            },
          ]}
        >
          <Icon name="learn" size={24} color={Colors.K100} />

          <View style={[flexStyles.colStart, flexStyles.flex1, { gap: 2 }]}>
            {expanded ? (
              <Text size="lg" weight={500} color={Colors.K100}>
                Tutorial Mode
              </Text>
            ) : (
              <>
                <Text
                  size="sm"
                  weight={500}
                  color={Colors.K100}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {instruction?.text ?? INSTRUCTIONS_UNAVAILABLE}
                </Text>
              </>
            )}
          </View>

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
        </Pressable>

        {/* Expanded body: full rules + tutorial toggle */}
        {expanded && (
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{
              padding: spacing(28),
              paddingTop: spacing(14),
              gap: spacing(30),
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Full instructions, and optional tip */}
            <View
              style={[
                flexStyles.colCentered,
                flexStyles.fullWidth,
                flexStyles.gap20,
                {
                  alignItems: "flex-start",
                },
              ]}
            >
              <View
                style={[
                  flexStyles.rowCentered,
                  flexStyles.fullWidth,
                  flexStyles.spaceBetween,
                ]}
              >
                <Text
                  size="xl"
                  weight={300}
                  color={gameInfo.cardColorText}
                  style={flexStyles.flex1}
                >
                  Quick Instructions
                </Text>
                <Icon
                  name="help-outline"
                  size={32}
                  color={gameInfo.cardColorText}
                />
              </View>

              <Text
                size="md"
                weight={500}
                color={Colors.K100}
                numberOfLines={expanded ? 2 : 1}
                ellipsizeMode="tail"
              >
                {instruction?.text ?? INSTRUCTIONS_UNAVAILABLE}
              </Text>

              {instruction?.tip && (
                <Text size="md" weight={300} color={Colors.K400}>
                  {instruction.tip}
                </Text>
              )}
            </View>

            {/* Tutorial toggle */}
            <View
              style={[
                flexStyles.colStart,
                {
                  borderWidth: 1,
                  borderColor: rgba(gameInfo.cardColorText, 0.4),
                  borderRadius: spacing(10),
                  padding: spacing(18),
                  gap: spacing(8),
                },
              ]}
            >
              <Button
                text="Disable tutorial mode for this game"
                size="md"
                textOnly
                uppercase={false}
                onPress={() => setTutorialMode(false)}
              />
              <Text size="sm" weight={400} color={Colors.K300}>
                You can re-enable tutorial mode from the menu.
              </Text>
            </View>

            <HowToPlay
              howToPlayText={howToPlayText}
              headingColor={gameInfo.cardColorText}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}
