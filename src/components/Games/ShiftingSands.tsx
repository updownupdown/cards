import { Button } from "@/components/Button/Button";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  isJoker,
  PlayingCard,
  rankValue,
  shuffle,
  zoneFanOffset,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { ARROW_LABELS, pressHint } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
import { seededRandom, shuffledWith } from "@/hints/random";
const cardSize = "tableau";
const minCols = 10;

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
  previewStart: number;
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
    previewStart: 0,
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
  draft.direction = 1;
  draft.previewStart = 0;
  draft.reversed = false;
  return true;
}

function reverseHand(draft: ShiftingSandsGameState) {
  if (draft.ended || draft.phase !== "play" || draft.hand.length < 2) {
    return false;
  }
  draft.hand.reverse();
  draft.reversed = !draft.reversed;
  return true;
}

function faceUpCount(columns: PlayingCard[][]) {
  return columns.flat().filter((card) => card.faceUp).length;
}

function previewColumn(snapshot: ShiftingSandsGameState, cardIndex: number) {
  return snapshot.previewStart + cardIndex * (snapshot.direction ?? 1);
}

function shiftPreview(draft: ShiftingSandsGameState, amount: number) {
  if (
    draft.ended ||
    draft.phase !== "play" ||
    draft.columns.every((column) => column.length === 0)
  ) {
    return false;
  }
  draft.previewStart += amount;
  return true;
}

function flipDirection(draft: ShiftingSandsGameState) {
  if (draft.ended || draft.phase !== "play") return false;
  draft.direction = draft.direction === -1 ? 1 : -1;
  return true;
}

function previewPlacement(snapshot: ShiftingSandsGameState) {
  const collapsedColumns = new Set<number>();
  const standingByColumn = new Map(
    snapshot.columns.map((column, index) => [index, isStanding(column)]),
  );

  for (const [index, card] of snapshot.hand.entries()) {
    const target = previewColumn(snapshot, index);
    const column = snapshot.columns[target] ?? [];
    const standing = keepsStanding(column, card);

    standingByColumn.set(target, standing);
    if (isStanding(column) && !standing) collapsedColumns.add(target);
  }

  const tideStrength = Math.ceil(
    [...standingByColumn.values()].filter(Boolean).length / 2,
  );

  return {
    collapsedColumns,
    stockToTide: Math.min(tideStrength, snapshot.deck.length),
  };
}

function placeHand(draft: ShiftingSandsGameState) {
  if (draft.ended || draft.phase !== "play" || draft.hand.length === 0) {
    return false;
  }

  const targets = draft.hand.map((_, index) => previewColumn(draft, index));
  const leftmostTarget = Math.min(...targets);
  if (leftmostTarget < 0) {
    draft.columns.unshift(...Array.from({ length: -leftmostTarget }, () => []));
  }

  const rightmostTarget = Math.max(...targets) - Math.min(leftmostTarget, 0);
  while (rightmostTarget >= draft.columns.length) {
    draft.columns.push([]);
  }

  for (const [index, card] of draft.hand.entries()) {
    const target = targets[index] - Math.min(leftmostTarget, 0);
    const column = draft.columns[target];
    const standing = keepsStanding(column, card);
    column.push(flipToFace(card));
    if (!standing) {
      draft.columns[target] = column.map((entry) => ({
        ...entry,
        faceUp: false,
      }));
    }
  }

  draft.hand = [];
  draft.lastColumn = null;
  resolveTide(draft);
  return true;
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
      ? i18n.t("games:shiftingSands.castleHeld", {
          castle: castleCards,
          tide: draft.discard.length,
        })
      : i18n.t("games:shiftingSands.tideWon", {
          castle: castleCards,
          tide: draft.discard.length,
        });
    return;
  }

  draft.phase = "gather";
  draft.lastColumn = null;
  draft.direction = null;
  draft.previewStart = 0;
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

