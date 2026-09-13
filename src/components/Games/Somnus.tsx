import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors,} from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { Text } from "../common/Text";
import { useToast } from "../common/Toast";

const MAX_LIFE = 40;
const BOARD_SIZE = 3;
const MAX_HAND = 4;

export type SomnusGameState = {
  dreamDeck: PlayingCard[];
  dreamDiscard: PlayingCard[];
  board: (PlayingCard | null)[];
  assignments: PlayingCard[][];
  guardianDeck: PlayingCard[];
  guardianDiscard: PlayingCard[];
  hand: PlayingCard[];
  removedGuardians: PlayingCard[];
  removedNightmares: PlayingCard[];
  life: number;
  playedThisTurn: boolean;
  exileUsedThisTurn: boolean;
  remSleepUsed: boolean;
  turn: number;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

function createEmptyState(): SomnusGameState {
  return {
    dreamDeck: [],
    dreamDiscard: [],
    board: [null, null, null],
    assignments: [[], [], []],
    guardianDeck: [],
    guardianDiscard: [],
    hand: [],
    removedGuardians: [],
    removedNightmares: [],
    life: MAX_LIFE,
    playedThisTurn: false,
    exileUsedThisTurn: false,
    remSleepUsed: false,
    turn: 1,
    ended: false,
    won: false,
    winLoseMessage: "",
  };
}

const initialState = createEmptyState();

function isGuardian(card: PlayingCard) {
  return card.suit === "hearts" || card.suit === "diamonds";
}

function isNightmare(card: PlayingCard) {
  return !isGuardian(card);
}

function isGuardianAce(card: PlayingCard) {
  return isGuardian(card) && card.rank === "A";
}

function isNightmareAce(card: PlayingCard | null) {
  return !!card && isNightmare(card) && card.rank === "A";
}

function isAceDestroyer(card: PlayingCard) {
  return (
    isGuardian(card) &&
    (card.rank === "A" ||
      card.rank === "J" ||
      card.rank === "Q" ||
      card.rank === "K")
  );
}

function isNonAceSpecialGuardian(card: PlayingCard) {
  return isGuardian(card) && (isFace(card) || isJoker(card));
}

function copiedCardValue(card: PlayingCard | undefined) {
  if (!card || card.rank === "A") return 0;
  if (isJoker(card)) return 0;
  return rankValue(card);
}

function dreamCardValue(
  card: PlayingCard,
  removedGuardians: PlayingCard[],
  removedNightmares: PlayingCard[],
) {
  if (card.rank === "A") return 0;
  if (!isJoker(card)) return rankValue(card);

  const copiedPile = isGuardian(card) ? removedGuardians : removedNightmares;
  return copiedCardValue(copiedPile.at(-1));
}

function playedValue(
  cards: PlayingCard[],
  board: (PlayingCard | null)[],
  removedGuardians: PlayingCard[],
  removedNightmares: PlayingCard[],
) {
  const baseValue = cards.reduce(
    (total, card) =>
      total +
      (isGuardianAce(card)
        ? 0
        : dreamCardValue(card, removedGuardians, removedNightmares)),
    0,
  );
  const hasGuardianAce = cards.some(isGuardianAce);
  const nightmareAcePresent = board.some(isNightmareAce);

  if (nightmareAcePresent) {
    return hasGuardianAce ? baseValue : baseValue / 2;
  }
  return hasGuardianAce ? baseValue * 2 : baseValue;
}

function canAssignToTarget(
  target: PlayingCard,
  assigned: PlayingCard[],
  selected: PlayingCard[],
  state: SomnusGameState,
) {
  if (selected.length === 0 || selected.some((card) => !isGuardian(card))) {
    return false;
  }

  const combined = [...assigned, ...selected];
  if (combined.filter(isGuardianAce).length > 1) return false;

  if (isNightmare(target)) {
    return combined.filter((card) => !isGuardianAce(card)).length <= 2;
  }

  if (target.rank === "A" && !combined.some(isAceDestroyer)) return false;
  if (isJoker(target) && state.removedGuardians.length === 0) return false;
  if (
    isJoker(target) &&
    state.removedGuardians.at(-1)?.rank === "A" &&
    !combined.some(isAceDestroyer)
  ) {
    return false;
  }

  return (
    playedValue(
      combined,
      state.board,
      state.removedGuardians,
      state.removedNightmares,
    ) >= dreamCardValue(target, state.removedGuardians, state.removedNightmares)
  );
}

function removeCardsById(cards: PlayingCard[], ids: Set<string>) {
  return cards.filter((card) => !ids.has(card.id));
}

function drawGuardians(state: SomnusGameState) {
  const drawCount = state.hand.length === 0 ? 3 : MAX_HAND - state.hand.length;

  for (let index = 0; index < drawCount; index += 1) {
    if (state.guardianDeck.length === 0 && state.guardianDiscard.length > 0) {
      state.guardianDeck = shuffle(state.guardianDiscard.map(flipToBack));
      state.guardianDiscard = [];
    }

    const card = state.guardianDeck.pop();
    if (!card) break;
    state.hand.push(flipToFace(card));
  }
}

function remainingDreamCards(state: SomnusGameState) {
  return [
    ...state.dreamDeck,
    ...state.dreamDiscard,
    ...state.board.filter((card): card is PlayingCard => card !== null),
  ];
}

function checkDreamExhaustion(state: SomnusGameState) {
  const remaining = remainingDreamCards(state);
  const nonAceNightmares = remaining.filter(
    (card) => isNightmare(card) && card.rank !== "A",
  );

  if (nonAceNightmares.length === 0) {
    state.ended = true;
    state.won = true;
    state.winLoseMessage = `Alice awakened with ${state.life} life.`;
    return true;
  }

  const lostSpecialGuardians = state.removedGuardians.filter(
    isNonAceSpecialGuardian,
  ).length;
  if (lostSpecialGuardians >= 7) {
    state.ended = true;
    state.won = false;
    state.winLoseMessage = "Every non-Ace special Guardian was lost.";
    return true;
  }

  return false;
}

function recycleDreamDeck(state: SomnusGameState) {
  if (state.dreamDeck.length > 0) return true;
  if (checkDreamExhaustion(state)) return false;
  if (state.dreamDiscard.length === 0) return false;

  state.dreamDeck = shuffle(state.dreamDiscard.map(flipToBack));
  state.dreamDiscard = [];
  return true;
}

function refillBoard(state: SomnusGameState) {
  for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
    if (state.board[slot]) continue;
    if (!recycleDreamDeck(state)) return;

    const card = state.dreamDeck.pop();
    if (card) state.board[slot] = flipToFace(card);
  }

  if (state.dreamDeck.length === 0 && !state.ended) {
    recycleDreamDeck(state);
  }
}

