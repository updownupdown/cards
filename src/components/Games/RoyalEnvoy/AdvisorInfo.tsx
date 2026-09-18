import { Text } from "@/components/common/Text";
import { useFade } from "@/hooks/useFade";
import { useGameColors } from "@/hooks/useGameColors";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { Animated, View, ViewStyle } from "react-native";
import { Button } from "../../Button/Button";
import { type PlayingCard } from "../../Cards/card-utils";
import { RoyalEnvoySuitsColorMap, RoyalEnvoyVisit } from "./RoyalEnvoyTypes";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

import { i18n } from "@/i18n";
interface AdvisorInfoProps {
  lastSelectedAdvisor?: PlayingCard;
  selectedAdvisor?: PlayingCard;
  discardFromHand: number;
  hand: PlayingCard[];
  visit: RoyalEnvoyVisit | null;
  setSelectedAdvisor: (a: PlayingCard | undefined) => void;
  doAdvisorAction: (a: PlayingCard | undefined) => void;
  advisorStyles: ViewStyle;
  cardWidth: number;
}

export const AdvisorInfo = ({
  lastSelectedAdvisor,
  selectedAdvisor,
  discardFromHand,
  hand,
  visit,
  setSelectedAdvisor,
  doAdvisorAction,
  advisorStyles,
  cardWidth,
}: AdvisorInfoProps) => {
  const { spacing } = useResponsiveMetrics();
  const { colorDark } = useGameColors();
  const { isRendered: renderAdvisorInfo, opacity: advisorInfoOpacity } =
    useFade(!!selectedAdvisor || discardFromHand !== 0, 300);

  const advisor = lastSelectedAdvisor;
  const advisorSuit = advisor?.suit;
  let advisorType = "";
  let advisorText = "";
  let buttonText = "";

  switch (advisorSuit) {
    case "hearts":
      advisorType = i18n.t("games:advisorInfo.diplomacy");
      advisorText = i18n.t("games:advisorInfo.diplomacyText");
      const cardsToDiscard = hand.filter(
        (c) => c.suit === visit?.trumpSuit,
      ).length;
      buttonText = i18n.t("games:advisorInfo.discardCards", {
        count: cardsToDiscard,
      });
      break;
    case "clubs":
      advisorType = i18n.t("games:advisorInfo.military");
      advisorText = i18n.t("games:advisorInfo.militaryText");
      const cardsToDraw = hand.filter((c) => c.suit === "clubs").length;
      buttonText = i18n.t("games:advisorInfo.drawCards", {
        count: cardsToDraw,
      });

      break;
    case "spades":
      advisorType = i18n.t("games:advisorInfo.political");
      advisorText = i18n.t("games:advisorInfo.politicalText");
      buttonText = i18n.t("games:advisorInfo.swapRuler");

      break;
    case "diamonds":
      advisorType = i18n.t("games:advisorInfo.commerce");
      advisorText = i18n.t("games:advisorInfo.commerceText");
      buttonText = i18n.t("games:advisorInfo.drawTwoCards");

      break;
    default:
      break;
  }

  if (!renderAdvisorInfo) return null;

  return (
    <Animated.View
      style={[
        flexStyles.colCentered,
        advisorStyles,
        {
          opacity: advisorInfoOpacity,
          borderRadius: cardWidth * 0.15,
          padding: cardWidth * 0.4,
          backgroundColor: colorDark,
        },
      ]}
    >
      {(advisor || discardFromHand !== 0) && (
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.flex1,
          ]}
        >
          {discardFromHand !== 0 && (
            <Text
              size="sm"
              style={[
                {
                  fontSize: cardWidth * 0.3,
                  fontFamily: FontWeight[300],
                  color: Colors.K200,
                },
              ]}
            >
              {i18n.t("games:advisorInfo.discardToContinue", {
                count: discardFromHand,
              })}
            </Text>
          )}

          {advisor && (
            <>
              <View
                style={[
                  flexStyles.colCentered,
                  flexStyles.fullWidth,
                  flexStyles.flex1,
                  {
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                    gap: spacing(6),
                  },
                ]}
              >
                <Text
                  size="sm"
                  style={[
                    {
                      fontSize: cardWidth * 0.38,
                      fontFamily: FontWeight[500],
                      color: RoyalEnvoySuitsColorMap[advisor.suit],
                    },
                  ]}
                >
                  {advisorType} {i18n.t("games:advisorInfo.advisor")}
                </Text>
                <Text
                  size="sm"
                  style={[
                    {
                      fontSize: cardWidth * 0.28,
                      fontFamily: FontWeight[300],
                      color: Colors.K200,
                    },
                  ]}
                >
                  {advisorText}
                </Text>
              </View>

              <View
                style={[
                  flexStyles.rowCentered,
                  flexStyles.fullWidth,
                  {
                    gap: spacing(20),
                  },
                ]}
              >
                <Button
                  onPress={() => setSelectedAdvisor(undefined)}
                  text={i18n.t("games:advisorInfo.cancel")}
                  textOnly
                  theme={Colors.K200}
                />
                {advisorSuit !== "spades" && (
                  <Button
                    onPress={() => doAdvisorAction(selectedAdvisor)}
                    text={buttonText}
                    style={[flexStyles.flex1]}
                    theme={
                      advisorSuit
                        ? RoyalEnvoySuitsColorMap[advisorSuit]
                        : undefined
                    }
                  />
                )}
              </View>
            </>
          )}
        </View>
      )}
    </Animated.View>
  );
};
