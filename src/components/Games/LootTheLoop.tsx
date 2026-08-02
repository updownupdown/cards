import { useFade } from "@/hooks/useFade";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { Animated, View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { infoSize } from "../Cards/CardMapBackgrounds";
import {
  cardDims,
  CardSuit,
  createDeck,
  flipAllToBack,
  isAce,
  isFace,
  isJoker,
  isNumberRank,
  RANK_VALUE,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

const maxMarkedPaths = 3;

export type LoopRank = PlayingCard["rank"] | "Joker";

export type LoopCard = {
  id: string;
  suit: CardSuit;
  rank: LoopRank;
  faceUp: boolean;
};

type Path = LoopCard | null;
type MarkedPaths = [Path, Path, Path];
type Note = { card: LoopCard; index: number };

type GameState = {
  deck: LoopCard[];
  dealDeck: LoopCard[];
  deckPos: number;
  paths: MarkedPaths;
  acesPile: LoopCard[];
  trinketsPile: LoopCard[];
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
  numLoops: number;
};

function isBadStartCard(card: LoopCard) {
  return isJoker(card) || isAce(card) || isFace(card);
}

function getLoopDeck(): LoopCard[] {
  const base: LoopCard[] = createDeck({ faceUp: false }).map((card) => ({
    ...card,
    rank: card.rank as LoopRank,
    faceUp: false,
  }));

  const withJoker: LoopCard[] = [
    ...base,
    { id: "joker-loop", suit: "spades", rank: "Joker", faceUp: false },
  ];

  let deck: LoopCard[];
  // Ensure first two cards are not both face cards
  do {
    deck = shuffle(withJoker);
  } while (isBadStartCard(deck[0]) && isBadStartCard(deck[1]));

  return deck;
}

export const lootTheLoopRules = {
  isBadStartCard,
  getLoopDeck,
  maxMarkedPaths,
};

const gameStateInitial: GameState = {
  deck: [],
  dealDeck: getLoopDeck(),
  deckPos: 0,
  paths: [null, null, null],
  acesPile: [],
  trinketsPile: [],
  ended: false,
  won: false,
  numLoops: 0,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards to dealDeck
  setGame((draft) => {
    const allCards = [
      ...draft.deck,
      ...draft.dealDeck,
      ...draft.acesPile,
      ...draft.trinketsPile,
      ...draft.paths.filter((p) => p !== null).map((p) => p as LoopCard),
    ];

    draft.deck = [];
    draft.dealDeck = flipAllToBack(allCards);
    draft.acesPile = [];
    draft.trinketsPile = [];
    draft.paths = [null, null, null];
    draft.deckPos = 0;
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
    draft.numLoops = 0;
  });

  await delay(bufferedDefaultAnimDuration * 1.5);

  // Deal new cards from dealDeck to deck
  setGame((draft) => {
    draft.deck = shuffle(draft.dealDeck);
    draft.dealDeck = [];
  });
}

export default function LootTheLoop() {
  const { scale: responsiveScale } = useResponsiveMetrics();
  const scaleByLayout = (value: number) => value * responsiveScale;

  const [selectedCardIndex, setSelectedCardIndex] = useState<
    number | undefined
  >(undefined);
  const [selectedPath, setSelectedPath] = useState<Note | undefined>(undefined);
  const [selectedRevealedRank, setSelectedRevealedRank] = useState<
    number | undefined
  >(undefined);

  const orbitingLoopAnimation: AnimatedCardMapping = {
    orbitConfig: { enabled: true },
  };

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedCardIndex(undefined);
        setSelectedPath(undefined);
        setSelectedRevealedRank(undefined);
      },
    });

  useEffect(() => {
    const selectedCard =
      selectedCardIndex !== undefined
        ? game.deck[selectedCardIndex]
        : undefined;

    const selectedRevealedIsNumber = !!(
      selectedCard !== undefined &&
      selectedCard.faceUp &&
      isNumberRank(selectedCard.rank)
    );

    setSelectedRevealedRank(
      selectedRevealedIsNumber ? RANK_VALUE[selectedCard!.rank] : undefined,
    );
  }, [selectedCardIndex, game.deck]);

  // Look around
  function lookAround() {
    if (game.deck.length === 0) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.deck.length === 0) return;

      // Turn two cards up in current and next position
      const index0 = draft.deckPos;
      const index1 = (draft.deckPos + 1) % draft.deck.length;

      draft.deck[index0] = { ...draft.deck[index0], faceUp: true };
      draft.deck[index1] = { ...draft.deck[index1], faceUp: true };
    });

    setSelectedCardIndex(game.deckPos);
  }

  // Mark path
  async function markPath(selectedCardId: string, noteIndex: number) {
    const pathToMark = game.deck.find((card) => card.id === selectedCardId);
    if (
      !pathToMark ||
      game.paths.filter((p) => p !== null).length >= maxMarkedPaths ||
      game.paths[noteIndex] !== null ||
      !pathToMark.faceUp ||
      !isNumberRank(pathToMark.rank)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setSelectedCardIndex(undefined);

    setGame((draft) => {
      const indexToMark = draft.deck.findIndex(
        (card) => card.id === selectedCardId,
      );
      if (indexToMark < 0) return;

      const draftPathToMark = draft.deck[indexToMark];
      if (
        !draftPathToMark ||
        !draftPathToMark.faceUp ||
        !isNumberRank(draftPathToMark.rank)
      ) {
        return;
      }

      const notes: MarkedPaths = [...draft.paths];
      notes[noteIndex] = draftPathToMark;

      draft.paths = notes;
      draft.deck.splice(indexToMark, 1);

      // If we removed a card before the current deck position, shift deckPos.
      if (indexToMark < draft.deckPos) {
        draft.deckPos -= 1;
      }

      // Keep deckPos in bounds after mutation.
      if (draft.deck.length > 0) {
        draft.deckPos = Math.min(draft.deckPos, draft.deck.length - 1);
      } else {
        draft.deckPos = 0;
      }
    });
  }

  // Explore
  function explore(selectedCardIndex: number) {
    const selectedCard = game.deck[selectedCardIndex];

    // Can't explore
    if (
      !selectedCard ||
      !selectedCard.faceUp ||
      !isNumberRank(selectedCard.rank)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setSelectedCardIndex(undefined);

    setGame((draft) => {
      const selectedDraftCard = draft.deck[selectedCardIndex];
      if (!selectedDraftCard || !selectedDraftCard.faceUp) return;
      if (!isNumberRank(selectedDraftCard.rank)) return;

      const movedBy = rankValue(selectedDraftCard, 1, 0);
      const deckPos = (draft.deckPos + movedBy) % draft.deck.length;
      const numLoops = draft.numLoops + (deckPos < draft.deckPos ? 1 : 0);

      draft.deckPos = deckPos;
      draft.numLoops = numLoops;

      const newTopCard = draft.deck[deckPos];

      if (newTopCard.faceUp && isFace(newTopCard)) {
        // Lose condition: landed directly on face card
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = "You landed on a trap!";
        return;
      } else if (newTopCard.faceUp && isJoker(newTopCard)) {
        // Win condition: found all aces and landed on joker (exit)
        if (draft.acesPile.length === 4) {
          draft.ended = true;
          draft.won = true;
          draft.winLoseMessage = "You got all four jewels and found the exit!";
          return;
        } else {
          // Landed on joker without all aces does nothing
          return;
        }
      } else if (
        newTopCard.faceUp &&
        (isAce(newTopCard) || isNumberRank(newTopCard.rank))
      ) {
        // Remove top card from deck and move it to the scorePile
        if (newTopCard.rank === "A") {
          draft.deck.splice(deckPos, 1);
          draft.acesPile.push(newTopCard);
        } else {
          draft.deck.splice(deckPos, 1);
          draft.trinketsPile.push(newTopCard);
        }

        return;
      }
    });
  }

  function returnToSelectedMarkedPath() {
    if (selectedPath !== undefined && selectedPath.card) {
      const insertAt = game.deckPos;

      setSelectedPath(undefined);

      saveUndoState(structuredClone(game));

      setSelectedCardIndex(undefined);

      setGame((draft) => {
        // Remove cards from notes
        const notes: MarkedPaths = [...draft.paths];
        notes[selectedPath.index] = null;

        // Insert path card in deck
        const deck = [...draft.deck];
        deck.splice(draft.deckPos, 0, selectedPath.card);

        draft.deck = deck;
        draft.paths = notes;
      });

      // Select the newly inserted card after state update.
      setSelectedCardIndex(insertAt);
    }
  }

  // Need to check for stuck lose conditions whenever game state updates
  useEffect(() => {
    // Lose condition: no marked paths, and first two cards are not number cards
    if (game.deck.length === 0) return;

    const firstCard = game.deck[game.deckPos];
    const secondCard = game.deck[(game.deckPos + 1) % game.deck.length];

    if (
      game.paths.filter((p) => p !== null).length === 0 &&
      firstCard.faceUp &&
      !isNumberRank(firstCard.rank) &&
      !isNumberRank(secondCard.rank)
    ) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage =
          draft.acesPile.length + draft.trinketsPile.length > 0
            ? "You got lost in the dungeon with no way out! You die with your loot."
            : "You got lost in the dungeon with no way out!";
      });
    }
  }, [game]);

  const canMarkPath = useMemo(() => {
    const selectedCard =
      selectedCardIndex !== undefined
        ? game.deck[selectedCardIndex]
        : undefined;

    return (
      selectedCard !== undefined &&
      isNumberRank(selectedCard.rank) &&
      selectedCard.faceUp &&
      game.paths.filter((p) => p !== null).length < maxMarkedPaths
    );
  }, [selectedCardIndex, game.paths, game.deck]);

  const { isRendered: renderMarkPathButtons, opacity: markPathOpacity } =
    useFade(canMarkPath, 200);

  // ========== Card Mapping ========== //
  const positioning = {
    horizontalPadding: 0,
    colWidth: 8,
    rad: 3.6,
    translateOnSelect: 0.2,
    firstCardAngleIncrease: 10,
    secondCardAngleIncrease: 2,
    gapAngle: 45,
    loopOffset: 75,
  };

  const zones: MapZone[] = useMemo(() => {
    const deckLength = game.deck.length;
    const eachCardAngle =
      deckLength > 0 ? (360 - positioning.gapAngle) / deckLength : 0;

    // ---------- Loop Cards ---------- //
    const loopZones: MapZone[] = game.deck.map((pos, i) => {
      // Style
      const isSelected = selectedCardIndex === i;

      const isExploreTarget = !!(
        deckLength > 0 &&
        selectedRevealedRank !== undefined &&
        selectedCardIndex !== undefined &&
        i === (game.deckPos + selectedRevealedRank) % deckLength
      );

      let rad = positioning.rad;

      if (isSelected || isExploreTarget) {
        rad -= positioning.translateOnSelect;
      }

      let baseZIndex = 100 - i;
      let angle = (i - game.deckPos) * eachCardAngle + positioning.loopOffset;

      if (i < game.deckPos) {
        angle -= positioning.gapAngle;
        baseZIndex -= deckLength + i;
      }

      const nextDeckPos = (game.deckPos + 1) % deckLength;

      if (i === game.deckPos) {
        angle -= positioning.firstCardAngleIncrease;
      } else if (i === nextDeckPos) {
        angle -= positioning.secondCardAngleIncrease;
      }

      const rotation = angle - 90;
      const angleRadians = angle * (Math.PI / 180);

      const col = rad * Math.cos(angleRadians) + positioning.colWidth / 2 - 0.5;
      const row =
        rad * Math.sin(angleRadians) * cardDims.aspectRatio + rad / 2 + 0.25;

      return {
        id: `loop-${i}`,
        pileIndex: i,
        cards: game.deck[i] ? [game.deck[i]] : undefined,
        name: "loop",
        col,
        row,
        baseZIndex,
        rotation,
      };
    });

    // ---------- Paths ---------- //
    const dims = {
      colOffset: 1.25,
      colStart: 2.25,
      acesRow: 1.3,
    };

    const pathZones: MapZone[] = Array.from({ length: 3 }, (_, i) => {
      const path = game.paths[i];

      return {
        id: `path-${i}`,
        pileIndex: i,
        cards: path === null ? undefined : [path],
        name: "path",
        col: i * dims.colOffset + dims.colStart,
        row: dims.acesRow + dims.colOffset,
        baseZIndex: 2,
        placeholder: {},
      };
    });

    return [
      ...loopZones,
      ...pathZones,
      {
        id: "aces",
        name: "aces",
        col: dims.colStart + infoSize.leftRight,
        row: dims.acesRow,
        cards: game.acesPile,
        placeholder: {
          infoPos: "left",
          text: "Jewels",
        },
        fan: {},
      },
      {
        id: "trinkets",
        name: "trinkets",
        col: 2 * dims.colOffset + dims.colStart - infoSize.leftRight,
        row: dims.acesRow,
        cards: game.trinketsPile,
        placeholder: { infoPos: "right", text: "Trinkets" },
        fan: { maxVisible: 3 },
      },
      {
        id: "dealDeck",
        name: "dealDeck",
        col: dims.colOffset + dims.colStart,
        row: dims.acesRow + 1,
        cards: game.dealDeck,
      },
      {
        id: "buttons",
        col: 0.4,
        row: 6.2,
        height: 0.8,
        width: positioning.colWidth - 0.8,
      },
    ];
  }, [game, selectedCardIndex, selectedPath, selectedRevealedRank]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "loop") {
      // ---------- Loop cards ---------- //
      const index = mappedCard.pileIndex;
      const card = mappedCard.card;

      if (index === undefined || card === undefined)
        return orbitingLoopAnimation;

      const deckLength = game.deck.length;
      if (deckLength === 0) return orbitingLoopAnimation;

      const nextDeckPos = (game.deckPos + 1) % deckLength;
      const isSelected = selectedCardIndex === index;
      const isLookAround = index === game.deckPos && !card.faceUp;
      const isExploreTarget = !!(
        deckLength > 0 &&
        selectedRevealedRank !== undefined &&
        selectedCardIndex !== undefined &&
        index === (game.deckPos + selectedRevealedRank) % deckLength
      );
      const isPotentialPathTarget = !!(
        deckLength > 0 &&
        selectedPath?.card !== undefined &&
        selectedPath?.card !== null &&
        selectedPath?.index !== undefined &&
        index === (rankValue(selectedPath.card) + game.deckPos - 1) % deckLength
      );

      const selectedColor = () => {
        if (isLookAround) {
          return "blue";
        } else if (index === selectedCardIndex) {
          return isNumberRank(card.rank) ? "blue" : "red";
        } else if (isExploreTarget) {
          return "purple";
        } else if (isPotentialPathTarget) {
          return "green";
        }
        return "blue";
      };

      return {
        ...orbitingLoopAnimation,
        onPress: () => {
          // Ignore cards that are not the first two
          if (index !== game.deckPos && index !== nextDeckPos) {
            return undefined;
          }

          if (!card.faceUp) {
            if (index === game.deckPos) {
              return lookAround;
            }
            return undefined;
          }

          // Unselect path
          if (selectedPath !== undefined) {
            setSelectedPath(undefined);
          }

          setSelectedCardIndex(selectedCardIndex === index ? undefined : index);
        },
        isSelected,
        selectColor: selectedColor(),
        forceSelectColor: isExploreTarget || isPotentialPathTarget,
        forceOverlayColor:
          isExploreTarget || isPotentialPathTarget || isLookAround,
      };
    } else if (mappedCard.zoneName === "path") {
      // ---------- Marked paths ---------- //
      const index = mappedCard.pileIndex;

      if (index === undefined) return {};

      const noteCard = game.paths[index];
      const isSelected = selectedPath?.index === index;

      return {
        selectColor: "green",
        isSelected,
        onPress: () => {
          if (!noteCard) {
            setSelectedPath(undefined);
            return;
          }

          setSelectedCardIndex(undefined);
          setSelectedPath(
            selectedPath?.index === index
              ? undefined
              : { card: noteCard as PlayingCard, index },
          );
        },
      };
    }
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0,
    cardMapper,
    cardSize: "small",
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0.6,
    fixedCols: positioning.colWidth,
  });

  const selectedDeckCard =
    selectedCardIndex !== undefined ? game.deck[selectedCardIndex] : undefined;

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={game.acesPile.length + game.trinketsPile.length}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {renderMarkPathButtons &&
        [0, 1, 2].map((pathIndex) => (
          <Animated.View
            key={`mark-path-${pathIndex}`}
            style={[
              getZoneStylesById(`path-${pathIndex}`),
              {
                opacity: markPathOpacity,
                zIndex: game.paths[pathIndex] ? 0 : 20,
              },
            ]}
          >
            <Button
              text="Mark Path"
              size="xs"
              textOnly
              onPress={() => {
                if (selectedCardIndex !== undefined) {
                  const selectedCard = game.deck[selectedCardIndex];
                  if (selectedCard) {
                    markPath(selectedCard.id, pathIndex);
                  }
                }
              }}
              disabled={selectedCardIndex === undefined}
              style={[flexStyles.fullWidth, flexStyles.fullHeight]}
              theme={"green"}
              textStyle={{ fontFamily: FontWeight[600] }}
              lineHeight={1.1}
            />
          </Animated.View>
        ))}

      {/* ----- Buttons ----- */}
      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("buttons"),
          {
            gap: cardWidth * scaleByLayout(0.25),
          },
        ]}
      >
        <Button
          text="Explore"
          onPress={() => {
            if (selectedCardIndex !== undefined) {
              explore(selectedCardIndex);
            }
          }}
          disabled={
            selectedDeckCard === undefined ||
            !isNumberRank(selectedDeckCard.rank) ||
            !selectedDeckCard.faceUp
          }
          style={[flexStyles.flex1]}
          theme={"purple"}
          taller
        />

        <Button
          text="Return to Path"
          onPress={returnToSelectedMarkedPath}
          disabled={selectedPath === undefined}
          style={[flexStyles.flex1]}
          theme={"green"}
          taller
          lineHeight={1.1}
        />

        <Button
          text="Look Around"
          onPress={lookAround}
          disabled={
            game.ended ||
            game.deck.length === 0 ||
            game.deck[game.deckPos].faceUp
          }
          style={[flexStyles.flex1]}
          theme={"blue"}
          taller
          lineHeight={1.1}
        />
      </View>
    </GameWrapper>
  );
}
