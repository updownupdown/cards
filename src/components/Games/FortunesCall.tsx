import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { useMemo } from "react";
import { View } from "react-native";
import {
  cardColor,
  createDeck,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

type Prediction = "red" | "black" | "higher" | "lower";
type GameState = {
  deck: PlayingCard[];
  anchor: PlayingCard;
  next: PlayingCard;
  discard: PlayingCard[];
  score: number;
  misses: number;
  revealed: boolean;
  lastCorrect: boolean | null;
  ended: boolean;
  won: boolean;
};

const TARGET_SCORE = 12;
const MAX_MISSES = 3;

function createInitialState(): GameState {
  const deck = shuffle(createDeck());
  const anchor = { ...deck.pop()!, faceUp: true };
  const next = { ...deck.pop()!, faceUp: false };
  return {
    deck,
    anchor,
    next,
    discard: [],
    score: 0,
    misses: 0,
    revealed: false,
    lastCorrect: null,
    ended: false,
    won: false,
  };
}

function predictionMatches(
  prediction: Prediction,
  anchor: PlayingCard,
  next: PlayingCard,
) {
  if (prediction === "red" || prediction === "black")
    return cardColor(next) === prediction;
  if (prediction === "higher") return rankValue(next) > rankValue(anchor);
  return rankValue(next) < rankValue(anchor);
}

export const fortunesCallRules = { predictionMatches };
const gameStateInitial = createInitialState();

export default function FortunesCall() {
  const { colorPale } = useGameColors();
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        const next = createInitialState();
        setGame((draft) => void Object.assign(draft, next));
      },
    });

  function predict(prediction: Prediction) {
    if (game.revealed || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.next.faceUp = true;
      draft.revealed = true;
      draft.lastCorrect = predictionMatches(
        prediction,
        draft.anchor,
        draft.next,
      );
      if (draft.lastCorrect)
        draft.score += prediction === "red" || prediction === "black" ? 1 : 2;
      else draft.misses += 1;
      draft.won = draft.score >= TARGET_SCORE;
      draft.ended = draft.won || draft.misses >= MAX_MISSES;
    });
  }

  function advance() {
    if (!game.revealed || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.discard.push(draft.anchor);
      draft.anchor = { ...draft.next, faceUp: true };
      const card = draft.deck.pop();
      if (!card) {
        draft.ended = true;
        draft.won = draft.score >= TARGET_SCORE;
        return;
      }
      draft.next = { ...card, faceUp: false };
      draft.revealed = false;
      draft.lastCorrect = null;
    });
  }

  const zones = useMemo<MapZone[]>(
    () => [
      {
        id: "anchor",
        name: "anchor",
        cards: [game.anchor],
        col: 1,
        row: 0,
        placeholder: { text: "Anchor" },
      },
      {
        id: "next",
        name: "next",
        cards: [game.next],
        col: 3,
        row: 0,
        placeholder: { text: "Next" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: 2,
        fan: { maxVisible: 1 },
        placeholder: { text: "Past" },
      },
      { id: "hud", name: "hud", col: 1, row: 2, width: 4, baseZIndex: 1 },
    ],
    [game],
  );
  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper: () => ({}),
    cardSize: "regular",
    fixedCols: 5,
    fixedRows: 4,
  });

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.score}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      <View
        style={[getZoneStylesById("hud"), { flexDirection: "column", gap: 7 }]}
      >
        <Text color={colorPale} style={{ textAlign: "center" }}>
          Score {game.score}/{TARGET_SCORE} | Misses {game.misses}/{MAX_MISSES}
        </Text>
        {game.revealed ? (
          <Button
            text={game.lastCorrect ? "Correct - Next" : "Miss - Next"}
            theme={game.lastCorrect ? "green" : "orange"}
            onPress={advance}
            disabled={game.ended}
            fullWidth
          />
        ) : (
          <View style={[flexStyles.rowCentered, { gap: 5, flexWrap: "wrap" }]}>
            <Button
              text="Red +1"
              size="sm"
              theme="red"
              onPress={() => predict("red")}
            />
            <Button
              text="Black +1"
              size="sm"
              onPress={() => predict("black")}
            />
            <Button
              text="Higher +2"
              size="sm"
              theme="green"
              onPress={() => predict("higher")}
            />
            <Button
              text="Lower +2"
              size="sm"
              theme="orange"
              onPress={() => predict("lower")}
            />
          </View>
        )}
      </View>
    </GameWrapper>
  );
}
