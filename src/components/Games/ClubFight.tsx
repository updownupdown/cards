import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  sortCardsByRank,
  SUIT_SYMBOLS,
  zoneFanOffset,
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
import { flexStyles } from "@/styles/flexStyles";
import { darkenHexColor, firstLetterUppercase, delay } from "@/utils/utils";
import { Icon, IconName } from "@/icons";
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";

type ClubFightDifficulty = "easy" | "hard";
type Action =
  | "match"
  | "sum"
  | "any"
  | "line"
  | "row"
  | "column"
  | "down"
  | "up"
  | "run";

const ActionNames: Record<Action, string> = {
  match: "Match",
  sum: "Sum",
  any: "Any",
  line: "♦ Line",
  row: "♦ Row",
  column: "♦ Col",
  down: "♠ Down",
  up: "♠ Up",
  run: "♥ Sequence",
};

const ActionIcons: Partial<Record<Action, IconName>> = {
  match: "equal-outline",
  sum: "plus-outline",
  any: "help-outline",
  row: "card-row",
  column: "card-column",
  down: "arrow-down",
  up: "arrow-up",
  run: "sequence",
};

export type ClubFightGameState = {
  clubsDeck: PlayingCard[];
  gridDeck: PlayingCard[];
  hand: PlayingCard[];
  grid: (PlayingCard | null)[];
  discard: PlayingCard[];
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
  discard: [],
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

function createClubFightDiscard(difficulty: ClubFightDifficulty) {
  const deck = createDeck({ faceUp: false });
  const jokers = createDeck({ includeJokers: true })
    .filter((card) => card.rank === "Joker")
    .slice(0, difficulty === "hard" ? 2 : 1);
  return [...deck, ...jokers];
}

function collectClubFightCards(state: Readonly<ClubFightGameState>) {
  return flipAllToBack([
    ...state.clubsDeck,
    ...state.gridDeck,
    ...state.hand,
    ...state.grid.filter((card): card is PlayingCard => card !== null),
    ...state.discard,
  ]);
}

function shuffleClubFightCards(
  cards: PlayingCard[],
  difficulty: ClubFightDifficulty,
) {
  const jokerCount = difficulty === "hard" ? 2 : 1;
  const collectedCards =
    cards.length > 0 ? cards : createDeck({ faceUp: false });
  const jokers = collectedCards.filter((card) => card.rank === "Joker");
  const additionalJokers = createDeck({ includeJokers: true })
    .filter((card) => card.rank === "Joker")
    .slice(jokers.length, jokerCount);
  return shuffle([
    ...collectedCards.filter((card) => card.rank !== "Joker"),
    ...jokers.slice(0, jokerCount),
    ...additionalJokers,
  ]);
}

function isValued(card: PlayingCard | null): card is PlayingCard {
  return card !== null && card.rank !== "Joker";
}

function suitCount(grid: readonly (PlayingCard | null)[], suit: CardSuit) {
  return grid.filter((card) => isValued(card) && card.suit === suit).length;
}

function isBlocked(grid: readonly (PlayingCard | null)[], action: Action) {
  if (["line", "row", "column"].includes(action)) {
    return suitCount(grid, "diamonds") >= 3;
  }
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

function actionLine(action: Action, selectedIndexes: number[]) {
  const selectedIndex = selectedIndexes[0];
  if (action === "row") return Math.floor(selectedIndex / 3);
  if (action === "column") return (selectedIndex % 3) + 3;
  return null;
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

function getActionClearIndexes(
  state: Readonly<ClubFightGameState>,
  club: PlayingCard,
  action: Action,
  selectedIndexes: number[],
) {
  if (isBlocked(state.grid, action)) return [];
  if (
    (action === "match" || action === "up" || action === "down") &&
    selectedIndexes.length > 0
  ) {
    return [];
  }
  if (action === "row" || action === "column") {
    const selectedCard = state.grid[selectedIndexes[0]];
    if (
      selectedIndexes.length !== 1 ||
      !isValued(selectedCard) ||
      rankValue(selectedCard) !== rankValue(club)
    ) {
      return [];
    }
    return getClearIndexes(
      state,
      club,
      "line",
      selectedIndexes,
      actionLine(action, selectedIndexes),
    );
  }
  return getClearIndexes(state, club, action, selectedIndexes, null);
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
    draft.hand = sortCardsByRank(draft.hand);
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
  draft.discard.push(flipToBack(club));
  for (const index of clearIndexes) {
    const card = draft.grid[index];
    if (!card) continue;
    draft.discard.push(flipToBack(card));
    draft.grid[index] = null;
  }
  refreshGrid(draft);
  refreshHand(draft);
  evaluateOutcome(draft);
  return true;
}

export const clubFightRules = {
  createDecks: createClubFightDecks,
  createDiscard: createClubFightDiscard,
  collectCards: collectClubFightCards,
  shuffleCards: shuffleClubFightCards,
  suitCount,
  isBlocked,
  isRunWithClub,
  lineIndexes,
  getClearIndexes,
  getActionClearIndexes,
  refreshGrid,
  refreshHand,
  evaluateOutcome,
  playAction,
};

export default function ClubFight() {
  const { spacing } = useResponsiveMetrics();
  const { height: viewportHeight } = useViewportDimensions();
  const difficulty = useGameSettingValue(
    "clubFightDifficulty",
  ) as ClubFightDifficulty;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [selectedGridIndexes, setSelectedGridIndexes] = useState<number[]>([]);
  const [showDeckPreview, setShowDeckPreview] = useState(false);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedClubId(null);
        setSelectedGridIndexes([]);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          draft.discard = collectClubFightCards(draft);
          if (draft.discard.length === 0) {
            draft.discard = createClubFightDiscard(difficultyRef.current);
          }
          draft.clubsDeck = [];
          draft.gridDeck = [];
          draft.hand = [];
          draft.grid = Array.from({ length: GRID_SIZE }, () => null);
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
        });

        await delay();

        setGame((draft) => {
          const shuffledCards = shuffleClubFightCards(
            draft.discard,
            difficultyRef.current,
          );
          draft.clubsDeck = shuffledCards.filter(
            (card) => card.suit === "clubs",
          );
          draft.gridDeck = shuffledCards.filter(
            (card) => card.suit !== "clubs",
          );
          draft.discard = [];
          refreshGrid(draft);
          refreshHand(draft);
        });
      },
    });

  const selectedClub =
    game.hand.find((card) => card.id === selectedClubId) ?? null;

  function clearSelections() {
    setSelectedClubId(null);
    setSelectedGridIndexes([]);
  }

  function toggleGridCard(index: number) {
    if (game.grid[index] === null) return;
    setSelectedGridIndexes((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index],
    );
  }

  function execute(action: Action) {
    if (!selectedClubId || !selectedClub) return;
    const clearIndexes = getActionClearIndexes(
      game,
      selectedClub,
      action,
      selectedGridIndexes,
    );
    if (clearIndexes.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      playAction(
        draft,
        selectedClubId,
        action === "row" || action === "column" ? "line" : action,
        selectedGridIndexes,
        actionLine(action, selectedGridIndexes),
      );
    });
    clearSelections();
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones = getGridColRows({
      cols: 3,
      rows: 3,
      colOffset: 2,
      rowOffset: 0,
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
      {
        id: "grid",
        name: "grid",
        cards: game.gridDeck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Grid", infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: 1,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dscrd", infoPos: "right" },
      },
      {
        id: "clubs",
        name: "clubs",
        cards: game.clubsDeck,
        col: 0,
        row: 2,
        fan: { maxVisible: 3 },
        placeholder: { text: "Clubs", infoPos: "right" },
      },
      ...gridZones,
      {
        id: "leftActions",
        name: "leftActions",
        col: 0,
        row: 3.1,
        width: 2,
        height: 2.7,
      },
      {
        id: "bottomActions",
        name: "bottomActions",
        col: 2,
        row: 4.8,
        width: 3,
        height: 1,
      },
      {
        id: "clearButton",
        name: "clearButton",
        col: 2,
        row: 3.1,
        width: 3,
        height: 0.5,
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 2,
        row: 3.7,
        width: 3,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, 3.5),
        },
        placeholder: {},
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "discard") {
      return { clickThroughCards: true };
    } else if (mappedCard.zoneName === "hand") {
      const isSelected = mappedCard.card.id === selectedClubId;
      return {
        isSelected,
        isDisabled: game.ended,
        selectColor: isSelected ? "blue" : "none",
        onPress: () => {
          setSelectedClubId((current) =>
            current === mappedCard.card.id ? null : mappedCard.card.id,
          );
        },
      };
    } else if (
      mappedCard.zoneName === "grid" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const isSelected = selectedGridIndexes.includes(index);
      return {
        isSelected,
        isDisabled: game.ended,
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
    zoneMapper: (zone) => {
      if (zone.id !== "discard") return;

      return {
        onPress: () => setShowDeckPreview(true),
        isDisabled: game.discard.length === 0,
      };
    },
    cardSize: "small",
  });

  function canExecute(action: Action) {
    return (
      !!selectedClub &&
      getActionClearIndexes(game, selectedClub, action, selectedGridIndexes)
        .length > 0
    );
  }

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.discard.length}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.winLoseMessage}
    >
      <DeckPreviewModal
        visible={showDeckPreview}
        cards={game.discard}
        onClose={() => setShowDeckPreview(false)}
        title="Deck Preview"
        sortCards
      />

      {cardMap}

      {/* Left Action */}
      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("leftActions"),
          {
            flexWrap: "wrap",
            columnGap: "6%",
            rowGap: "4%",
          },
        ]}
      >
        {(
          [
            { suit: "diamonds", actions: ["column", "row"] },
            { suit: "spades", actions: ["up", "down"] },
            { suit: "hearts", actions: ["run"] },
          ] as { suit: string; actions: Action[] }[]
        ).map((group, groupIndex) => {
          const count = suitCount(game.grid, group.suit as CardSuit);
          const isBlocked = game.hand.length === 0 || count >= 3;

          return (
            <View
              key={groupIndex}
              style={[
                flexStyles.spaceBetween,
                {
                  flexDirection: group.suit === "hearts" ? "row" : "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: group.suit === "hearts" ? "100%" : "47%",
                  height: group.suit === "hearts" ? "28%" : "68%",
                  borderRadius: spacing(6),
                  padding: spacing(8),
                  gap: spacing(8),
                  backgroundColor: isBlocked
                    ? rgba(Colors.K850, 0.3)
                    : rgba(Colors.K850, 0.8),
                },
              ]}
            >
              <View style={[flexStyles.colCentered, { padding: spacing(6) }]}>
                <Icon
                  name={group.suit as IconName}
                  size={20}
                  color={
                    isBlocked ? Colors.cardSelectRed : Colors.cardSelectGreen
                  }
                />
              </View>

              {group.actions.map((action) => (
                <Button
                  key={action}
                  iconName={ActionIcons[action]}
                  size="md"
                  theme={canExecute(action) ? "green" : "blue"}
                  onPress={() => execute(action)}
                  disabled={game.ended || !canExecute(action)}
                  iconSize={
                    viewportHeight < 600 ? 18 : viewportHeight < 700 ? 22 : 24
                  }
                  style={[
                    {
                      width: "100%",
                      flex: 1,
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                      opacity: isBlocked ? 0.3 : 1,
                      boxShadow: isBlocked ? "none" : undefined,
                      backgroundColor: isBlocked ? "none" : undefined,
                    },
                  ]}
                />
              ))}
            </View>
          );
        })}
      </View>

      {/* Clear button */}
      <View style={[getZoneStylesById("clearButton")]}>
        <Button
          text="Clear"
          size={
            viewportHeight < 600 ? "xxs" : viewportHeight < 700 ? "xs" : "sm"
          }
          theme="blue"
          onPress={clearSelections}
          disabled={
            game.ended || (!selectedClub && selectedGridIndexes.length === 0)
          }
          style={{ width: "100%", height: "100%" }}
        />
      </View>

      {/* Bottom Actions */}
      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("bottomActions"),
          { gap: spacing(10) },
        ]}
      >
        {(["match", "sum", "any"] as Action[]).map((action) => (
          <Button
            key={action}
            text={ActionNames[action]}
            iconName={ActionIcons[action]}
            size={
              viewportHeight < 600 ? "xxs" : viewportHeight < 700 ? "xs" : "sm"
            }
            theme={canExecute(action) ? "green" : "blue"}
            onPress={() => execute(action)}
            disabled={game.ended || !canExecute(action)}
            iconSize={
              viewportHeight < 600 ? 20 : viewportHeight < 700 ? 26 : 32
            }
            style={[{ flex: 1, height: "100%", flexDirection: "column" }]}
          />
        ))}
      </View>
    </GameWrapper>
  );
}
