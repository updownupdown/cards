import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { rotatedText, textStyles } from "@/styles/textStyles";
import { Text, TextStyle, View, ViewStyle } from "react-native";
import { CardOLD, CardGrid } from "../../Cards/CardOLD";
import { type PlayingCard } from "../../Cards/card-utils";
import {
  EmissaryRefKeys,
  EmissarySuitsColorMap,
  TheEmissaryVisit,
} from "./TheEmissaryCommon";
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

interface EmissaryHandProps {
  setRef: (
    key: EmissaryRefKeys,
    index?: number | undefined,
  ) => (el: View | null) => void;
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
  animatingCardIds: string[];
}

export const EmissaryHand = ({
  setRef,
  animatingCardIds,
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
            backgroundColor: Colors.K875,
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
          {/* {advisors.map((card, i) => {
            const isAnimatingCard = animatingCardIds.includes(card.id);

            return (
              <CardButton
                key={card.id}
                ref={setRef("advisorsRefs", i)}
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
          })} */}
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

            return null;

            // return (
            //   <CardButton
            //     key={card.id}
            //     ref={setRef("handRefs", i)}
            //     onPress={() => {
            //       if (discardFromHand === 0) {
            //         debateWithCard(card);
            //       } else {
            //         discardCard(card);
            //       }
            //     }}
            //     card={card}
            //     cardsPerRow={cardsPerRow}
            //     cardSize="small"
            //     disabled={isDisabled}
            //     selectColor={
            //       potentialDiscard ? EmissarySuitsColorMap["hearts"] : "blue"
            //     }
            //     forceOverlay={potentialDiscard}
            //     forceSelectColor={potentialDiscard}
            //     style={[
            //       animatingCardIds.includes(card.id) && cardStyles.animHide,
            //     ]}
            //   />
            // );
          })}
          <CardOLD
            card={undefined}
            ref={setRef("futureHandRef")}
            cardsPerRow={cardsPerRow}
            isPlaceholder
            style={[
              {
                height: 0,
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
