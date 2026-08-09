import { Button } from "@/components/Button/Button";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  isJoker,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";

type Phase = "gather" | "play";
type Direction = -1 | 1 | null;

export type ShiftingSandsGameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  columns: PlayingCard[][];
  discard: PlayingCard[];
  phase: Phase;
  lastColumn: number | null;
  direction: Direction;
  reversed: boolean;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

function createInitialState(): ShiftingSandsGameState {
  return {
    deck: createDeck({ faceUp: false }),
    hand: [],
    columns: [[]],
    discard: [],
    phase: "gather",
    lastColumn: null,
    direction: null,
    reversed: false,
    ended: false,
    won: false,
  };
}

function isStanding(column: PlayingCard[]) {
  return column.some((card) => card.faceUp);
}

function effectiveJokerMatch(column: PlayingCard[]) {
  let match: PlayingCard | undefined;
  for (const card of column) {
    if (!isJoker(card) && (!match || rankValue(card) >= rankValue(match))) {
      match = card;
    }
  }
  return match;
}

function keepsStanding(column: PlayingCard[], card: PlayingCard) {
  if (column.length === 0 || !isStanding(column)) return !isJoker(card);

  const previous = column[column.length - 1];
  const comparison = isJoker(previous) ? effectiveJokerMatch(column) : previous;
  if (!comparison) return false;
  if (isJoker(card)) return true;

  return (
    card.suit === comparison.suit || rankValue(card) > rankValue(comparison)
  );
}

function legalColumns(snapshot: ShiftingSandsGameState) {
  if (snapshot.phase !== "play" || snapshot.hand.length === 0) return [];

  if (snapshot.lastColumn === null) {
    const nonEmpty = snapshot.columns
      .map((column, index) => (column.length > 0 ? index : -1))
      .filter((index) => index >= 0);
    return nonEmpty.length > 0 ? nonEmpty : [0];
  }

  if (snapshot.direction !== null) {
    return [snapshot.lastColumn + snapshot.direction];
  }

  return [snapshot.lastColumn - 1, snapshot.lastColumn + 1];
}

function drawCards(draft: ShiftingSandsGameState, count: number) {
  if (draft.ended || draft.phase !== "gather" || draft.hand.length > 0) {
    return false;
  }
  if (count < 1 || count > 7 || count > draft.deck.length) return false;

  for (let index = 0; index < count; index += 1) {
    const card = draft.deck.pop();
    if (card) draft.hand.push(flipToFace(card));
  }
  draft.phase = "play";
  draft.lastColumn = null;
  draft.direction = null;
  draft.reversed = false;
  return true;
}

function reverseHand(draft: ShiftingSandsGameState) {
  if (
    draft.ended ||
    draft.phase !== "play" ||
    draft.lastColumn !== null ||
    draft.hand.length < 2
  ) {
    return false;
  }
  draft.hand.reverse();
  draft.reversed = !draft.reversed;
  return true;
}

function faceUpCount(columns: PlayingCard[][]) {
  return columns.flat().filter((card) => card.faceUp).length;
}

function resolveTide(draft: ShiftingSandsGameState) {
  const tideStrength = Math.ceil(draft.columns.filter(isStanding).length / 2);
  let remaining = tideStrength;

  while (remaining > 0 && draft.deck.length > 0) {
    const card = draft.deck.pop();
    if (card) draft.discard.push(card);
    remaining -= 1;
  }

  for (
    let columnIndex = draft.columns.length - 1;
    remaining > 0 && columnIndex >= 0;
    columnIndex -= 1
  ) {
    const column = draft.columns[columnIndex];
    for (
      let cardIndex = column.length - 1;
      remaining > 0 && cardIndex >= 0;
      cardIndex -= 1
    ) {
      if (!column[cardIndex].faceUp) continue;
      draft.discard.push(column.splice(cardIndex, 1)[0]);
      remaining -= 1;
    }
  }

  if (draft.deck.length === 0) {
    const castleCards = faceUpCount(draft.columns);
    draft.ended = true;
    draft.won = castleCards > draft.discard.length;
    draft.winLoseMessage = draft.won
      ? `Your castle held: ${castleCards} to ${draft.discard.length}.`
      : `The tide won: ${castleCards} to ${draft.discard.length}.`;
    return;
  }

  draft.phase = "gather";
  draft.lastColumn = null;
  draft.direction = null;
  draft.reversed = false;
}

function playCard(draft: ShiftingSandsGameState, requestedColumn: number) {
  if (!legalColumns(draft).includes(requestedColumn)) return false;

  const card = draft.hand.shift();
  if (!card) return false;

  let targetColumn = requestedColumn;
  if (requestedColumn < 0) {
    draft.columns.unshift([]);
    targetColumn = 0;
  } else if (requestedColumn >= draft.columns.length) {
    draft.columns.push([]);
    targetColumn = draft.columns.length - 1;
  }

  const column = draft.columns[targetColumn];
  const standing = keepsStanding(column, card);
  column.push(flipToFace(card));
  if (!standing) {
    draft.columns[targetColumn] = column.map((entry) => ({
      ...entry,
      faceUp: false,
    }));
  }

  if (draft.lastColumn !== null && draft.direction === null) {
    draft.direction = requestedColumn < draft.lastColumn ? -1 : 1;
  }
  draft.lastColumn = targetColumn;

  if (draft.hand.length === 0) resolveTide(draft);
  return true;
}

