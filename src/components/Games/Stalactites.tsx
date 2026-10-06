import { useStateManager } from "@/hooks/useStateManager";
import { Button } from "@/components/Button/Button";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useGameColors } from "@/hooks/useGameColors";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { Text } from "@/components/common/Text";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  nameFromRankValue,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  EXHAUSTED_PILE_PLACEHOLDER,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { pressHint } from "@/hints/hint";
import {
  findClassicHint,
  solveClassic,
  type ClassicBoard,
  type ClassicRules,
} from "@/hints/classic";

// Stalactites: four foundation cards and eight columns of six. Top cards go
// only to the foundations, which build up regardless of suit by ones or by
// twos (the player's choice, made once after the deal), or to two cells.
const COLUMN_COUNT = 8;
const COLUMN_SIZE = 6;
const FOUNDATION_COUNT = 4;
const CELL_COUNT = 2;
const FOUNDATION_SIZE = 13;
const LABEL_ROW = 1.02;
const TABLEAU_ROW = 1.4;
// Rows of height each column may fan into.
const COLUMN_ROWS = 3.4;

export type Step = 1 | 2;

type GameState = {
  /** Cards gathered for the deal; empty during play. */
  deck: PlayingCard[];
  tableau: PlayingCard[][];
  foundations: PlayingCard[][];
  cells: PlayingCard[][];
  /** How the foundations build; null until the player chooses. */
  step: Step | null;
  ended: boolean;
  won: boolean;
};

export type StalactitesGameState = GameState;

type Source =
  | { zone: "tableau"; pile: number }
  | { zone: "cell"; pile: number };
type Target =
  | { zone: "foundation"; pile: number }
  | { zone: "cell"; pile: number };

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

/** The foundations and columns dealt from a shuffled deck. */
function dealFrom(cards: PlayingCard[]) {
  const faceUp = cards.map(flipToFace);
  return {
    foundations: faceUp.slice(0, FOUNDATION_COUNT).map((card) => [card]),
    tableau: Array.from({ length: COLUMN_COUNT }, (_, i) =>
      faceUp.slice(
        FOUNDATION_COUNT + i * COLUMN_SIZE,
        FOUNDATION_COUNT + (i + 1) * COLUMN_SIZE,
      ),
    ),
  };
}

function createInitialState(): GameState {
  return {
    deck: [],
    ...dealFrom(shuffle(createDeck())),
    cells: emptyPiles(CELL_COUNT),
    step: null,
    ended: false,
    won: false,
  };
}

/** The rank value that goes next on a foundation topped by `card`. */
function nextRankValue(card: PlayingCard, step: Step) {
  return ((rankValue(card) - 1 + step) % 13) + 1;
}

/**
 * The step a card makes on a foundation, or null if it can't go there. Until
 * the step is chosen, a card one or two above the top can go, and sets it.
 */
function foundationStep(
  card: PlayingCard,
  foundation: PlayingCard[],
  step: Step | null,
): Step | null {
  const foundationTop = top(foundation);
  if (!foundationTop || foundation.length >= FOUNDATION_SIZE) return null;
  const steps: Step[] = step ? [step] : [1, 2];
  return (
    steps.find(
      (candidate) =>
        rankValue(card) === nextRankValue(foundationTop, candidate),
    ) ?? null
  );
}

function canBuildFoundation(
  card: PlayingCard,
  foundation: PlayingCard[],
  step: Step | null,
) {
  return foundationStep(card, foundation, step) !== null;
}

function sourcePile(state: GameState, source: Source) {
  return source.zone === "tableau"
    ? state.tableau[source.pile]
    : state.cells[source.pile];
}

function canMove(state: GameState, source: Source, target: Target) {
  if (state.ended) return false;
  const card = top(sourcePile(state, source));
  if (!card) return false;
  if (target.zone === "foundation") {
    return canBuildFoundation(card, state.foundations[target.pile], state.step);
  }
  // Cells take one card, and only from the columns.
  return source.zone === "tableau" && state.cells[target.pile].length === 0;
}

function applyMove(state: GameState, source: Source, target: Target) {
  const card = sourcePile(state, source).pop();
  if (!card) return;
  if (target.zone === "foundation") {
    state.step ??= foundationStep(card, state.foundations[target.pile], null);
    state.foundations[target.pile].push(card);
  } else {
    state.cells[target.pile].push(card);
  }
}

function foundationMoves(state: GameState) {
  const sources: Source[] = [
    ...state.tableau.map((_, pile) => ({ zone: "tableau" as const, pile })),
    ...state.cells.map((_, pile) => ({ zone: "cell" as const, pile })),
  ];
  return sources.filter((source) =>
    state.foundations.some((_, pile) =>
      canMove(state, source, { zone: "foundation", pile }),
    ),
  );
}

