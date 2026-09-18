import { Button } from "@/components/Button/Button";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import {
  cardColor,
  createDeck,
  flipToBack,
  flipToFace,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

import { i18n } from "@/i18n";
type Prediction = "red" | "black" | "higher" | "lower";
type GameState = {
  deck: PlayingCard[];
  anchor: PlayingCard | null;
  next: PlayingCard | null;
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
  return {
    deck: shuffle(createDeck()).map(flipToBack),
    anchor: null,
    next: null,
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
  const { spacing } = useResponsiveMetrics();
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => {
          const cards = [
            ...draft.deck,
            ...(draft.anchor ? [draft.anchor] : []),
            ...(draft.next ? [draft.next] : []),
            ...draft.discard,
          ];
          draft.deck = shuffle(cards.map(flipToBack));
          draft.anchor = null;
          draft.next = null;
          draft.discard = [];
          draft.score = 0;
          draft.misses = 0;
          draft.revealed = false;
          draft.lastCorrect = null;
          draft.ended = false;
          draft.won = false;
        });

        await delay();

        setGame((draft) => {
          const anchor = draft.deck.pop();
          const next = draft.deck.pop();
          draft.anchor = anchor ? flipToFace(anchor) : null;
          draft.next = next ? flipToBack(next) : null;
        });
      },
    });

  function predict(prediction: Prediction) {
    if (game.revealed || game.ended || !game.anchor || !game.next) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.next!.faceUp = true;
      draft.revealed = true;
      draft.lastCorrect = predictionMatches(
        prediction,
        draft.anchor!,
        draft.next!,
      );
      if (draft.lastCorrect)
        draft.score += prediction === "red" || prediction === "black" ? 1 : 2;
      else draft.misses += 1;
      draft.won = draft.score >= TARGET_SCORE;
      draft.ended = draft.won || draft.misses >= MAX_MISSES;
    });
  }

  function advance() {
    if (!game.revealed || game.ended || !game.anchor || !game.next) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.discard.push(draft.anchor!);
      draft.anchor = flipToFace(draft.next!);
      const card = draft.deck.pop();
      if (!card) {
        draft.ended = true;
        draft.won = draft.score >= TARGET_SCORE;
        return;
      }
      draft.next = flipToBack(card);
      draft.revealed = false;
      draft.lastCorrect = null;
    });
  }

  useEffect(() => {
    if (!game.revealed || game.ended) return;
    const timeout = setTimeout(advance, 1000);
    return () => clearTimeout(timeout);
  }, [game, game.ended, game.revealed]);

  const zones = useMemo<MapZone[]>(
    () => [
      { id: "bars", name: "bars", col: 0, row: 0, width: "full", height: 0.5 },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0.5,
        fan: { maxVisible: 3 },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 2,
        row: 0.5,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      {
        id: "next",
        name: "next",
        cards: game.next ? [game.next] : [],
        col: 0.5,
        row: 1.5,
        fan: { maxVisible: 3 },
      },
      {
        id: "anchor",
        name: "anchor",
        cards: game.anchor ? [game.anchor] : [],
        col: 1.5,
        row: 1.5,
        placeholder: {},
      },

      { id: "hud", name: "hud", col: 0, row: 2.5, width: "full", height: 1.2 },
    ],
    [game],
  );
  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper: () => ({}),
    cardSize: "regular",
  });

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.score - game.misses}
      canUndo={canUndo}
      undo={undo}
    >
      <View
        style={[
          getZoneStylesById("bars"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        <ProgressBar
          progressValue={game.score}
          totalValue={TARGET_SCORE}
          scaledHeight={cardHeight * 0.25}
          color="blue"
          style={{ flex: 1.8 }}
          labelText={i18n.t("cards:score")}
          autoTallyText
        />

        <ProgressBar
          progressValue={game.misses}
          totalValue={MAX_MISSES}
          scaledHeight={cardHeight * 0.25}
          color="red"
          style={{ flex: 1 }}
          labelText={i18n.t("games:fortunesCall.misses")}
          tallyText={game.misses.toString()}
        />
      </View>

      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          { gap: spacing(14), flex: 1 },
        ]}
      >
        <View style={[flexStyles.colCentered, { flex: 1, gap: spacing(14) }]}>
          <Text size="xl" weight="bold">
            +1
          </Text>
          <Button
            text={i18n.t("games:fortunesCall.red")}
            size="md"
            theme="green"
            onPress={() => predict("red")}
            disabled={game.revealed}
            fullWidth
            halfTaller
          />
          <Button
            text={i18n.t("cards:black")}
            size="md"
            theme="green"
            onPress={() => predict("black")}
            disabled={game.revealed}
            fullWidth
            halfTaller
          />
        </View>
        <View style={[flexStyles.colCentered, { flex: 1, gap: spacing(14) }]}>
          <Text size="xl" weight="bold">
            +2
          </Text>
          <Button
            text={i18n.t("games:fortunesCall.higher")}
            size="md"
            theme="blue"
            onPress={() => predict("higher")}
            disabled={game.revealed}
            fullWidth
            halfTaller
          />
          <Button
            text={i18n.t("games:fortunesCall.lower")}
            size="md"
            theme="blue"
            onPress={() => predict("lower")}
            disabled={game.revealed}
            fullWidth
            halfTaller
          />
        </View>
      </View>
    </GameWrapper>
  );
}
