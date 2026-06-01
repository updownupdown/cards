import { useFade } from "@/hooks/useFade";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { Animated, Text, View } from "react-native";
import { Button } from "../../Button/Button";
import { type PlayingCard } from "../../Cards/card-utils";
import {
  debateRecordsHeight,
  EmissarySuitsColorMap,
  TheEmissaryVisit,
} from "./TheEmissaryCommon";

interface AdvisorInfoProps {
  lastSelectedAdvisor?: PlayingCard;
  selectedAdvisor?: PlayingCard;
  discardFromHand: number;
  hand: PlayingCard[];
  visit: TheEmissaryVisit | null;
  setSelectedAdvisor: (a: PlayingCard | undefined) => void;
  doAdvisorAction: (a: PlayingCard | undefined) => void;
}

export const AdvisorInfo = ({
  lastSelectedAdvisor,
  selectedAdvisor,
  discardFromHand,
  hand,
  visit,
  setSelectedAdvisor,
  doAdvisorAction,
}: AdvisorInfoProps) => {
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
        {
          opacity: advisorInfoOpacity,
          position: "absolute",
          zIndex: 10,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: rgba(Colors.K850, 0.9),
        },
      ]}
    >
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          flexStyles.flex1,
          {
            borderRadius: 20,
            padding: 20,
            maxHeight: 190,
            backgroundColor: Colors.K900,
            boxShadow: `1px 2px 12px ${Colors.K900}, 2px 4px 24px ${Colors.K900}`,
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
                style={[
                  textStyles.default,
                  {
                    fontSize: 20,
                    fontFamily: FontWeight[300],
                    color: Colors.K100,
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
                    style={[
                      textStyles.default,
                      {
                        fontSize: 20,
                        fontFamily: FontWeight[600],
                        color: EmissarySuitsColorMap[advisor.suit],
                      },
                    ]}
                  >
                    {advisorType} Advisor
                  </Text>
                  <Text
                    style={[
                      textStyles.default,
                      {
                        fontSize: 16,
                        fontFamily: FontWeight[300],
                        color: Colors.K100,
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
                    style={[{ borderWidth: 0 }]}
                  />
                  {advisorSuit !== "spades" && (
                    <Button
                      onPress={() => doAdvisorAction(selectedAdvisor)}
                      text={buttonText}
                      style={[flexStyles.flex1]}
                    />
                  )}
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export const ChooseKingdomOverlay = ({
  showChooseKingdom,
}: {
  showChooseKingdom: boolean;
}) => {
  const { isRendered: renderChooseKingdom, opacity: chooseKingdomOpacity } =
    useFade(showChooseKingdom, 300);

  if (!renderChooseKingdom) return null;

  return (
    <Animated.View
      style={[
        flexStyles.colCentered,
        {
          opacity: chooseKingdomOpacity,
          position: "absolute",
          zIndex: 10,
          top: 0,
          left: 0,
          right: 0,
          height: debateRecordsHeight,
          backgroundColor: Colors.K850,
        },
      ]}
    >
      <Text
        style={[
          textStyles.default,
          {
            fontSize: 18,
            fontFamily: FontWeight[300],
            color: Colors.K300,
          },
        ]}
      >
        Choose a kingdom
      </Text>
    </Animated.View>
  );
};