export const shiftingSandsRules = {
  createInitialState,
  isStanding,
  effectiveJokerMatch,
  keepsStanding,
  legalColumns,
  drawCards,
  reverseHand,
  faceUpCount,
  resolveTide,
  playCard,
};

const gameStateInitial = createInitialState();

export default function ShiftingSands() {
  const showToast = useToast();
  const { colorDark, colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => {
          const cards = [
            ...draft.deck,
            ...draft.hand,
            ...draft.columns.flat(),
            ...draft.discard,
          ];
          draft.deck = shuffle(
            flipAllToBack(cards.length > 0 ? cards : createDeck()),
          );
          draft.hand = [];
          draft.columns = [[]];
          draft.discard = [];
          draft.phase = "gather";
          draft.lastColumn = null;
          draft.direction = null;
          draft.reversed = false;
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
        });
        await delay(500);
      },
    });

  const legal = useMemo(() => legalColumns(game), [game]);
  const legalSet = useMemo(() => new Set(legal), [legal]);
  const displayColumnCount =
    game.columns.length +
    (legal.includes(-1) ? 1 : 0) +
    (legal.includes(game.columns.length) ? 1 : 0);
  const leftShift = legal.includes(-1) ? 1 : 0;

  function gather(count: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      drawCards(draft, count);
    });
  }

  function reverse() {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      reverseHand(draft);
    });
  }

  function place(index: number) {
    if (!legalSet.has(index)) {
      showToast("Choose the next adjacent column");
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      playCard(draft, index);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = game.columns.map((column, index) => ({
      id: `column-${index}`,
      name: "column",
      pileIndex: index,
      cards: column,
      col: index + leftShift,
      row: 2.25,
      baseZIndex: 10,
      fan: { direction: "down", offset: 0.26, center: false },
      placeholder: {
        text: column.length === 0 ? "Empty" : undefined,
        showCount: column.length > 0,
        backgroundColor: isStanding(column)
          ? rgba(Colors.cardSelectGreen, 0.22)
          : rgba(Colors.cardSelectRed, 0.28),
      },
    }));

    if (legal.includes(-1)) {
      columnZones.unshift({
        id: "column-new-left",
        name: "column",
        pileIndex: -1,
        cards: [],
        col: 0,
        row: 2.25,
        baseZIndex: 10,
        placeholder: { text: "New" },
      });
    }
    if (legal.includes(game.columns.length)) {
      columnZones.push({
        id: "column-new-right",
        name: "column",
        pileIndex: game.columns.length,
        cards: [],
        col: game.columns.length + leftShift,
        row: 2.25,
        baseZIndex: 10,
        placeholder: { text: "New" },
      });
    }

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 1,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", showCount: true },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 1.35,
        row: 1,
        width: Math.max(1, displayColumnCount - 2.7),
        baseZIndex: 50,
        fan: { direction: "right", offset: 0.42, center: true },
        placeholder: { text: game.phase === "gather" ? "Gather sand" : "Hand" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: Math.max(displayColumnCount - 1, 2),
        row: 1,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Tide", showCount: true },
      },
      {
        id: "actions",
        col: 0,
        row: 0,
        width: Math.max(displayColumnCount, 3),
        height: 0.75,
        baseZIndex: 80,
      },
      ...columnZones,
    ];
  }, [displayColumnCount, game, leftShift, legal]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "column" && zone.pileIndex !== undefined) {
      const isLegal = legalSet.has(zone.pileIndex);
      return {
        selectColor: isLegal ? Colors.cardSelectGreen : "none",
        onPress: () => place(zone.pileIndex!),
      };
    }
    return {};
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName === "column" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isLegal = legalSet.has(mappedCard.pileIndex);
      return {
        forceOverlayColor: isLegal && mappedCard.topOfZone,
        selectColor: isLegal ? Colors.cardSelectGreen : "none",
        onPress: () => place(mappedCard.pileIndex!),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small",
    fixedCols: Math.max(displayColumnCount, 5),
    fixedRows: 6.4,
    gap: 0.12,
  });

  const standing = game.columns.filter(isStanding).length;
  const castleCards = faceUpCount(game.columns);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={`${castleCards} / ${game.discard.length}`}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.rowCentered,
          { gap: spacing(5), justifyContent: "center" },
        ]}
      >
        {game.phase === "gather" ? (
          <>
            <Text size="xs" color={colorPale}>
              Draw
            </Text>
            {Array.from(
              { length: Math.min(7, game.deck.length) },
              (_, index) => (
                <Button
                  key={index + 1}
                  text={`${index + 1}`}
                  size="xs"
                  theme={colorDark}
                  onPress={() => gather(index + 1)}
                />
              ),
            )}
          </>
        ) : (
          <>
            <Text size="xs" color={colorPale}>
              {game.hand.length} card{game.hand.length === 1 ? "" : "s"} ·{" "}
              {standing} standing
            </Text>
            <Button
              text={game.reversed ? "Reversed" : "Reverse"}
              size="xs"
              theme="orange"
              disabled={game.lastColumn !== null || game.hand.length < 2}
              onPress={reverse}
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
