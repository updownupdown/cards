import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

type ClubFightDifficulty = "easy" | "hard";
type Action = "match" | "sum" | "any" | "line" | "down" | "up" | "run";

export type ClubFightGameState = {
  clubsDeck: PlayingCard[];
  gridDeck: PlayingCard[];
  hand: PlayingCard[];
  grid: (PlayingCard | null)[];
  clubsDiscard: PlayingCard[];
  gridDiscard: PlayingCard[];
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

const HAND_LIMIT = 4;
const GRID_SIZE = 9;

const gameStateInitial: ClubFightGameState = {
  clubsDeck: [],
  gridDeck: [],
  hand: [],
  grid: Array.from({ length: GRID_SIZE }, () => null),
  clubsDiscard: [],
  gridDiscard: [],
  ended: false,
  won: false,
  winLoseMessage: "",
};

function createClubFightDecks(difficulty: ClubFightDifficulty) {
  const deck = createDeck({ faceUp: false });
  const jokers = createDeck({ includeJokers: true })
    .filter((card) => card.rank === "Joker")
    .slice(0, difficulty === "hard" ? 2 : 1);
  return {
    clubs: shuffle(deck.filter((card) => card.suit === "clubs")),
    grid: shuffle([...deck.filter((card) => card.suit !== "clubs"), ...jokers]),
  };
}

function isValued(card: PlayingCard | null): card is PlayingCard {
  return card !== null && card.rank !== "Joker";
}

function suitCount(grid: readonly (PlayingCard | null)[], suit: CardSuit) {
  return grid.filter((card) => isValued(card) && card.suit === suit).length;
}

function isBlocked(grid: readonly (PlayingCard | null)[], action: Action) {
  if (action === "line") return suitCount(grid, "diamonds") >= 3;
  if (action === "down" || action === "up") {
    return suitCount(grid, "spades") >= 3;
  }
  if (action === "run") return suitCount(grid, "hearts") >= 3;
  return false;
}

function selectionValue(cards: PlayingCard[]) {
  return cards.reduce((sum, card) => sum + rankValue(card), 0);
}

function isRunWithClub(club: PlayingCard, cards: PlayingCard[]) {
  if (cards.length === 0 || cards.some((card) => card.rank === "Joker")) {
    return false;
  }
  const values = [
    rankValue(club),
    ...cards.map((card) => rankValue(card)),
  ].sort((left, right) => left - right);
  return (
    new Set(values).size === values.length &&
    values.every(
      (value, index) => index === 0 || value === values[index - 1] + 1,
    )
  );
}

function lineIndexes(line: number) {
  return line < 3
    ? [line * 3, line * 3 + 1, line * 3 + 2]
    : [line - 3, line, line + 3];
}

function getClearIndexes(
  state: Readonly<ClubFightGameState>,
  club: PlayingCard,
  action: Action,
  selectedIndexes: number[],
  selectedLine: number | null,
) {
  if (isBlocked(state.grid, action)) return [];
  const selectedCards = selectedIndexes
    .map((index) => state.grid[index])
    .filter((card): card is PlayingCard => card !== null);
  const clubValue = rankValue(club);

  if (action === "match") {
    return state.grid.flatMap((card, index) =>
      isValued(card) && rankValue(card) === clubValue ? [index] : [],
    );
  }
  if (action === "sum") {
    return selectedCards.every((card) => card.rank !== "Joker") &&
      selectedCards.length > 0 &&
      selectionValue(selectedCards) === clubValue
      ? selectedIndexes
      : [];
  }
  if (action === "any")
    return selectedCards.length === 1 ? selectedIndexes : [];
  if (action === "line") {
    if (selectedLine === null) return [];
    const indexes = lineIndexes(selectedLine);
    return indexes.some((index) => {
      const card = state.grid[index];
      return isValued(card) && rankValue(card) === clubValue;
    })
      ? indexes.filter((index) => state.grid[index] !== null)
      : [];
  }
  if (action === "down" || action === "up") {
    const allowed =
      action === "down"
        ? clubValue >= 2 && clubValue <= 7
        : clubValue >= 7 && clubValue <= 12;
    if (!allowed) return [];
    return state.grid.flatMap((card, index) =>
      isValued(card) &&
      (action === "down"
        ? rankValue(card) < clubValue
        : rankValue(card) > clubValue)
        ? [index]
        : [],
    );
  }
  return isRunWithClub(club, selectedCards) ? selectedIndexes : [];
}

function refreshGrid(draft: ClubFightGameState) {
  for (let index = 0; index < GRID_SIZE; index += 1) {
    if (draft.grid[index] !== null) continue;
    const card = draft.gridDeck.pop();
    if (!card) break;
    draft.grid[index] = flipToFace(card);
  }
}

function refreshHand(draft: ClubFightGameState) {
  while (draft.hand.length < HAND_LIMIT) {
    const card = draft.clubsDeck.pop();
    if (!card) break;
    draft.hand.push(flipToFace(card));
  }
}

function evaluateOutcome(draft: ClubFightGameState) {
  if (
    draft.gridDeck.length === 0 &&
    draft.grid.every((card) => card === null)
  ) {
    draft.ended = true;
    draft.won = true;
    draft.winLoseMessage = "The grid is clear. Club Fight won!";
  } else if (draft.hand.length === 0 && draft.clubsDeck.length === 0) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = "All 13 Clubs are spent.";
  }
}

