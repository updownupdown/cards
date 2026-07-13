import { Text } from "@/components/common/Text";
import { RichText } from "@/components/common/RichText";
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
import { flexStyles } from "@/styles/flexStyles";
import { modalBorderRadius, modalShadow } from "@/styles/modalStyles";
import { Colors, ContentSidePadding, rgba } from "@/styles/styles";
import { usePathname } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { Icon } from "@/icons";
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
          backgroundColor: Colors.K950,
          boxShadow: modalShadow,
          overflow: "hidden",
        }}
      >
        {/* Header row: instruction + expand/collapse toggle */}
        <View
          style={[
            flexStyles.rowCentered,
            {
              height: boxHeight,
              paddingVertical: spacing(6),
              paddingLeft: spacing(14),
              paddingRight: spacing(6),
              gap: spacing(8),
            },
          ]}
        >
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.flex1,
              { gap: spacing(12) },
            ]}
          >
            <Icon name="learn" size={20} color={Colors.K100} />

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
                    numberOfLines={expanded ? 2 : 1}
                    ellipsizeMode="tail"
                  >
                    {instruction?.text ?? INSTRUCTIONS_UNAVAILABLE}
                  </Text>

                  {instruction?.tip && (
                    <Text
                      size="xs"
                      weight={300}
                      color={Colors.K400}
                      numberOfLines={expanded ? 2 : 1}
                      ellipsizeMode="tail"
                    >
                      {instruction.tip}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          <Pressable
            onPress={() => setExpanded((prev) => !prev)}
            style={[
              flexStyles.colCentered,
              {
                width: spacing(32),
                height: "100%",
                backgroundColor: Colors.K875,
                padding: spacing(3),
                borderRadius: spacing(6),
                outline: "none",
              },
            ]}
          >
            <Icon size={24} name={expanded ? "expand-less" : "expand-more"} />
          </Pressable>
        </View>

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
            <View
              style={[
                flexStyles.colStart,
                {
                  backgroundColor: Colors.K875,
                  borderRadius: spacing(10),
                  padding: spacing(18),
                  gap: spacing(8),
                },
              ]}
            >
              <View
                style={[
                  flexStyles.colCentered,
                  flexStyles.fullWidth,
                  {
                    gap: spacing(12),
                    marginBottom: spacing(16),
                    paddingBottom: spacing(16),
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.K750,
                  },
                ]}
              >
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

              <Button
                text="Disable tutorial mode for this game"
                size="md"
                textOnly
                uppercase={false}
                onPress={() => setTutorialMode(false)}
              />
              <Text size="sm" weight={300} color={Colors.K500}>
                You can re-enable tutorial mode from the menu.
              </Text>
            </View>

            <HowToPlay howToPlayText={howToPlayText} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}