/**
 * How much a hand placed from \`start\` gains, castle cards less tide, once
 * the tide has come in, and how many deck cards the turn uses.
 */
function placementGain(
  snapshot: ShiftingSandsGameState,
  hand: PlayingCard[],
  start: number,
  deckLeft: number,
) {
  const changed = new Map<number, PlayingCard[]>();
  for (const [index, card] of hand.entries()) {
    const target = start + index;
    const column = changed.get(target) ?? snapshot.columns[target] ?? [];
    const standing = keepsStanding(column, card);
    const placed = [...column, { ...card, faceUp: true }];
    changed.set(
      target,
      standing ? placed : placed.map((entry) => ({ ...entry, faceUp: false })),
    );
  }
  const columns = [
    ...snapshot.columns.map((column, index) => changed.get(index) ?? column),
    ...[...changed.entries()]
      .filter(([index]) => index < 0 || index >= snapshot.columns.length)
      .map(([, column]) => column),
  ];
  const before = faceUpCount(snapshot.columns);
  const after = faceUpCount(columns);
  const tide = Math.ceil(columns.filter(isStanding).length / 2);
  const fromDeck = Math.min(tide, deckLeft);
  const fromCastle = Math.min(tide - fromDeck, after);
  return {
    gain: after - fromCastle - before - (fromDeck + fromCastle),
    used: hand.length + fromDeck,
  };
}

/** The best way to lay out a hand: its order, where it starts, and its gain. */
function bestPlacement(
  snapshot: ShiftingSandsGameState,
  hand: PlayingCard[],
  deckLeft: number,
  canShift: boolean,
) {
  const orders = hand.length > 1 ? [hand, [...hand].reverse()] : [hand];
  const starts = canShift
    ? Array.from(
        { length: snapshot.columns.length + hand.length },
        (_, index) => index + 1 - hand.length,
      )
    : [snapshot.previewStart];
  let best = { reversed: false, start: 0, gain: -Infinity, used: 1 };
  for (const [orderIndex, order] of orders.entries()) {
    for (const start of starts) {
      const { gain, used } = placementGain(snapshot, order, start, deckLeft);
      if (gain > best.gain) {
        best = { reversed: orderIndex === 1, start, gain, used };
      }
    }
  }
  return best;
}

/**
 * The hint: how many cards to gather (the count that, over hands the deck
 * could give, gains most for the deck cards it uses), then the order and
 * place that do best with the hand drawn, then Place.
 */
function findShiftingSandsHint(snapshot: ShiftingSandsGameState) {
  if (snapshot.ended) return null;
  const canShift = snapshot.columns.some((column) => column.length > 0);

  if (snapshot.phase === "gather") {
    const random = seededRandom(
      snapshot.columns
        .map((column) => column.map((card) => card.id).join(","))
        .join("|") + snapshot.deck.length,
    );
    let bestCount = 0;
    let bestRate = -Infinity;
    for (
      let count = 1;
      count <= Math.min(7, snapshot.deck.length);
      count += 1
    ) {
      let total = 0;
      const samples = 12;
      for (let sample = 0; sample < samples; sample += 1) {
        const hand = shuffledWith(snapshot.deck, random).slice(0, count);
        const { gain, used } = bestPlacement(
          snapshot,
          hand,
          snapshot.deck.length - count,
          canShift,
        );
        total += gain / used;
      }
      if (total / samples > bestRate) {
        bestRate = total / samples;
        bestCount = count;
      }
    }
    return bestCount > 0 ? pressHint("actions", String(bestCount)) : null;
  }

  if (snapshot.hand.length === 0) return null;
  const best = bestPlacement(
    snapshot,
    snapshot.hand,
    snapshot.deck.length,
    canShift,
  );
  const current = placementGain(
    snapshot,
    snapshot.hand,
    snapshot.previewStart,
    snapshot.deck.length,
  );
  if (current.gain >= best.gain) {
    return pressHint("actions", i18n.t("games:shiftingSands.place"));
  }
  if (best.reversed) {
    return pressHint("actions", i18n.t("games:shiftingSands.reverse"));
  }
  return pressHint(
    "actions",
    best.start < snapshot.previewStart
      ? ARROW_LABELS.back
      : ARROW_LABELS.forward,
  );
}