function evaluateEnd(state: GameState) {
  if (state.foundations.every((pile) => pile.length === FOUNDATION_SIZE)) {
    return { ended: true, won: true };
  }
  const cellFree = state.cells.some((cell) => cell.length === 0);
  const columnCards = state.tableau.some((pile) => pile.length > 0);
  if ((cellFree && columnCards) || foundationMoves(state).length > 0) {
    return { ended: false, won: false };
  }
  return { ended: true, won: false };
}

function columnOffset(count: number) {
  return zoneFanOffset(count, COLUMN_ROWS, 0.12, cardDims.tableauOffset);
}

/**
 * Every card is on view: the hint searches for a win. Before the step is
 * chosen, it tries both and suggests the one that goes further.
 */
function findStalactitesHint(state: GameState) {
  const board: ClassicBoard = {
    tableau: state.tableau,
    foundations: state.foundations,
    cells: state.cells.map((cell) => cell[0] ?? null),
  };
  const rulesFor = (step: Step): ClassicRules => ({
    toFoundation: (card, pile) => foundationStep(card, pile, step) !== null,
    toTableau: () => false,
    canLift: (pile, index) => index === pile.length - 1,
  });
  if (!state.step) {
    const outcomes = ([1, 2] as const).map((step) => {
      const { win, toward } = solveClassic(board, rulesFor(step), {
        budget: 1500,
      });
      return { step, worth: win ? 1000 : (toward?.length ?? 0) };
    });
    const best =
      outcomes[1].worth > outcomes[0].worth ? outcomes[1] : outcomes[0];
    return pressHint(
      "step",
      i18n.t(
        best.step === 1
          ? "games:stalactites.byOnes"
          : "games:stalactites.byTwos",
      ),
    );
  }
  return findClassicHint(
    board,
    rulesFor(state.step),
    {
      tableau: (pile) => `tableau-${pile}`,
      foundation: (pile) => `foundation-${pile}`,
      cell: (cell) => `cell-${cell}`,
    },
    { search: `stalactites:${state.step}` },
  );
}

export const stalactitesRules = {
  findHint: findStalactitesHint,
  FOUNDATION_SIZE,
  createInitialState,
  dealFrom,
  nextRankValue,
  foundationStep,
  canBuildFoundation,
  canMove,
  applyMove,
  foundationMoves,
  evaluateEnd,
};

const gameStateInitial = createInitialState();

