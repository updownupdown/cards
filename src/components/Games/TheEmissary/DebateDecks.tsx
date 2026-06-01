import { buttonStyles } from "@/styles/buttonStyles";
import { flexStyles } from "@/styles/flexStyles";
import { View } from "react-native";
import { Button } from "../../Button/Button";
import { type PlayingCard } from "../../Cards/card-utils";
import { CardButton } from "../../Cards/CardButton";
import { Deck } from "../../Cards/Deck";
import { TheEmissaryVisit } from "./TheEmissaryCommon";

interface DebateDecksProps {
  cardWidth: number;
  cardsPerRowDebates: number;
  cardsPerRowTopic: number;
  visit: TheEmissaryVisit | null;
  drawCardToTopic: () => void;
  discardLost: PlayingCard[];
  discardWon: PlayingCard[];
  draw: PlayingCard[];
  topicRef: React.RefObject<View | null>;
  drawCurrentRef: React.RefObject<View | null>;
  drawNextRef: React.RefObject<View | null>;
  discardLostCurrentRef: React.RefObject<View | null>;
  discardLostNextRef: React.RefObject<View | null>;
  discardWonCurrentRef: React.RefObject<View | null>;
  discardWonNextRef: React.RefObject<View | null>;
}

export const DebateDecks = ({
  topicRef,
  drawCurrentRef,
  drawNextRef,
  discardLostCurrentRef,
  discardLostNextRef,
  discardWonCurrentRef,
  discardWonNextRef,
  cardWidth,
  draw,
  discardLost,
  discardWon,
  drawCardToTopic,
  visit,
  cardsPerRowDebates,
  cardsPerRowTopic,
}: DebateDecksProps) => {
  return (
    <View
      style={[
        flexStyles.rowCentered,
        flexStyles.fullWidth,
        flexStyles.flex1,
        flexStyles.spaceBetween,
        {
          position: "relative",
          zIndex: 1,
          padding: 14,
        },
      ]}
    >
      {/* Draw Deck */}
      <Deck
        refTopCurrent={drawCurrentRef}
        refTopNext={drawNextRef}
        cards={draw}
        cardsPerRow={cardsPerRowDebates}
        cardSize="small"
        limitFan
      />

      <View style={[flexStyles.colCentered, flexStyles.gap14]}>
        {/* Current debate topic */}
        <CardButton
          ref={topicRef}
          card={visit?.debateTopic}
          cardsPerRow={cardsPerRowTopic}
          cardSize="small"
          isPlaceholder={!visit?.debateTopic}
          onPress={undefined}
          placeholderContent={
            !visit || visit?.debateTopic ? undefined : (
              <Button
                onPress={drawCardToTopic}
                text="Next Topic"
                disabled={visit === null || visit.debateTopic !== undefined}
                style={[
                  buttonStyles.cardPlaceholderContentBtn,
                  {
                    borderRadius: cardWidth * 0.1,
                    pointerEvents:
                      visit.debateTopic === undefined ? undefined : "none",
                  },
                ]}
              />
            )
          }
        />
      </View>

      {/* Discard LOST Deck */}
      <Deck
        refTopCurrent={discardLostCurrentRef}
        refTopNext={discardLostNextRef}
        cards={discardLost}
        cardsPerRow={cardsPerRowDebates}
        cardSize="small"
        limitFan
      />

      {/* Discard WON Deck */}
      <Deck
        refTopCurrent={discardWonCurrentRef}
        refTopNext={discardWonNextRef}
        cards={discardWon}
        cardsPerRow={cardsPerRowDebates}
        cardSize="small"
        limitFan
      />
    </View>
  );
};
