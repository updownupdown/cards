import { Text } from "@/components/common/Text";
import { useFade } from "@/hooks/useFade";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { Animated, View, ViewStyle } from "react-native";
import { Button } from "../../Button/Button";
import { type PlayingCard } from "../../Cards/card-utils";
import { EmissarySuitsColorMap, TheEmissaryVisit } from "./TheEmissaryTypes";

interface AdvisorInfoProps {
  lastSelectedAdvisor?: PlayingCard;
  selectedAdvisor?: PlayingCard;
  discardFromHand: number;
  hand: PlayingCard[];
  visit: TheEmissaryVisit | null;
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
  const { zoneBg } = useGameZoneBackground();
  const { isRendered: renderAdvisorInfo, opacity: advisorInfoOpacity } =
    useFade(!!selectedAdvisor || discardFromHand !== 0, 300);

  const advisor = lastSelectedAdvisor;
  const advisorSuit = advisor?.suit;
  let advisorType = "";
  let advisorText = "";
  let buttonText = "";

  switch (advisorSuit) {
    case "hearts":
      advisorType = "Diplomacy";
      advisorText =
        "Discard all cards in your hand that match the current kingdom's trump suit.";
      const cardsToDiscard = hand.filter(
        (c) => c.suit === visit?.trumpSuit,
      ).length;
      buttonText = `Discard ${cardsToDiscard} card${cardsToDiscard > 1 ? "s" : ""}`;
      break;
    case "clubs":
      advisorType = "Military";
      advisorText = "Draw a card for each club in your hand.";
      const cardsToDraw = hand.filter((c) => c.suit === "clubs").length;
      buttonText = `Draw ${cardsToDraw} card${cardsToDraw > 1 ? "s" : ""}`;

      break;
    case "spades":
      advisorType = "Political";
      advisorText =
        "Select a ruler from an unvisisted kindgom above to swap with the current ruler.";
      buttonText = "Swap ruler";

      break;
    case "diamonds":
      advisorType = "Commerce";
      advisorText =
        "Draw two cards, then choose and discard two cards from your hand.";
      buttonText = "Draw cards";

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
          backgroundColor: zoneBg,
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
              {`Discard ${discardFromHand} card${discardFromHand > 1 ? "s" : ""} to continue`}
            </Text>
          )}

          {advisor && (
            <>
              <View
                style={[
                  flexStyles.colCentered,
                  flexStyles.fullWidth,
                  flexStyles.flex1,
                  flexStyles.gap6,
                  { alignItems: "flex-start", justifyContent: "flex-start" },
                ]}
              >
                <Text
                  size="sm"
                  style={[
                    {
                      fontSize: cardWidth * 0.38,
                      fontFamily: FontWeight[500],
                      color: EmissarySuitsColorMap[advisor.suit],
                    },
                  ]}
                >
                  {advisorType} Advisor
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
                  flexStyles.gap20,
                ]}
              >
                <Button
                  onPress={() => setSelectedAdvisor(undefined)}
                  text="Cancel"
                  theme={Colors.K200}
                  style={[{ borderWidth: 0 }]}
                />
                {advisorSuit !== "spades" && (
                  <Button
                    onPress={() => doAdvisorAction(selectedAdvisor)}
                    text={buttonText}
                    style={[flexStyles.flex1]}
                    theme={
                      advisorSuit
                        ? EmissarySuitsColorMap[advisorSuit]
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