function resolveBoard(state: SomnusGameState) {
  for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
    const target = state.board[slot];
    if (!target) continue;
    const assigned = state.assignments[slot];

    if (isNightmare(target)) {
      const targetValue = dreamCardValue(
        target,
        state.removedGuardians,
        state.removedNightmares,
      );
      const defenseValue = playedValue(
        assigned,
        state.board,
        state.removedGuardians,
        state.removedNightmares,
      );
      const copiesAce =
        isJoker(target) && state.removedNightmares.at(-1)?.rank === "A";
      const eliminated =
        assigned.length > 0 &&
        (target.rank === "A"
          ? assigned.some(isAceDestroyer)
          : copiesAce || defenseValue > targetValue);

      if (eliminated) {
        state.removedNightmares.push(flipToFace(target));
        state.board[slot] = null;
        if (isFace(target)) {
          state.life = Math.min(MAX_LIFE, state.life + 3);
        }
      } else {
        state.life -= Math.max(0, targetValue - defenseValue);
      }
    } else if (assigned.length > 0) {
      if (isJoker(target)) {
        const restored = state.removedGuardians.pop();
        if (restored) state.guardianDiscard.push(flipToFace(restored));
        state.removedGuardians.push(flipToFace(target));
      } else {
        state.guardianDiscard.push(flipToFace(target));
      }
      state.board[slot] = null;
    }

    state.guardianDiscard.push(...assigned.map(flipToFace));
    state.assignments[slot] = [];

    if (state.life <= 0) {
      state.life = 0;
      state.ended = true;
      state.won = false;
      state.winLoseMessage = "The Nightmares overwhelmed Alice.";
      return;
    }
  }
}

function advanceBoard(state: SomnusGameState) {
  const rightmost = state.board[2];
  if (rightmost) {
    if (isNightmare(rightmost)) {
      state.dreamDiscard.push(flipToFace(rightmost));
    } else {
      state.removedGuardians.push(flipToFace(rightmost));
    }
  }

  const survivors = state.board
    .slice(0, 2)
    .filter((card): card is PlayingCard => card !== null);
  state.board = [
    ...Array.from({ length: BOARD_SIZE - survivors.length }, () => null),
    ...survivors,
  ];
  state.assignments = [[], [], []];
  refillBoard(state);
}