export const shiftingSandsRules = {
  createInitialState,
  isStanding,
  effectiveJokerMatch,
  keepsStanding,
  legalColumns,
  drawCards,
  reverseHand,
  previewColumn,
  shiftPreview,
  flipDirection,
  previewPlacement,
  placeHand,
  faceUpCount,
  resolveTide,
  playCard,
  findHint: findShiftingSandsHint,
};

const gameStateInitial = createInitialState();

export default function ShiftingSands() {
  const { colorDark, colorPale } = useGameColors();
  const { spacing, font } = useResponsiveMetrics();
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
          draft.previewStart = 0;
          draft.reversed = false;
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
        });
        await delay(500);
      },
    });

  const previewColumns = useMemo(
    () =>
      new Map(
        game.hand.map((card, index) => [previewColumn(game, index), card]),
      ),
    [game],
  );
  const firstPreviewColumn =
    game.phase === "play" && game.hand.length > 0
      ? Math.min(0, ...previewColumns.keys())
      : 0;
  const lastPreviewColumn =
    game.phase === "play" && game.hand.length > 0
      ? Math.max(game.columns.length - 1, ...previewColumns.keys())
      : game.columns.length - 1;
  const displayColumnCount = lastPreviewColumn - firstPreviewColumn + 1;
  const columnOffset = Math.max(minCols - displayColumnCount, 0) / 2;
  const placementPreview = useMemo(() => previewPlacement(game), [game]);
  const isFirstHand = game.columns.every((column) => column.length === 0);

  useHint(() => findShiftingSandsHint(game), {
    game,
    enabled: isLoaded && !game.ended,
  });

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

  function updatePreview(update: (draft: ShiftingSandsGameState) => boolean) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      update(draft);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = Array.from(
      { length: displayColumnCount },
      (_, offset) => {
        const index = firstPreviewColumn + offset;
        const column = game.columns[index] ?? [];
        const preview = previewColumns.get(index);
        return {
          id: `column-${index}`,
          name: "column",
          pileIndex: index,
          cards: preview ? [...column, preview] : column,
          col: columnOffset + offset,
          row: 1,
          // height: 2.7,
          baseZIndex: 10,
          fan: {
            direction: "down",
            offset: zoneFanOffset(
              preview ? [...column, preview].length : column.length,
              3,
              0.1,
              cardDims.tableauOffset,
            ),
            center: false,
          },
          placeholder: {
            text: column.length === 0 ? i18n.t("cards:empty") : undefined,
            showCount: column.length > 0,
            backgroundColor: isStanding(column)
              ? rgba(Colors.cardSelectGreen, 0.22)
              : rgba(Colors.cardSelectRed, 0.28),
          },
        };
      },
    );

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: Math.max(displayColumnCount - 1, minCols - 1),
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
      {
        id: "stats",
        col: 2,
        row: 0,
        width: Math.max(displayColumnCount, minCols) - 4,
        height: 1,
      },
      {
        id: "actions",
        col: 0,
        row: 3.8,
        width: "full",
        height: 0.75,
        baseZIndex: 80,
      },
      ...columnZones,
    ];
  }, [
    columnOffset,
    displayColumnCount,
    firstPreviewColumn,
    game,
    lastPreviewColumn,
    previewColumns,
  ]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "column" && zone.pileIndex !== undefined) {
      return {
        selectColor: "grey",
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
      const previewIndex = game.hand.findIndex(
        (card) => card.id === mappedCard.card.id,
      );
      const isPreview = previewIndex >= 0;
      const collapses = placementPreview.collapsedColumns.has(
        mappedCard.pileIndex,
      );

      return {
        // forceOverlayColor: !isPreview,
        forceOverlayColor: true,
        forceSelectColor: previewIndex === 0,
        selectColor: isPreview
          ? previewIndex === 0
            ? Colors.cardSelectGreen
            : Colors.cardSelectBlue
          : collapses
            ? Colors.cardSelectRed
            : "none",
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize,
    fixedCols: Math.max(displayColumnCount, minCols),
    fixedRows: 4.5,
    gap: 0.1,
  });

  // const standing = game.columns.filter(isStanding).length;
  const castleCards = faceUpCount(game.columns);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={castleCards}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
      showDeviceRotateHint="landscape"
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("stats"),
          flexStyles.rowCentered,
          { gap: spacing(24) },
        ]}
      >
        <ProgressBar
          progressValue={castleCards}
          totalValue={30}
          color={"#8d693b"}
          labelText={i18n.t("games:shiftingSands.dunes")}
          style={{ flex: 1 }}
          tallyText={castleCards}
          scaledHeight={cardHeight * 0.5}
          backgroundColor={rgba(Colors.K900, 0.5)}
        />
        <ProgressBar
          progressValue={game.discard.length}
          totalValue={30}
          color={"#8d693b"}
          labelText={i18n.t("games:shiftingSands.eroded")}
          style={{ flex: 1 }}
          tallyText={game.discard.length}
          scaledHeight={cardHeight * 0.5}
          backgroundColor={rgba(Colors.K900, 0.5)}
          flipDirection
        />
      </View>

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.rowCentered,
          { gap: spacing(12), justifyContent: "center" },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.flex1,
            { gap: spacing(8) },
          ]}
        >
          {game.phase === "gather" ? (
            <>
              <Text size="md" color={Colors.white} weight={500}>
                {i18n.t("games:shiftingSands.draw")}
              </Text>
              {Array.from(
                { length: Math.min(7, game.deck.length) },
                (_, index) => (
                  <Button
                    key={index + 1}
                    text={`${index + 1}`}
                    size="sm"
                    theme={colorDark}
                    onPress={() => gather(index + 1)}
                    style={{
                      width: spacing(52),
                      height: spacing(52),
                      borderRadius: spacing(26),
                    }}
                    textStyle={{
                      fontSize: font(20),
                      fontFamily: FontWeight[500],
                    }}
                  />
                ),
              )}
            </>
          ) : (
            <>
              <Button
                text={i18n.t("games:shiftingSands.place")}
                size="sm"
                theme="green"
                taller
                onPress={() => updatePreview(placeHand)}
              />

              <View style={[flexStyles.colCentered, flexStyles.flex1]}>
                <Text size="sm" color={colorPale}>
                  {i18n.t("games:shiftingSands.stockToTide")}
                </Text>
                <Text size="xxl" color={Colors.white} weight={600}>
                  {game.phase === "play" ? placementPreview.stockToTide : "--"}
                </Text>
              </View>

              <Button
                text={i18n.t("games:shiftingSands.reverse")}
                size="sm"
                theme="#8d693b"
                disabled={game.hand.length < 2}
                onPress={reverse}
                taller
              />
              <Button
                size="sm"
                theme={colorDark}
                disabled={isFirstHand}
                accessibilityLabel={ARROW_LABELS.back}
                onPress={() =>
                  updatePreview((draft) => shiftPreview(draft, -1))
                }
                taller
                iconName="arrow-back"
              />
              <Button
                size="sm"
                theme={colorDark}
                disabled={isFirstHand}
                accessibilityLabel={ARROW_LABELS.forward}
                onPress={() => updatePreview((draft) => shiftPreview(draft, 1))}
                taller
                iconName="arrow-forward"
              />

              {/* <Button
                text="Flip direction"
                size="sm"
                theme={colorDark}
                taller
                onPress={() => updatePreview(flipDirection)}
              /> */}
            </>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