export default function Stalactites() {
  const { colorPale } = useGameColors();
  // A card picked by a tap, to be tapped where it should go.
  const [selected, setSelected] = useState<Source | null>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
      setLastTap(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.deck,
          ...draft.tableau.flat(),
          ...draft.foundations.flat(),
          ...draft.cells.flat(),
        ];
        draft.deck = shuffle(cards).map(flipToBack);
        draft.tableau = emptyPiles(COLUMN_COUNT);
        draft.foundations = emptyPiles(FOUNDATION_COUNT);
        draft.cells = emptyPiles(CELL_COUNT);
        draft.step = null;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        Object.assign(draft, dealFrom(draft.deck));
        draft.deck = [];
      });
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<Target>[]>([]);

  const {
    hoverTarget,
    dragGhost,
    draggedCardIds,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    clearDragGhost,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<Source, Target>({
    canDropOnTarget: (source, target) => canMove(game, source, target),
    onSuccessfulDrop: (source, target) => {
      moveCard(source, target);
    },
    getDroppedCardIds: (source) => {
      const card = top(sourcePile(game, source));
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler: (source) => () => onSourcePress(source),
  });

  useEffect(() => {
    if (isSettingUp) return;
    const { ended, won } = evaluateEnd(game);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isSettingUp, setGame]);

  useHint(() => findStalactitesHint(game), {
    game,
    enabled: !isSettingUp && !game.ended && !game.deck?.length,
  });

  function moveCard(source: Source, target: Target) {
    setSelected(null);
    if (!canMove(game, source, target)) return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => applyMove(draft, source, target));
    return true;
  }

  /**
   * A tap on a card selects it; a tap on a foundation or a free cell then
   * moves it there (tapping anywhere else drops the selection). A double tap
   * sends the card on its own, as sendCard does.
   */
  function onSourcePress(source: Source) {
    if (dragGhost || game.ended) {
      setSelected(null);
      return;
    }
    const now = Date.now();
    const tapKey = `${source.zone}-${source.pile}`;
    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      sendCard(source);
      return;
    }
    setLastTap({ key: tapKey, at: now });

    if (!selected) {
      if (top(sourcePile(game, source))) setSelected(source);
      return;
    }
    // A card in a cell is also a place to tap: the selection goes there if
    // it can (it can't: cells hold one card), else it is dropped.
    if (source.zone === "cell") {
      onTargetPress({ zone: "cell", pile: source.pile });
      return;
    }
    setSelected(null);
  }

  /** A tap on a foundation or a free cell: moves the selected card there. */
  function onTargetPress(target: Target) {
    const source = selected;
    setSelected(null);
    if (!source || dragGhost) return;
    moveCard(source, target);
  }

  /**
   * Sends the card to a foundation, or else a column card to a cell.
   * Before the step is chosen, a card that could set either step does
   * nothing: that choice is made by moving it to a foundation or with the
   * buttons.
   */
  function sendCard(source: Source) {
    const card = top(sourcePile(game, source));
    if (!card) return;
    const foundations = game.foundations.flatMap((pile, index) =>
      canMove(game, source, { zone: "foundation", pile: index })
        ? [{ index, step: foundationStep(card, pile, game.step) }]
        : [],
    );
    if (new Set(foundations.map((option) => option.step)).size > 1) return;
    const foundation = foundations[0]?.index ?? -1;
    if (foundation >= 0) {
      moveCard(source, { zone: "foundation", pile: foundation });
      return;
    }
    const cell = game.cells.findIndex((_, pile) =>
      canMove(game, source, { zone: "cell", pile }),
    );
    if (cell >= 0) moveCard(source, { zone: "cell", pile: cell });
  }

  function chooseStep(step: Step) {
    if (game.step || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.step = step;
    });
  }

  const choosing =
    game.deck.length === 0 && game.foundations[0].length > 0 && !game.step;

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: { showCount: false },
    }));
    const cellZones: MapZone[] = game.cells.map((pile, i) => ({
      id: `cell-${i}`,
      name: "cell",
      pileIndex: i,
      cards: pile,
      col: COLUMN_COUNT - CELL_COUNT + i,
      row: 0,
      placeholder: choosing
        ? undefined
        : { iconName: "free-cell", showCount: false },
    }));
    const tableauZones: MapZone[] = game.tableau.map((pile, i) => ({
      id: `tableau-${i}`,
      name: "tableau",
      pileIndex: i,
      cards: pile,
      col: i,
      row: TABLEAU_ROW,
      fan: { direction: "down", offset: columnOffset(pile.length) },
      // Nothing is ever moved onto a column.
      placeholder:
        pile.length === 0 && game.deck.length === 0
          ? EXHAUSTED_PILE_PLACEHOLDER
          : { showCount: false },
    }));
    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: (COLUMN_COUNT - 1) / 2,
        row: TABLEAU_ROW,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
      },
      ...foundationZones,
      {
        id: "step",
        col: FOUNDATION_COUNT,
        row: 0,
        width: choosing
          ? COLUMN_COUNT - FOUNDATION_COUNT
          : COLUMN_COUNT - FOUNDATION_COUNT - CELL_COUNT,
      },
      ...cellZones,
      ...game.foundations.map((_, i) => ({
        id: `next-${i}`,
        col: i,
        row: LABEL_ROW,
        height: 0.3,
      })),
      ...tableauZones,
    ];
  }, [game, choosing]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;
    const isHoverTarget =
      !!dragGhost &&
      card.topOfZone &&
      !!hoverTarget &&
      hoverTarget.zone === card.zoneName &&
      hoverTarget.pile === card.pileIndex;

    if (card.zoneName === "tableau" || card.zoneName === "cell") {
      const isPicked =
        card.topOfZone &&
        selected?.zone === card.zoneName &&
        selected.pile === card.pileIndex;
      return {
        isDisabled: game.ended,
        isSelected: isHoverTarget || isPicked,
        selectColor: isHoverTarget ? "green" : isPicked ? "blue" : "none",
        isVisible: !isBeingDragged,
        animDuration,
      };
    }
    if (card.zoneName === "foundation") {
      return {
        isSelected: isHoverTarget,
        selectColor: isHoverTarget ? "green" : "none",
        isVisible: !isBeingDragged,
        animDuration,
        // Taps go through to the zone, which places the selected card.
        clickThroughCards: true,
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (
      (zone.name === "cell" || zone.name === "foundation") &&
      zone.pileIndex !== undefined
    ) {
      const target: Target = { zone: zone.name, pile: zone.pileIndex };
      return {
        onPress: () => onTargetPress(target),
        isSelected:
          !!dragGhost &&
          hoverTarget?.zone === zone.name &&
          hoverTarget.pile === zone.pileIndex,
        selectColor: "green",
        isDisabled: !selected || !!dragGhost,
      };
    }
    return {};
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight, getZoneStylesById } =
    useCardMap({
      game,
      zones,
      cardMapper,
      zoneMapper,
      cardSize: "tableau",
      fixedCols: COLUMN_COUNT,
      fixedRows: TABLEAU_ROW + COLUMN_ROWS,
      gap: 0.14,
    });

  function getSourceRect(source: Source) {
    const zone = zones.find(
      (entry) => entry.name === source.zone && entry.pileIndex === source.pile,
    );
    if (!zone) return null;
    const count = sourcePile(game, source).length;
    const base = getZoneBasePos(zone);
    const offset =
      source.zone === "tableau"
        ? Math.max(0, count - 1) * columnOffset(count) * cardHeight
        : 0;
    return createRect(base.x, base.y + offset, cardWidth, cardHeight);
  }

  const cardHitAreas = useMemo<CardHitArea<Source>[]>(() => {
    if (game.ended) return [];
    const sources: Source[] = [
      ...game.tableau.map((_, pile) => ({ zone: "tableau" as const, pile })),
      ...game.cells.map((_, pile) => ({ zone: "cell" as const, pile })),
    ];
    return sources.flatMap((source) => {
      const rect =
        sourcePile(game, source).length > 0 ? getSourceRect(source) : null;
      return rect ? [{ source, rect, priority: 10 }] : [];
    });
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<Target>[]>(() => {
    const areas: DropHitArea<Target>[] = [];
    zones.forEach((zone) => {
      if (
        (zone.name !== "foundation" && zone.name !== "cell") ||
        zone.pileIndex === undefined
      ) {
        return;
      }
      const base = getZoneBasePos(zone);
      areas.push({
        target: { zone: zone.name, pile: zone.pileIndex },
        rect: createRect(
          base.x + boardPageOffset.x,
          base.y + boardPageOffset.y,
          cardWidth,
          cardHeight,
        ),
        priority: zone.name === "foundation" ? 90 : 50,
      });
    });
    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  function startGhostDrag(source: Source) {
    const card = top(sourcePile(game, source));
    const rect = getSourceRect(source);
    if (!card || !rect || game.ended) return;
    setSelected(null);
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={`${source.zone}-${source.pile}`}
          collapsable={false}
          style={{
            position: "absolute",
            backgroundColor: "transparent",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          gesture={makeDragHandlers(source, startGhostDrag)}
        />
      )),
    [cardHitAreas],
  );

  const dealt = game.deck.length === 0 && game.foundations[0].length > 0;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? i18n.t("games:stalactites.allCardsHome")
          : i18n.t("cards:noMovesRemain")
      }
    >
      <View
        ref={boardRef}
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          touchAction: "none",
          overscrollBehaviorX: "contain",
        }}
      >
        {cardMap}

        {dealt &&
          !!game.step &&
          game.foundations.map((pile, i) => {
            const foundationTop = top(pile);
            const full = pile.length >= FOUNDATION_SIZE;
            const label =
              full || !foundationTop
                ? i18n.t("games:stalactites.full")
                : game.step
                  ? nameFromRankValue(
                      nextRankValue(foundationTop, game.step),
                      true,
                    )
                  : "";
            return (
              <View
                key={`next-${i}`}
                style={[
                  pointerEventsStyles.none,
                  getZoneStylesById(`next-${i}`),
                  flexStyles.colCentered,
                ]}
              >
                <Text
                  size="xs"
                  weight={400}
                  color={rgba(colorPale, 0.9)}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            );
          })}

        <View
          style={[
            getZoneStylesById("step"),
            flexStyles.colCentered,
            {
              flexDirection: "row",
              gap: cardWidth * 0.1,
              paddingHorizontal: cardWidth * 0.08,
            },
          ]}
        >
          {choosing ? (
            <>
              <Button
                text={i18n.t("games:stalactites.byOnes")}
                size="sm"
                onPress={() => chooseStep(1)}
                fullWidth
                style={{ flex: 1 }}
                disabled={game.ended}
                theme="blue"
              />
              <Button
                text={i18n.t("games:stalactites.byTwos")}
                size="sm"
                onPress={() => chooseStep(2)}
                fullWidth
                style={{ flex: 1 }}
                disabled={game.ended}
                theme="blue"
              />
            </>
          ) : null}
        </View>

        <View
          style={[
            pointerEventsStyles.boxNone,
            {
              ...StyleSheet.absoluteFillObject,
              zIndex: 3000,
              touchAction: "none",
              overscrollBehaviorX: "contain",
            },
          ]}
        >
          {interactionTargets}
        </View>
        {dragGhost && (
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize="tableau"
            isValidDrop={hoverTarget !== null}
            highlightLeadOnly
          />
        )}
      </View>
    </GameWrapper>
  );
}