function finishTurn(state: SomnusGameState) {
  resolveBoard(state);
  if (state.ended) return;
  advanceBoard(state);
  if (state.ended) return;
  drawGuardians(state);
  state.playedThisTurn = false;
  state.exileUsedThisTurn = false;
  state.turn += 1;
}

function createGame(cards = createDeck({ includeJokers: true })) {
  const redAces = shuffle(
    cards.filter((card) => isGuardian(card) && card.rank === "A"),
  );
  const startingAce = redAces[0];
  const startingGuardians = cards.filter(
    (card) =>
      isGuardian(card) &&
      (["2", "3", "4", "5"].includes(card.rank) || card.id === startingAce.id),
  );
  const startingIds = new Set(startingGuardians.map((card) => card.id));
  const dreamCards = cards.filter((card) => !startingIds.has(card.id));
  const openingCards = shuffle(
    dreamCards.filter(
      (card) => card.rank !== "A" && !isFace(card) && !isJoker(card),
    ),
  );
  const openingBoard = openingCards.slice(0, BOARD_SIZE).map(flipToFace);
  const openingIds = new Set(openingBoard.map((card) => card.id));

  const state: SomnusGameState = {
    ...createEmptyState(),
    board: openingBoard,
    assignments: [[], [], []],
    guardianDeck: shuffle(startingGuardians.map(flipToBack)),
    dreamDeck: shuffle(
      dreamCards.filter((card) => !openingIds.has(card.id)).map(flipToBack),
    ),
  };
  while (state.hand.length < MAX_HAND) {
    const card = state.guardianDeck.pop();
    if (!card) break;
    state.hand.push(flipToFace(card));
  }
  return state;
}

export const somnusRules = {
  isGuardian,
  isNightmare,
  dreamCardValue,
  playedValue,
  canAssignToTarget,
  drawGuardians,
  checkDreamExhaustion,
  resolveBoard,
  advanceBoard,
  finishTurn,
  createGame,
};

