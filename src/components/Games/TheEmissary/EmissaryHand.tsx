import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { Text, TextStyle, View, ViewStyle } from "react-native";
import { Card, CardGrid } from "../../Cards/Card";
import { type PlayingCard } from "../../Cards/card-utils";
import { CardButton } from "../../Cards/CardButton";
import { EmissarySuitsColorMap, TheEmissaryVisit } from "./TheEmissaryCommon";
import { cardStyles } from "@/styles/cardStyles";

const cardBlock: ViewStyle[] = [
  flexStyles.colCentered,
  flexStyles.fullWidth,
  flexStyles.gap12,
  {
    position: "relative",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
];

const rotatedText: TextStyle[] = [
  textStyles.default,
  {
    pointerEvents: "none",
    width: 80,
    height: 80,
    fontSize: 14,
    position: "absolute",
    top: "50%",
    left: 8,
    textAlign: "center",
    transformOrigin: "top center",
    transform: [{ rotate: `-90deg` }, { translateY: "-50%" }],
  },
];

interface EmissaryHandProps {
  selectedAdvisor?: PlayingCard;
  advisors: PlayingCard[];
  hand: PlayingCard[];
  discardFromHand: number;
  cardsPerRow: number;
  visit: TheEmissaryVisit | null;
  setSelectedAdvisor: (a: PlayingCard | undefined) => void;
  discardCard: (c: PlayingCard) => void;
  debateWithCard: (c: PlayingCard) => void;
  canDebateWithCard: (
    h: PlayingCard[],
    t: PlayingCard | undefined,
    c: PlayingCard,
  ) => boolean;
  futureAdvisorRef: React.RefObject<View | null>;
  futureHandRef: React.RefObject<View | null>;
  advisorsRefs: React.RefObject<(View | null)[]>;
  handRefs: React.RefObject<(View | null)[]>;
  animatingCardIds: string[];
}

export const EmissaryHand = ({
  animatingCardIds,
  futureAdvisorRef,
  futureHandRef,
  advisorsRefs,
  handRefs,
  selectedAdvisor,
  discardFromHand,
  advisors,
  hand,
  cardsPerRow,
  discardCard,
  debateWithCard,
  canDebateWithCard,
  visit,
  setSelectedAdvisor,
}: EmissaryHandProps) => {
  return (
    <>
      <View
        style={[
          ...cardBlock,
          {
            backgroundColor: Colors.K900,
          },
        ]}
      >
        <Text style={rotatedText}>Advisors</Text>
        <View
          style={[
            transitionStyles.sec02,
            {
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              opacity: !visit || visit?.debateTopic ? 0.5 : 1,
            },
          ]}
        >
          {advisors.map((card, i) => {
            const isAnimatingCard = animatingCardIds.includes(card.id);

            return (
              <CardButton
                key={card.id}
                ref={(el) => {
                  advisorsRefs.current[i] = el;
                }}
                onPress={() => {
                  setSelectedAdvisor(
                    selectedAdvisor === card ? undefined : card,
                  );
                }}
                card={card}
                cardsPerRow={cardsPerRow}
                cardSize="small"
                isSelected={!isAnimatingCard && selectedAdvisor === card}
                disabled={
                  discardFromHand !== 0 ||
                  !visit ||
                  !!visit.debateTopic ||
                  !card.faceUp
                }
                selectColor={EmissarySuitsColorMap[card.suit]}
                isPlaceholder={isAnimatingCard}
              />
            );
          })}
        </View>
      </View>

      <View style={[...cardBlock]}>
        <CardGrid
          cardsPerRow={cardsPerRow}
          style={[{ justifyContent: "center" }]}
        >
          {hand.map((card, i) => {
            const isDisabled =
              discardFromHand === 0 &&
              !canDebateWithCard(hand, visit?.debateTopic ?? undefined, card);

            const diplomacySelected =
              selectedAdvisor && selectedAdvisor.suit === "hearts";
            const currentTrump = visit?.trumpSuit;
            const potentialDiscard =
              diplomacySelected && card.suit === currentTrump;

            return (
              <CardButton
                key={card.id}
                ref={(el) => {
                  handRefs.current[i] = el;
                }}
                onPress={() => {
                  if (discardFromHand === 0) {
                    debateWithCard(card);
                  } else {
                    discardCard(card);
                  }
                }}
                card={card}
                cardsPerRow={cardsPerRow}
                cardSize="small"
                disabled={isDisabled}
                selectColor={
                  potentialDiscard ? EmissarySuitsColorMap["hearts"] : "blue"
                }
                forceOverlay={potentialDiscard}
                forceSelectColor={potentialDiscard}
                style={[
                  animatingCardIds.includes(card.id) && cardStyles.animHide,
                ]}
              />
            );
          })}
          <Card
            card={undefined}
            ref={futureHandRef}
            cardsPerRow={cardsPerRow}
            isPlaceholder
            style={[
              {
                width: 0,
                overflow: "hidden",
                marginRight: -12,
                boxShadow: "unset",
                backgroundColor: "unset",
              },
            ]}
          />
        </CardGrid>
      </View>
    </>
  );
};
