import { Button } from "@/components/Button/Button";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  createNullArray,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isAce,
  isFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { delay } from "@/utils/utils";
import { useToast } from "../common/Toast";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

const ENEMY_SLOTS = 4;
const HAND_SIZE = 4;

const PERSONAL_RANKS = ["2", "3", "4", "Joker"] as const;

type GamePhase =
  | "enemyPhase"
  | "discardPhase"
  | "drawPhase"
  | "capturePhase"
  | "gameOver";
type GameState = {
  personalDeck: PlayingCard[];
  personalDiscard: PlayingCard[];
  enemyDeck: PlayingCard[];
  enemyRow: (PlayingCard | null)[];
  enemyCapturePile: PlayingCard[];
  hand: PlayingCard[];
  phase: GamePhase;
  selectedHandIds: string[];
  selectedEnemyIdx: number | null;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

export type FieldCommandPhase = GamePhase;
export type FieldCommandGameState = GameState;

function isEnemyCombatant(card: PlayingCard): boolean {
  return isAce(card) || isFace(card);
}

function getCardValue(card: PlayingCard): number {
  return rankValue(card, 14, 0);
}

function recyclePersonalDeckIfNeeded(draft: GameState) {
  if (draft.personalDeck.length > 0 || draft.personalDiscard.length === 0) {
    return;
  }

  draft.personalDeck = shuffle(
    draft.personalDiscard.map((card) => flipToBack(card)),
  );
  draft.personalDiscard = [];
}

function drawToHand(draft: GameState) {
  while (draft.hand.length < HAND_SIZE) {
    recyclePersonalDeckIfNeeded(draft);
    const next = draft.personalDeck.pop();
    if (!next) break;
    draft.hand.push(flipToFace(next));
  }
}

function compactEnemyRowRight(
  enemyRow: (PlayingCard | null)[],
): (PlayingCard | null)[] {
  const cards = enemyRow.filter((card): card is PlayingCard => card !== null);
  const emptyCount = ENEMY_SLOTS - cards.length;
  return [...createNullArray(emptyCount), ...cards];
}

function canCaptureWithCards(
  selectedCards: PlayingCard[],
  enemyCard: PlayingCard,
) {
  if (selectedCards.length === 0) return false;

  const nonJokers = selectedCards.filter((card) => card.rank !== "Joker");
  if (nonJokers.some((card) => card.suit !== enemyCard.suit)) {
    return false;
  }

  const nonJokerValue = nonJokers.reduce(
    (sum, card) => sum + getCardValue(card),
    0,
  );
  const targetValue = getCardValue(enemyCard);

  if (nonJokerValue >= targetValue) {
    return true;
  }

  const jokerCount = selectedCards.length - nonJokers.length;
  if (jokerCount === 0 || nonJokers.length === 0) {
    return false;
  }

  // Each joker may only copy a value already present
  // in the selected non-joker cards.
  const copyableValues = nonJokers.map((card) => getCardValue(card));
  const bestCopyValue = Math.max(...copyableValues);

  return nonJokerValue + bestCopyValue * jokerCount >= targetValue;
}

function cardById(
  cards: PlayingCard[],
  cardId: string,
): PlayingCard | undefined {
  return cards.find((card) => card.id === cardId);
}

const gameStateInitial: GameState = {
  personalDeck: [],
  personalDiscard: shuffle(createDeck({ includeJokers: true, faceUp: false })),
  enemyDeck: [],
  enemyRow: createNullArray(ENEMY_SLOTS),
  enemyCapturePile: [],
  hand: [],
  phase: "enemyPhase",
  selectedHandIds: [],
  selectedEnemyIdx: null,
  ended: false,
  won: false,
  winLoseMessage: "",
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Bring all cards to personal discard and reset game state
  setGame((draft) => {
    const allCards = [
      ...draft.personalDeck,
      ...draft.hand,
      ...draft.personalDiscard,
      ...draft.enemyDeck,
      ...draft.enemyRow.filter((card): card is PlayingCard => card !== null),
      ...draft.enemyCapturePile,
    ];

    draft.personalDiscard = flipAllToBack(allCards);
    draft.personalDeck = [];
    draft.enemyDeck = [];
    draft.hand = [];
    draft.enemyRow = createNullArray(ENEMY_SLOTS);
    draft.enemyCapturePile = [];
    draft.phase = "enemyPhase";
    draft.selectedHandIds = [];
    draft.selectedEnemyIdx = null;
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
  });

  await delay(750);

  // Deal cards
  setGame((draft) => {
    draft.personalDeck = shuffle(
      draft.personalDiscard
        .filter((card) =>
          PERSONAL_RANKS.includes(card.rank as (typeof PERSONAL_RANKS)[number]),
        )
        .map((card) => flipToBack(card)),
    );

    draft.enemyDeck = shuffle(
      draft.personalDiscard
        .filter(
          (card) =>
            !PERSONAL_RANKS.includes(
              card.rank as (typeof PERSONAL_RANKS)[number],
            ),
        )
        .map((card) => flipToBack(card)),
    );

    draft.personalDiscard = [];

    draft.enemyRow = createNullArray(ENEMY_SLOTS);

    for (let i = 0; i < ENEMY_SLOTS; i += 1) {
      const next = draft.enemyDeck.pop();
      if (!next) break;
      draft.enemyRow[i] = flipToFace(next);
    }
  });

  await delay(750);

  // Move enemy combatants to the front of the enemy deck
  setGame((draft) => {
    const combatants = draft.enemyRow.filter(
      (card): card is PlayingCard => card !== null && isEnemyCombatant(card),
    );
    draft.enemyRow = draft.enemyRow.map((card) =>
      card && isEnemyCombatant(card) ? null : card,
    );
    draft.enemyDeck.unshift(...flipAllToBack(combatants));
  });

  await delay(750);
}

function clearCaptureSelections(draft: GameState) {
  draft.selectedHandIds = [];
  draft.selectedEnemyIdx = null;
}

function finalizeRoundOrWin(draft: GameState) {
  const enemyBoardEmpty =
    draft.enemyDeck.length === 0 &&
    draft.enemyRow.every((card) => card === null);

  if (!enemyBoardEmpty) {
    draft.phase = "enemyPhase";
    clearCaptureSelections(draft);
    return;
  }

  const enemyCapturedCombatant = draft.enemyCapturePile.some((card) =>
    isEnemyCombatant(card),
  );

  draft.ended = true;
  draft.phase = "gameOver";
  draft.won = !enemyCapturedCombatant;
  draft.winLoseMessage = enemyCapturedCombatant
    ? "A combatant entered the enemy capture pile."
    : "All enemy cards cleared without losing combatants.";
}

type FieldCommandActionResult =
  | "applied"
  | "invalid"
  | "invalid-capture"
  | "combatant-sacrifice";

function executeCaptureAction(
  draft: GameState,
  targetIdx: number,
  selectedCardIds: string[],
): FieldCommandActionResult {
  const target = draft.enemyRow[targetIdx];
  if (draft.phase !== "capturePhase" || !target) return "invalid";

  const spentCards = selectedCardIds
    .map((id) => cardById(draft.hand, id))
    .filter((card): card is PlayingCard => !!card);
  if (!canCaptureWithCards(spentCards, target)) return "invalid-capture";

  const selectedIds = new Set(selectedCardIds);
  draft.hand = draft.hand.filter((card) => !selectedIds.has(card.id));
  draft.personalDiscard.push(...spentCards.map(flipToBack), flipToBack(target));
  draft.enemyRow[targetIdx] = null;
  finalizeRoundOrWin(draft);
  return "applied";
}

function executeEnemyCaptureAction(
  draft: GameState,
  playerCardId: string,
): FieldCommandActionResult {
  const enemyCard = draft.enemyRow[3];
  const playerCard = cardById(draft.hand, playerCardId);
  if (draft.phase !== "capturePhase" || !enemyCard || !playerCard) {
    return "invalid";
  }

  draft.enemyRow[3] = null;
  draft.hand = draft.hand.filter((card) => card.id !== playerCard.id);
  draft.enemyCapturePile.push(flipToBack(enemyCard), flipToBack(playerCard));

  if (isEnemyCombatant(enemyCard) || isEnemyCombatant(playerCard)) {
    draft.ended = true;
    draft.phase = "gameOver";
    draft.won = false;
    draft.winLoseMessage =
      "A combatant entered the enemy capture pile. You lose.";
    clearCaptureSelections(draft);
    return "applied";
  }

  finalizeRoundOrWin(draft);
  return "applied";
}

function executeSacrificeAction(
  draft: GameState,
  targetIdx: number,
  selectedCardIds: string[],
): FieldCommandActionResult {
  const targetEnemy = draft.enemyRow[targetIdx];
  if (draft.phase !== "capturePhase" || !targetEnemy) return "invalid";

  const sacrificedCards = selectedCardIds
    .map((id) => cardById(draft.hand, id))
    .filter((card): card is PlayingCard => !!card);
  if (sacrificedCards.length !== 2) return "invalid";
  if (sacrificedCards.some(isEnemyCombatant)) {
    clearCaptureSelections(draft);
    return "combatant-sacrifice";
  }

  const selectedIds = new Set(selectedCardIds);
  draft.hand = draft.hand.filter((card) => !selectedIds.has(card.id));
  draft.enemyCapturePile.push(...sacrificedCards.map(flipToBack));
  draft.enemyRow[targetIdx] = null;
  draft.enemyDeck.unshift(flipToBack(targetEnemy));
  finalizeRoundOrWin(draft);
  return "applied";
}

export const fieldCommandRules = {
  isEnemyCombatant,
  getCardValue,
  recyclePersonalDeckIfNeeded,
  drawToHand,
  compactEnemyRowRight,
  canCaptureWithCards,
  cardById,
  clearCaptureSelections,
  finalizeRoundOrWin,
  executeCaptureAction,
  executeEnemyCaptureAction,
  executeSacrificeAction,
};

// ========== Main Game Component ========== //
export default function FieldCommand() {
  const { spacing } = useResponsiveMetrics();
  const showToast = useToast();

  const {
    isSettingUp,
    game,
    setGame,
    reset,
    isLoaded,
    canUndo,
    undo,
    saveUndoState,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  async function doEnemyPhase() {
    setGame((draft) => {
      draft.enemyRow = compactEnemyRowRight(draft.enemyRow);
    });

    await delay();

    setGame((draft) => {
      for (let i = 0; i < ENEMY_SLOTS; i += 1) {
        if (draft.enemyRow[i] !== null) continue;

        const next = draft.enemyDeck.pop();
        if (!next) break;
        draft.enemyRow[i] = flipToFace(next);
      }

      draft.phase = draft.hand.length === 0 ? "drawPhase" : "discardPhase";

      clearCaptureSelections(draft);
    });
  }

  useEffect(() => {
    if (isSettingUp || game.ended || game.phase !== "enemyPhase") return;

    doEnemyPhase();
  }, [game.ended, game.phase, isSettingUp, setGame]);

  async function doDrawPhase() {
    setGame((draft) => {
      drawToHand(draft);

      if (draft.hand.length === 0) {
        draft.ended = true;
        draft.phase = "gameOver";
        draft.won = false;
        draft.winLoseMessage = "No cards available to play.";
        return;
      }

      draft.phase = "capturePhase";
      clearCaptureSelections(draft);
    });
  }

  useEffect(() => {
    if (isSettingUp || game.ended || game.phase !== "drawPhase") return;

    doDrawPhase();
  }, [game.ended, game.phase, isSettingUp, setGame]);

  const selectedHandCards = useMemo(
    () =>
      game.selectedHandIds
        .map((id) => cardById(game.hand, id))
        .filter((card): card is PlayingCard => !!card),
    [game.hand, game.selectedHandIds],
  );

  const captureTarget =
    game.selectedEnemyIdx !== null
      ? game.enemyRow[game.selectedEnemyIdx]
      : null;

  const canExecuteCapture =
    game.phase === "capturePhase" &&
    !!captureTarget &&
    selectedHandCards.length > 0 &&
    canCaptureWithCards(selectedHandCards, captureTarget);

  const canExecuteEnemyCapture =
    game.phase === "capturePhase" &&
    !!game.enemyRow[3] &&
    selectedHandCards.length === 1;

  const canExecuteSacrifice =
    game.phase === "capturePhase" &&
    game.selectedEnemyIdx !== null &&
    !!game.enemyRow[game.selectedEnemyIdx] &&
    selectedHandCards.length === 2 &&
    selectedHandCards.every((card) => !isEnemyCombatant(card));

  const hasSelection =
    game.selectedHandIds.length > 0 || game.selectedEnemyIdx !== null;

  function toggleHandSelection(card: PlayingCard) {
    if (game.ended) return;

    if (game.phase === "discardPhase") {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        draft.hand = draft.hand.filter((c) => c.id !== card.id);
        draft.personalDiscard.push(flipToBack(card));
      });
      return;
    }

    if (game.phase !== "capturePhase") return;

    setGame((draft) => {
      const already = draft.selectedHandIds.includes(card.id);
      if (already) {
        draft.selectedHandIds = draft.selectedHandIds.filter(
          (id) => id !== card.id,
        );
        return;
      }

      draft.selectedHandIds.push(card.id);
    });
  }

  function selectEnemyTarget(enemyIdx: number) {
    if (game.phase !== "capturePhase" || game.ended) return;
    if (!game.enemyRow[enemyIdx]) return;

    setGame((draft) => {
      draft.selectedEnemyIdx =
        draft.selectedEnemyIdx === enemyIdx ? null : enemyIdx;
    });
  }

  function endDiscardPhase() {
    if (game.phase !== "discardPhase" || game.ended) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.phase = "drawPhase";
      clearCaptureSelections(draft);
    });
  }

  function executeCapture() {
    if (
      !canExecuteCapture ||
      game.selectedEnemyIdx === null ||
      !captureTarget
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const targetIdx = draft.selectedEnemyIdx;
      if (targetIdx === null) return;
      const result = executeCaptureAction(
        draft,
        targetIdx,
        draft.selectedHandIds,
      );
      if (result === "invalid-capture") {
        showToast("Invalid capture: suit/value requirement not met.");
      }
    });
  }

  function executeEnemyCapture() {
    if (!canExecuteEnemyCapture) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const playerCardId = draft.selectedHandIds[0];
      if (playerCardId) executeEnemyCaptureAction(draft, playerCardId);
    });
  }

  function executeSacrifice() {
    if (!canExecuteSacrifice || game.selectedEnemyIdx === null) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const targetIdx = draft.selectedEnemyIdx;
      if (targetIdx === null) return;
      const result = executeSacrificeAction(
        draft,
        targetIdx,
        draft.selectedHandIds,
      );
      if (result === "combatant-sacrifice") {
        showToast("Cannot sacrifice a combatant card.");
      }
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const enemySlots: MapZone[] = Array.from(
      { length: ENEMY_SLOTS },
      (_, idx) => ({
        id: `enemy-slot-${idx}`,
        name: "enemySlot",
        pileIndex: idx,
        cards: game.enemyRow[idx] ? [game.enemyRow[idx]!] : [],
        col: 1 + idx,
        row: 0,
        baseZIndex: 20,
        placeholder: {},
      }),
    );

    const handSlots: MapZone[] = Array.from(
      { length: HAND_SIZE },
      (_, idx) => ({
        id: `hand-slot-${idx}`,
        name: "hand",
        refIndex: idx,
        cards: game.hand[idx] ? [game.hand[idx]] : [],
        col: 1 + idx,
        row: 2,
        baseZIndex: 30,
        placeholder: {},
      }),
    );

    return [
      {
        id: "enemy-deck",
        name: "enemyDeck",
        cards: game.enemyDeck,
        col: 0,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Enemy", infoPos: "below" },
      },
      ...enemySlots,
      {
        id: "enemy-capture",
        name: "enemyCapture",
        cards: game.enemyCapturePile,
        col: 5,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Capture", infoPos: "below" },
      },
      {
        id: "personal-deck",
        name: "personalDeck",
        cards: game.personalDeck,
        col: 0,
        row: 2,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "below" },
      },
      ...handSlots,
      {
        id: "personal-discard",
        name: "personalDiscard",
        cards: game.personalDiscard,
        col: 5,
        row: 2,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", infoPos: "below" },
      },
      {
        id: "actions",
        col: 0,
        row: 3,
        width: "full",
        height: 2,
        baseZIndex: 5,
      },
    ];
  }, [
    game.enemyCapturePile,
    game.enemyDeck,
    game.enemyRow,
    game.hand,
    game.personalDeck,
    game.personalDiscard,
  ]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const canExecuteAction =
      canExecuteCapture || canExecuteSacrifice || canExecuteEnemyCapture;

    if (mappedCard.zoneName === "hand") {
      const isSelected = game.selectedHandIds.includes(mappedCard.card.id);
      const isDisabled =
        game.ended ||
        (game.phase !== "discardPhase" && game.phase !== "capturePhase");

      return {
        onPress: () => toggleHandSelection(mappedCard.card),
        isDisabled,
        isSelected,
        selectColor: isSelected
          ? canExecuteAction
            ? "green"
            : "blue"
          : "none",
      };
    } else if (
      mappedCard.zoneName === "enemySlot" &&
      mappedCard.pileIndex !== undefined
    ) {
      const idx = mappedCard.pileIndex;
      const isSelected = game.selectedEnemyIdx === idx;

      const isDisabled = game.phase !== "capturePhase" || game.ended;

      return {
        onPress: () => selectEnemyTarget(idx),
        isDisabled,
        isSelected,
        selectColor: isSelected
          ? canExecuteAction
            ? "green"
            : "blue"
          : "none",
      };
    }

    if (
      mappedCard.zoneName === "enemyCapture" ||
      mappedCard.zoneName === "personalDiscard"
    ) {
      return {
        clickThroughCards: true,
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone) => {
    if (zone.name === "enemySlot" && zone.pileIndex !== undefined) {
      const hasCard = !!game.enemyRow[zone.pileIndex];
      const canSelect = game.phase === "capturePhase" && !game.ended && hasCard;
      const isSelected = game.selectedEnemyIdx === zone.pileIndex;

      return {
        onPress: () => selectEnemyTarget(zone.pileIndex!),
        isDisabled: !canSelect,
        selectColor: isSelected ? "green" : "none",
        forceOverlayColor: isSelected,
      };
    }

    return;
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0.2,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          { gap: 8 },
        ]}
      >
        {game.phase === "discardPhase" && (
          <Button
            text="Done Discarding"
            theme="blue"
            size="sm"
            onPress={endDiscardPhase}
            fullWidth
            taller
          />
        )}

        {game.phase === "capturePhase" && (
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              { gap: spacing(20) },
            ]}
          >
            <View
              style={[
                flexStyles.rowCentered,
                flexStyles.fullWidth,
                { gap: spacing(14) },
              ]}
            >
              <Button
                text="Clear"
                size="sm"
                theme="blue"
                onPress={() => {
                  setGame((draft) => {
                    draft.selectedEnemyIdx = null;
                    draft.selectedHandIds = [];
                  });
                }}
                disabled={!hasSelection}
                taller
              />

              <Button
                text="Sacrifice"
                size="sm"
                theme="red"
                onPress={executeSacrifice}
                disabled={!canExecuteSacrifice}
                style={{ flex: 1 }}
                taller
              />

              <Button
                text="Let Capture"
                size="sm"
                theme="orange"
                onPress={executeEnemyCapture}
                disabled={!canExecuteEnemyCapture}
                style={{ flex: 1 }}
                taller
                lineHeight={1.1}
              />

              <Button
                text="Capture"
                size="sm"
                theme="green"
                onPress={executeCapture}
                disabled={!canExecuteCapture}
                style={{ flex: 1 }}
                taller
              />
            </View>
          </View>
        )}
      </View>
    </GameWrapper>
  );
}