export default function Somnus() {
  const showToast = useToast();
  const [selectedHandIds, setSelectedHandIds] = useState<string[]>([]);
  const [selectedBoardSlot, setSelectedBoardSlot] = useState<number | null>(
    null,
  );

  function clearSelection() {
    setSelectedHandIds([]);
    setSelectedBoardSlot(null);
  }

  const { game, setGame, reset, isLoaded, canUndo, undo, saveUndoState } =
    useStateManager<SomnusGameState>({
      gameStateInitial: initialState,
      resetNonGameStates: clearSelection,
      resetAndSetup: async () => {
        setGame(createEmptyState());
        await delay();
        setGame(createGame());
        await delay(100);
      },
    });

  const selectedCards = game.hand.filter((card) =>
    selectedHandIds.includes(card.id),
  );
  const selectedTarget =
    selectedBoardSlot === null ? null : game.board[selectedBoardSlot];
  const canAssign =
    selectedBoardSlot !== null &&
    !!selectedTarget &&
    canAssignToTarget(
      selectedTarget,
      game.assignments[selectedBoardSlot],
      selectedCards,
      game,
    );
  const canExile =
    selectedCards.length === 1 &&
    selectedBoardSlot !== null &&
    !!selectedTarget &&
    isNightmare(selectedTarget) &&
    !game.exileUsedThisTurn &&
    game.life >= 6;
  const noAssignments = game.assignments.every(
    (assignment) => assignment.length === 0,
  );
  const canDeepBreath =
    selectedCards.length === 1 && !game.playedThisTurn && noAssignments;
  const canRemSleep = game.life <= 10 && !game.remSleepUsed && noAssignments;
  const selectedValue = playedValue(
    selectedCards,
    game.board,
    game.removedGuardians,
    game.removedNightmares,
  );

  function toggleHandCard(card: PlayingCard) {
    setSelectedHandIds((current) =>
      current.includes(card.id)
        ? current.filter((id) => id !== card.id)
        : [...current, card.id],
    );
  }

  function assignCards() {
    if (!canAssign || selectedBoardSlot === null) {
      showToast("That assignment does not meet the target's rules");
      return;
    }

    saveUndoState(structuredClone(game));
    const selectedIds = new Set(selectedHandIds);
    setGame((draft) => {
      const cards = draft.hand.filter((card) => selectedIds.has(card.id));
      draft.hand = removeCardsById(draft.hand, selectedIds);
      draft.assignments[selectedBoardSlot].push(...cards);
      draft.playedThisTurn = true;
    });
    clearSelection();
  }

  function exileNightmare() {
    if (!canExile || selectedBoardSlot === null) return;
    saveUndoState(structuredClone(game));
    const selectedId = selectedHandIds[0];
    setGame((draft) => {
      const discarded = draft.hand.find((card) => card.id === selectedId);
      if (discarded) draft.guardianDiscard.push(flipToFace(discarded));
      draft.hand = draft.hand.filter((card) => card.id !== selectedId);
      const target = draft.board[selectedBoardSlot];
      if (target) draft.dreamDiscard.push(flipToFace(target));
      draft.board[selectedBoardSlot] = null;
      draft.life -= 5;
      draft.exileUsedThisTurn = true;
    });
    clearSelection();
  }

  function resolveTurn() {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => finishTurn(draft));
    clearSelection();
  }

  function deepBreath() {
    if (!canDeepBreath) return;
    saveUndoState(structuredClone(game));
    const selectedId = selectedHandIds[0];
    setGame((draft) => {
      const discarded = draft.hand.find((card) => card.id === selectedId);
      if (discarded) draft.guardianDiscard.push(flipToFace(discarded));
      draft.hand = draft.hand.filter((card) => card.id !== selectedId);
      finishTurn(draft);
    });
    clearSelection();
  }

  function remSleep() {
    if (!canRemSleep) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const dreamCards = [
        ...draft.dreamDeck,
        ...draft.dreamDiscard,
        ...draft.board.filter((card): card is PlayingCard => card !== null),
      ];
      const guardianCards = [
        ...draft.guardianDeck,
        ...draft.guardianDiscard,
        ...draft.hand,
      ];

      draft.dreamDeck = shuffle(dreamCards.map(flipToBack));
      draft.dreamDiscard = [];
      draft.board = [null, null, null];
      draft.assignments = [[], [], []];
      for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
        const card = draft.dreamDeck.pop();
        if (card) draft.board[slot] = flipToFace(card);
      }

      draft.guardianDeck = shuffle(guardianCards.map(flipToBack));
      draft.guardianDiscard = [];
      draft.hand = [];
      while (draft.hand.length < MAX_HAND) {
        const card = draft.guardianDeck.pop();
        if (!card) break;
        draft.hand.push(flipToFace(card));
      }
      draft.remSleepUsed = true;
    });
    clearSelection();
  }

  const zones: MapZone[] = useMemo(() => {
    const boardZones = game.board.map((card, slot) => ({
      id: `board-${slot}`,
      name: "board",
      pileIndex: slot,
      cards: card ? [card] : [],
      col: 2.25 + slot,
      row: 0.75,
      baseZIndex: 20,
      placeholder: {},
    }));
    const assignmentZones = game.assignments.map((cards, slot) => ({
      id: `assignment-${slot}`,
      name: "assignment",
      pileIndex: slot,
      cards,
      col: 2.25 + slot,
      row: 1.5,
      baseZIndex: 30,
      fan: { direction: "down" as const, offset: cardDims.smallCardOffset },
    }));

    return [
      {
        id: "dream-discard",
        name: "dreamDiscard",
        cards: game.dreamDiscard,
        col: 0,
        row: 0.75,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dscrd", infoPos: "below" },
      },
      {
        id: "dream-deck",
        name: "dreamDeck",
        cards: game.dreamDeck,
        col: 1,
        row: 0.75,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dream", infoPos: "below", showCount: true },
      },
      ...boardZones,
      {
        id: "removed-nightmares",
        name: "removedNightmares",
        cards: game.removedNightmares,
        col: 5.5,
        row: 0.75,
        fan: { maxVisible: 3 },
        placeholder: { text: "Rmvd", infoPos: "below", showCount: true },
      },
      {
        id: "removed-guardians",
        name: "removedGuardians",
        cards: game.removedGuardians,
        col: 5.5,
        row: 3,
        fan: { maxVisible: 3 },
        placeholder: { text: "Rmvd", infoPos: "above", showCount: true },
      },
      ...assignmentZones,
      {
        id: "guardian-discard",
        name: "guardianDiscard",
        cards: game.guardianDiscard,
        col: 0,
        row: 3,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dscrd", infoPos: "above" },
      },
      {
        id: "guardian-deck",
        name: "guardianDeck",
        cards: game.guardianDeck,
        col: 1,
        row: 3,
        fan: { maxVisible: 3 },
        placeholder: { text: "Guard", infoPos: "above", showCount: true },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 2.25,
        row: 3,
        width: 3,
        fan: { direction: "right", offset: zoneFanOffset(game.hand.length, 3) },
        placeholder: {},
      },
      {
        id: "life",
        col: 0,
        row: 0,
        width: "full",
        height: 0.4,
        baseZIndex: 10,
      },
      {
        id: "actions",
        col: 0,
        row: 4.25,
        width: "full",
        height: 2,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const selected = selectedHandIds.includes(mappedCard.card.id);
      return {
        isSelected: selected,
        selectColor: "blue",
        yOffset: selected ? -0.12 : 0,
        onPress: () => toggleHandCard(mappedCard.card),
      };
    }

    if (mappedCard.zoneName === "board") {
      const selected = selectedBoardSlot === mappedCard.pileIndex;
      return {
        isSelected: selected,
        selectColor: isNightmare(mappedCard.card) ? "red" : "green",
        onPress: () =>
          setSelectedBoardSlot(
            selected ? null : (mappedCard.pileIndex ?? null),
          ),
      };
    }

    return { isDisabled: true, clickThroughCards: true };
  };

  const zoneMapper = (zone: MapZone) => {
    if (zone.name !== "board" || zone.pileIndex === undefined) return;
    const selected = selectedBoardSlot === zone.pileIndex;
    return {
      isSelected: selected,
      forceOverlayColor: selected,
      selectColor: selected ? "blue" : "none",
      onPress: () => setSelectedBoardSlot(selected ? null : zone.pileIndex!),
    };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
  });

  const targetValue = selectedTarget
    ? dreamCardValue(
        selectedTarget,
        game.removedGuardians,
        game.removedNightmares,
      )
    : null;

  const lifePreview = structuredClone(game);

  resolveBoard(lifePreview);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={game.life}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}

      <View style={[getZoneStylesById("life"), flexStyles.rowCentered]}>
        <Text size="md" weight={600} color={Colors.K100} style={{ flex: 1 }}>
          Turn {game.turn}
        </Text>

        <ProgressBar
          totalValue={MAX_LIFE}
          progressValue={game.life}
          previewProgressValue={lifePreview.life}
          autoTallyText
          color={
            game.life / MAX_LIFE <= 0.25
              ? "red"
              : game.life / MAX_LIFE <= 0.5
                ? "orange"
                : "green"
          }
          iconName="heart"
          scaledHeight={cardHeight * 0.4}
          style={{ flex: 3.4 }}
        />
      </View>

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          {
            gap: cardHeight * 0.2,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              gap: cardHeight * 0.2,
            },
          ]}
        >
          <Text size="md" weight={500} color={Colors.K200}>
            {selectedTarget
              ? `${isNightmare(selectedTarget) ? "Nightmare" : "Guardian"}: ${targetValue}`
              : "Select nightmare or guardian"}
          </Text>
          <Text size="md" weight={500} color={Colors.K200}>
            {`Selected: ${selectedValue}`}
          </Text>
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: cardHeight * 0.2 },
          ]}
        >
          <Button
            text="Assign"
            size="sm"
            theme="green"
            disabled={!canAssign}
            onPress={assignCards}
            style={[flexStyles.flex1]}
            taller
          />
          <Button
            text="Exile"
            size="sm"
            theme="red"
            disabled={!canExile}
            onPress={exileNightmare}
            style={[flexStyles.flex1]}
            taller
          />
          <Button
            text="Resolve"
            size="sm"
            theme="blue"
            onPress={resolveTurn}
            style={[flexStyles.flex1]}
            taller
          />
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: cardHeight * 0.2 },
          ]}
        >
          <Button
            text="Deep Breath"
            size="sm"
            theme="purple"
            disabled={!canDeepBreath}
            onPress={deepBreath}
            style={[flexStyles.flex1]}
          />
          <Button
            text={game.remSleepUsed ? "REM Used" : "REM Sleep"}
            size="sm"
            theme="orange"
            disabled={!canRemSleep}
            onPress={remSleep}
            style={[flexStyles.flex1]}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
