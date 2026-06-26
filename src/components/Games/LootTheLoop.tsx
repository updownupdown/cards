import { useFade } from "@/hooks/useFade";
import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo, useState } from "react";
import { Animated, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardDims,
  CardSuit,
  createDeck,
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
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useImmer } from "use-immer";
import { infoSize } from "../Cards/CardMapBackgrounds";

const maxMarkedPaths = 3;
const exploreTransitionInMs = 1200;

export type LoopRank = PlayingCard["rank"] | "Joker";

type LoopCard = {
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
  deckPos: number;
  paths: MarkedPaths;
  acesPile: LoopCard[];
  trinketsPile: LoopCard[];
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
  numLoops: number;
};

type GameSnapshot = {
  game: GameState;
};

function isBadStartCard(card: LoopCard) {
  return isJoker(card) || isAce(card) || isFace(card);
}

function setup(): GameState {
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

  return {
    deck,
    deckPos: 0,
    paths: [null, null, null],
    acesPile: [],
    trinketsPile: [],
    ended: false,
    won: false,
    numLoops: 0,
  };
}

export default function LootTheLoop() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useImmer<GameState>(setup);
  const [selectedCardIndex, setSelectedCardIndex] = useState<
    number | undefined
  >(undefined);

  const [selectedPath, setSelectedPath] = useState<Note | undefined>(undefined);
  const [selectedRevealedRank, setSelectedRevealedRank] = useState<
    number | undefined
  >(undefined);
  const noHopAnimation: AnimatedCardMapping = {
    arcConfig: { enabled: false, magnitudeY: 0 },
  };
  const orbitingLoopAnimation: AnimatedCardMapping = {
    ...noHopAnimation,
    orbitConfig: { enabled: true },
  };

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setSelectedPath(undefined);
      setSelectedCardIndex(undefined);
      setGame(previousState.game);
    }
  };

  useEffect(() => {
    const selectedRevealedIsNumber = !!(
      selectedCardIndex !== undefined &&
      game.deck[selectedCardIndex].faceUp &&
      isNumberRank(game.deck[selectedCardIndex].rank)
    );

    setSelectedRevealedRank(
      selectedRevealedIsNumber
        ? RANK_VALUE[game.deck[selectedCardIndex].rank]
        : undefined,
    );
  }, [selectedCardIndex]);

  function reset() {
    clearHistory();
    setSelectedCardIndex(undefined);
    setSelectedPath(undefined);
    setSelectedRevealedRank(undefined);
    setGame(setup());
  }

  // Look around
  function lookAround() {
    saveUndoState(structuredClone({ game }));

    setGame((draft) => {
      // Turn two cards up in current and next position
      const index0 = draft.deckPos;
      const index1 = (draft.deckPos + 1) % draft.deck.length;

      draft.deck[index0] = { ...draft.deck[index0], faceUp: true };
      draft.deck[index1] = { ...draft.deck[index1], faceUp: true };
    });

    setSelectedCardIndex(game.deckPos);
  }

  // Mark path
  async function markPath(selectedCardIndex: number, noteIndex: number) {
    const pathToMark = game.deck[selectedCardIndex];
    if (
      game.paths.filter((p) => p !== null).length >= maxMarkedPaths ||
      game.paths[noteIndex] !== null ||
      !pathToMark.faceUp ||
      !isNumberRank(pathToMark.rank)
    ) {
      return;
    }

    saveUndoState(structuredClone({ game }));

    setSelectedCardIndex(undefined);

    setGame((draft) => {
      const notes: MarkedPaths = [...draft.paths];
      notes[noteIndex] = pathToMark;

      draft.paths = notes;
      draft.deck = [...draft.deck.toSpliced(selectedCardIndex, 1)];
    });
  }

  const [isExploring, setIsExploring] = useState(false);

  useEffect(() => {
    if (isExploring && selectedCardIndex !== undefined) {
      explore(selectedCardIndex);
    }
  }, [isExploring]);

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

    saveUndoState(structuredClone({ game }));

    setSelectedCardIndex(undefined);

    setGame((draft) => {
      const movedBy = rankValue(selectedCard, 1, 0);
      const deckPos = (draft.deckPos + movedBy) % draft.deck.length;
      const numLoops = draft.numLoops + (deckPos < draft.deckPos ? 1 : 0);

      draft.deckPos = deckPos;
      draft.numLoops = numLoops;

      const newTopCard = draft.deck[deckPos];

      if (newTopCard.faceUp && isFace(newTopCard)) {
        // Lose due to landing on face card
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = "You landed on a trap!";
        return;
      } else if (newTopCard.faceUp && isJoker(newTopCard)) {
        // Win by having all aces and landing on joker/exit
        if (draft.acesPile.length === 4) {
          draft.ended = true;
          draft.won = true;
          draft.winLoseMessage = "You got all four jewels and found the exit!";
          return;
        } else {
          // Landing on joker without all aces does nothing
          return;
        }
      } else if (
        newTopCard.faceUp &&
        (isAce(newTopCard) || isNumberRank(newTopCard.rank))
      ) {
        // Add newTopCard to scorePile, and remove from deck
        let acePile = [...draft.acesPile];
        let trinketsPile = [...draft.trinketsPile];
        let deck = [...draft.deck];

        if (newTopCard.rank === "A") {
          acePile = [...acePile, newTopCard];
          deck = deck.toSpliced(deckPos, 1);
        } else {
          trinketsPile = [...trinketsPile, newTopCard];
          deck = deck.toSpliced(deckPos, 1);
        }

        if (deck.length === 0) {
          draft.deck = deck;
          draft.acesPile = acePile;
          draft.trinketsPile = trinketsPile;
          draft.ended = true;
          draft.won = false;
          draft.winLoseMessage = "You somehow... ran out of cards?!";
          return;
        }

        draft.deck = deck;
        draft.acesPile = acePile;
        draft.trinketsPile = trinketsPile;
        return;
      }
    });

    setTimeout(() => {
      setIsExploring(false);
    }, exploreTransitionInMs);
  }

  function returnToSelectedMarkedPath() {
    if (selectedPath !== undefined) {
      setSelectedPath(undefined);

      saveUndoState(structuredClone({ game }));

      setSelectedCardIndex(undefined);

      setGame((draft) => {
        // Remove cards from notes
        const notes: MarkedPaths = [...draft.paths];
        notes[selectedPath.index] = null;

        // Insert path card in deck
        const deck = draft.deck.toSpliced(draft.deckPos, 0, selectedPath.card);

        // Selected newly inserted card
        setSelectedCardIndex(draft.deckPos);

        draft.deck = deck;
        draft.paths = notes;
      });
    }
  }

  const canMarkPath = useMemo(() => {
    return (
      selectedCardIndex !== undefined &&
      isNumberRank(game.deck[selectedCardIndex].rank) &&
      game.deck[selectedCardIndex].faceUp &&
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
    const eachCardAngle = (360 - positioning.gapAngle) / deckLength;

    // ---------- Loop Cards ---------- //
    const loopZones: MapZone[] = game.deck.map((pos, i) => {
      // Style
      const isSelected = selectedCardIndex === i;

      const isExploreTarget = !!(
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

      if (i === game.deckPos) {
        angle -= positioning.firstCardAngleIncrease;
      } else if (i === game.deckPos + 1) {
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
        arcConfig: { enabled: false, magnitudeY: 0 },
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
        id: "button",
        col: 0,
        row: 6.2,
        height: 0.8,
        width: "full",
      },
    ];
  }, [game, selectedCardIndex, selectedPath, selectedRevealedRank]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "path") {
      const index = zone.pileIndex;

      if (index === undefined) return {};

      return {
        selectColor: canMarkPath ? "green" : "none",
        onPress: () => {
          if (selectedCardIndex !== undefined) {
            markPath(selectedCardIndex, index);
          }
        },
      };
    }
  };

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
      const isSelected = selectedCardIndex === index;
      const isLookAround = index === game.deckPos && !card.faceUp;
      const isExploreTarget = !!(
        selectedRevealedRank !== undefined &&
        selectedCardIndex !== undefined &&
        index === (game.deckPos + selectedRevealedRank) % deckLength
      );
      const isPotentialPathTarget = !!(
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
          if (index !== game.deckPos && index !== game.deckPos + 1) {
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
        ...noHopAnimation,
        selectColor: "green",
        isSelected,
        onPress: () => {
          setSelectedCardIndex(undefined);
          setSelectedPath(
            selectedPath?.index === index
              ? undefined
              : { card: noteCard as PlayingCard, index },
          );
        },
      };
    }

    return noHopAnimation;
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    // visualizer: true,
    paddingLeft: 0,
    paddingRight: 0,
    fixedCols: positioning.colWidth,
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      handleUndo={handleUndo}
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
              onPress={() => {
                if (selectedCardIndex !== undefined) {
                  markPath(selectedCardIndex, pathIndex);
                }
              }}
              disabled={selectedCardIndex === undefined}
              style={[flexStyles.fullWidth, flexStyles.fullHeight]}
              theme={"green"}
              cardWidth={cardWidth}
              size="small"
            />
          </Animated.View>
        ))}

      <View
        style={[
          flexStyles.colCentered,
          flexStyles.fullWidth,
          flexStyles.gap20,
          flexStyles.flex1,
        ]}
      >
        {/* Ghost "return to marked path" card */}
        {/* <CardButton
            onPress={returnToSelectedMarkedPath}
            card={selectedNote?.card}
            selectColor="green"
            forceOverlayColor
            style={[
              {
                pointerEvents: selectedNote !== undefined ? undefined : "none",
                opacity: selectedNote !== undefined ? 0.5 : 0,
                position: "absolute",
                zIndex: 200,
                transform: [
                  {
                    rotate:
                      selectedNote !== undefined
                        ? `${firstCardAngleIncrease * -2.5}deg`
                        : `${firstCardAngleIncrease * -3.5}deg`,
                  },
                  { translateY: contentRadius },
                ],
              },
            ]}
          /> */}

        {/* ----- Buttons ----- */}
        <View
          style={[
            flexStyles.rowCentered,
            getZoneStylesById("button"),
            {
              gap: cardWidth * 0.25,
            },
          ]}
        >
          <Button
            text="Explore"
            onPress={() => {
              if (selectedCardIndex !== undefined) {
                setIsExploring(true);
              }
            }}
            disabled={
              selectedCardIndex === undefined ||
              !isNumberRank(game.deck[selectedCardIndex].rank) ||
              !game.deck[selectedCardIndex].faceUp
            }
            style={[flexStyles.flex1, { height: "100%" }]}
            theme={"purple"}
            cardWidth={cardWidth}
          />

          <Button
            text="Return to Path"
            onPress={returnToSelectedMarkedPath}
            disabled={selectedPath === undefined}
            style={[flexStyles.flex1, { height: "100%" }]}
            theme={"green"}
            cardWidth={cardWidth}
          />

          <Button
            text="Look Around"
            onPress={lookAround}
            disabled={
              game.ended ||
              game.deck.length === 0 ||
              game.deck[game.deckPos].faceUp
            }
            style={[flexStyles.flex1, { height: "100%" }]}
            theme={"blue"}
            cardWidth={cardWidth}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