function playAction(
  draft: ClubFightGameState,
  clubId: string,
  action: Action,
  selectedIndexes: number[],
  selectedLine: number | null,
) {
  if (draft.ended) return false;
  const clubIndex = draft.hand.findIndex((card) => card.id === clubId);
  const club = draft.hand[clubIndex];
  if (!club) return false;
  const clearIndexes = getClearIndexes(
    draft,
    club,
    action,
    selectedIndexes,
    selectedLine,
  );
  if (clearIndexes.length === 0) return false;

  draft.hand.splice(clubIndex, 1);
  draft.clubsDiscard.push(flipToFace(club));
  for (const index of clearIndexes) {
    const card = draft.grid[index];
    if (!card) continue;
    draft.gridDiscard.push(flipToFace(card));
    draft.grid[index] = null;
  }
  refreshGrid(draft);
  refreshHand(draft);
  evaluateOutcome(draft);
  return true;
}

export const clubFightRules = {
  createDecks: createClubFightDecks,
  suitCount,
  isBlocked,
  isRunWithClub,
  lineIndexes,
  getClearIndexes,
  refreshGrid,
  refreshHand,
  evaluateOutcome,
  playAction,
};

export default function ClubFight() {
  const { spacing } = useResponsiveMetrics();
  const difficulty = useGameSettingValue(
    "clubFightDifficulty",
  ) as ClubFightDifficulty;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [selectedGridIndexes, setSelectedGridIndexes] = useState<number[]>([]);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedClubId(null);
        setSelectedAction(null);
        setSelectedGridIndexes([]);
        setSelectedLine(null);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          const decks = createClubFightDecks(difficultyRef.current);
          draft.clubsDeck = decks.clubs;
          draft.gridDeck = decks.grid;
          draft.hand = [];
          draft.grid = Array.from({ length: GRID_SIZE }, () => null);
          draft.clubsDiscard = [];
          draft.gridDiscard = [];
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
          refreshGrid(draft);
          refreshHand(draft);
        });
      },
    });

  const selectedClub =
    game.hand.find((card) => card.id === selectedClubId) ?? null;
  const blocked = selectedAction ? isBlocked(game.grid, selectedAction) : false;

  function chooseAction(action: Action) {
    setSelectedAction(action);
    setSelectedGridIndexes([]);
    setSelectedLine(null);
  }

  function toggleGridCard(index: number) {
    if (!selectedAction || !["sum", "any", "run"].includes(selectedAction))
      return;
    if (game.grid[index] === null) return;
    setSelectedGridIndexes((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : selectedAction === "any"
          ? [index]
          : [...current, index],
    );
  }

  function execute(line: number | null = selectedLine) {
    if (!selectedClubId || !selectedClub || !selectedAction || blocked) return;
    const clearIndexes = getClearIndexes(
      game,
      selectedClub,
      selectedAction,
      selectedGridIndexes,
      line,
    );
    if (clearIndexes.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      playAction(
        draft,
        selectedClubId,
        selectedAction,
        selectedGridIndexes,
        line,
      );
    });
    setSelectedClubId(null);
    setSelectedAction(null);
    setSelectedGridIndexes([]);
    setSelectedLine(null);
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones = getGridColRows({
      cols: 3,
      rows: 3,
      colOffset: 2.5,
      rowOffset: 1.15,
    }).map((position, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: game.grid[index] ? [game.grid[index]!] : undefined,
      col: position.c,
      row: position.r,
      baseZIndex: 20,
      placeholder: {},
    }));
    return [
      { id: "hud", col: 0, row: 0, width: 3, height: 1 },
      {
        id: "clubsDeck",
        name: "clubsDeck",
        cards: game.clubsDeck,
        col: 3.5,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Clubs", infoPos: "above" },
      },
      {
        id: "gridDeck",
        name: "gridDeck",
        cards: game.gridDeck,
        col: 4.75,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Grid", infoPos: "above" },
      },
      {
        id: "clubsDiscard",
        name: "clubsDiscard",
        cards: game.clubsDiscard,
        col: 6,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Spent", infoPos: "above" },
      },
      {
        id: "gridDiscard",
        name: "gridDiscard",
        cards: game.gridDiscard,
        col: 7.25,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Clear", infoPos: "above" },
      },
      ...gridZones,
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: 4.35,
        width: 4.3,
        fan: { direction: "right", offset: 0.65, center: true },
        placeholder: { text: "Hand", infoPos: "above" },
      },
      { id: "actions", col: 4.45, row: 4.25, width: 3.8, height: 2.1 },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const isSelected = mappedCard.card.id === selectedClubId;
      return {
        isSelected,
        isDisabled: game.ended,
        selectColor: isSelected ? "green" : "none",
        onPress: () => setSelectedClubId(mappedCard.card.id),
      };
    }
    if (mappedCard.zoneName === "grid" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      const selectable =
        !!selectedAction && ["sum", "any", "run"].includes(selectedAction);
      const isSelected = selectedGridIndexes.includes(index);
      return {
        isSelected,
        isDisabled: game.ended || !selectable,
        selectColor: isSelected ? "blue" : "none",
        onPress: () => toggleGridCard(index),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 8.25,
    fixedRows: 6.6,
    paddingTop: 0.25,
    paddingBottom: 0.25,
  });

  const actionNeedsTarget =
    selectedAction === "sum" ||
    selectedAction === "any" ||
    selectedAction === "run";
  const canExecute =
    !!selectedClub &&
    !!selectedAction &&
    !blocked &&
    (!actionNeedsTarget || selectedGridIndexes.length > 0);

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={game.gridDiscard.length}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}
      <View style={[getZoneStylesById("hud"), { justifyContent: "center" }]}>
        <Text size="xs" color={rgba(Colors.white, 0.72)}>
          CLUBS SPENT: {game.clubsDiscard.length} / 13
        </Text>
        <Text size="lg" weight="bold" color="#e4f1c8">
          Grid cards cleared: {game.gridDiscard.length}
        </Text>
        <Text size="xs" color={rgba(Colors.white, 0.82)}>
          {selectedClub
            ? `Selected: ${selectedClub.rank} of Clubs`
            : "Choose a Club card"}
        </Text>
      </View>

      <View style={[getZoneStylesById("actions"), { gap: spacing(6) }]}>
        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(5) }}
        >
          {(
            ["match", "sum", "any", "line", "down", "up", "run"] as Action[]
          ).map((action) => (
            <Button
              key={action}
              text={
                action === "down"
                  ? "Down"
                  : action === "up"
                    ? "Up"
                    : action[0].toUpperCase() + action.slice(1)
              }
              size="xs"
              theme={selectedAction === action ? "orange" : "blue"}
              onPress={() => chooseAction(action)}
              disabled={
                !selectedClub || game.ended || isBlocked(game.grid, action)
              }
            />
          ))}
        </View>
        {selectedAction === "line" ? (
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing(5) }}
          >
            {Array.from({ length: 6 }, (_, line) => (
              <Button
                key={line}
                text={line < 3 ? `Row ${line + 1}` : `Col ${line - 2}`}
                size="xs"
                theme={selectedLine === line ? "orange" : "purple"}
                onPress={() => {
                  setSelectedLine(line);
                  execute(line);
                }}
                disabled={!selectedClub || blocked || game.ended}
              />
            ))}
          </View>
        ) : (
          <>
            <Text
              size="xs"
              color={blocked ? Colors.buttonRed : rgba(Colors.white, 0.82)}
            >
              {blocked
                ? "Blocked by three matching suits in the grid."
                : actionNeedsTarget
                  ? "Select grid cards, then clear them."
                  : "Use the selected Club card."}
            </Text>
            <Button
              text="Use Action"
              theme="green"
              fullWidth
              onPress={() => execute()}
              disabled={!canExecute}
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
