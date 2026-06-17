import { buttonStyles } from "@/styles/buttonStyles";
import { flexStyles } from "@/styles/flexStyles";
import { View } from "react-native";
import { Button } from "../../Button/Button";
import { type PlayingCard } from "../../Cards/card-utils";
import { CardButton } from "../../Cards/CardButtonOLD";
import { Deck } from "../../Cards/Deck";
import { EmissaryRefKeys, TheEmissaryVisit } from "./TheEmissaryCommon";

interface DebateDecksProps {
  setRef: (
    key: EmissaryRefKeys,
    index?: number | undefined,
  ) => (el: View | null) => void;
  cardWidth: number;
  cardsPerRowDebates: number;
  cardsPerRowTopic: number;
  visit: TheEmissaryVisit | null;
  drawCardToTopic: () => void;
  discardLost: PlayingCard[];
  discardWon: PlayingCard[];
  draw: PlayingCard[];
}

export const DebateDecks = ({
  cardWidth,
  draw,
  discardLost,
  discardWon,
  drawCardToTopic,
  visit,
  cardsPerRowDebates,
  cardsPerRowTopic,
  setRef,
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
        refTop={setRef("drawCurrentRef")}
        refNext={setRef("drawNextRef")}
        cards={draw}
        cardsPerRow={cardsPerRowDebates}
        cardSize="small"
        limitFan
      />

      <View style={[flexStyles.colCentered, flexStyles.gap14]}>
        {/* Current debate topic */}
        <CardButton
          ref={setRef("topicRef")}
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
        refTop={setRef("discardLostCurrentRef")}
        refNext={setRef("discardLostNextRef")}
        cards={discardLost}
        cardsPerRow={cardsPerRowDebates}
        cardSize="small"
        limitFan
      />

      {/* Discard WON Deck */}
      <Deck
        refTop={setRef("discardWonCurrentRef")}
        refNext={setRef("discardWonNextRef")}
        cards={discardWon}
        cardsPerRow={cardsPerRowDebates}
        cardSize="small"
        limitFan
      />
    </View>
  );
};
