import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "@/components/Cards/CardMap";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import {
  AnimatedCardMapping,
  CardMapBGMapping,
  defaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipTopCardToFace,
  isFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
function getColRow(index: number) {
  let row: number[] = [];
  let col: number[] = [];

  for (let i = 0; i < 16; i++) {
    if (Math.floor(i / 4) === Math.floor(index / 4) && i !== index) {
      row.push(i);
    }
    if (i % 4 === index % 4 && i !== index) {
      col.push(i);
    }
  }

  return { row, col };
}

export type GameState = {
  draw: PlayingCard[];
  piles: PlayingCard[][];
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

export type GameSnapshot = {
  game: GameState;
};

const gameStateInitial: GameState = {
  draw: shuffle(createDeck().filter((c) => !isFace(c))),
  piles: Array(16).fill([]),
  ended: false,
  won: false,
  winLoseMessage: "",
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [...draft.draw, ...draft.piles.flat()];

    draft.draw = flipAllToBack(allCards);
    draft.piles = Array(16).fill([]);
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
  });

  await delay();

  setGame((draft) => {
    const draw = shuffle(draft.draw);
    draft.draw = draw;
  });

  await delay();

  setGame((draft) => {
    draft.draw = flipTopCardToFace(draft.draw);
  });

  await delay();
}

function numFaceDownTopCards(piles: PlayingCard[][]) {
  return piles.filter((p) => p.length && !top(p)?.faceUp).length;
}

function hasAllFaceUp(piles: PlayingCard[][]) {
  if (piles.length !== 16) return false;
  return piles.every((p) => p.length && top(p)?.faceUp);
}

function getAdjacentPiles(piles: PlayingCard[][]) {
  const isEmptyBoard = piles.every((pile) => pile.length === 0);

  if (isEmptyBoard) {
    return Array.from({ length: 16 }, (_, i) => i);
  }

  const legalIndices = new Set<number>();

  for (let i = 0; i < 16; i++) {
    if (piles[i].length > 0) {
      // Can place on a pile that already has cards
      legalIndices.add(i);

      // Can place on adjacent (horizontally or vertically) piles
      const row = Math.floor(i / 4);
      const col = i % 4;

      if (row > 0) legalIndices.add(i - 4);
      if (row < 3) legalIndices.add(i + 4);
      if (col > 0) legalIndices.add(i - 1);
      if (col < 3) legalIndices.add(i + 1);
    }
  }

  return Array.from(legalIndices).sort((a, b) => a - b);
}

function isMinOrMax(line: PlayingCard[], card: PlayingCard) {
  const cardValue = rankValue(card);
  const lowest = line.reduce(
    (min, current) =>
      current.faceUp && rankValue(current) < min ? rankValue(current) : min,
    Infinity,
  );
  const highest = line.reduce(
    (max, current) =>
      current.faceUp && rankValue(current) > max ? rankValue(current) : max,
    0,
  );

  return cardValue < lowest || cardValue > highest;
}

function flipTop(pile: PlayingCard[]) {
  if (pile.length === 0) return pile;

  const copy = [...pile];
  const topCard = copy[copy.length - 1];
  copy[copy.length - 1] = { ...topCard, faceUp: !topCard.faceUp };
  return copy;
}

function applyFlips(
  piles: PlayingCard[][],
  index: number,
  lastPlayedCard: PlayingCard,
): { newPiles: PlayingCard[][]; flippedIndices: number[] } {
  const { col, row } = getColRow(index);

  function applyFlip(currentPiles: PlayingCard[][], line: number[]) {
    const lineCards = line.flatMap((lineIndex) => {
      const topCard = top(currentPiles[lineIndex]);
      return topCard ? [topCard] : [];
    });
    const flippedInLine: number[] = [];
    const updatedPiles = [...currentPiles];

    if (lineCards.length && isMinOrMax(lineCards, lastPlayedCard)) {
      line.forEach((lineIndex) => {
        updatedPiles[lineIndex] = flipTop(updatedPiles[lineIndex]);
        flippedInLine.push(lineIndex);
      });
    }

    return { updatedPiles, flippedInLine };
  }

  const colResult = applyFlip(piles, col);
  const rowResult = applyFlip(colResult.updatedPiles, row);

  return {
    newPiles: rowResult.updatedPiles,
    flippedIndices: Array.from(
      new Set([...colResult.flippedInLine, ...rowResult.flippedInLine]),
    ),
  };
}

function legalPlacements(
  piles: PlayingCard[][],
  drawCard: PlayingCard | undefined,
) {
  if (drawCard === undefined) return [];

  const legalPiles: number[] = [];
  const adjacentPiles = getAdjacentPiles(piles);

  // The card is played face up, though the stock may not have turned it yet.
  const played = { ...drawCard, faceUp: true };
  for (let i = 0; i < 16; i++) {
    const simulatedPiles = [...piles];
    simulatedPiles[i] = [...simulatedPiles[i], played];
    const { newPiles } = applyFlips(simulatedPiles, i, played);
    const tooManyFaceDownCards = numFaceDownTopCards(newPiles) > 4;
    const pileFull = piles[i].length >= 4;
    const isInAdjacentPile = adjacentPiles.includes(i);

    if (!pileFull && !tooManyFaceDownCards && isInAdjacentPile) {
      legalPiles.push(i);
    }
  }

  return legalPiles;
}

/** The piles once the card is placed, as placeAt leaves them. */
function placeCard(piles: PlayingCard[][], index: number, card: PlayingCard) {
  const next = [...piles];
  next[index] = [
    ...piles[index].map((entry, position) =>
      position === piles[index].length - 1
        ? { ...entry, faceUp: false }
        : entry,
    ),
    { ...card, faceUp: true },
  ];
  return applyFlips(next, index, next[index][next[index].length - 1]).newPiles;
}

/** Piles showing a face, then fewer turned down, then more piles started. */
function gridWorth(piles: PlayingCard[][]) {
  if (hasAllFaceUp(piles)) return 1e6;
  const started = piles.filter((pile) => pile.length > 0).length;
  const faceDown = numFaceDownTopCards(piles);
  return 10 * (started - faceDown) - 6 * faceDown + 3 * started;
}

/**
 * The hint: the pile for the stock card that does best now and, over the
 * cards that could come next, after the best place for that one too.
 */
function findCityGridHint(state: GameState) {
  const card = top(state.draw);
  if (state.ended || !card?.faceUp) return null;
  const upcoming = state.draw.slice(0, -1);
  let best: { index: number; worth: number } | null = null;
  for (const index of legalPlacements(state.piles, card)) {
    const piles = placeCard(state.piles, index, card);
    let worth = gridWorth(piles);
    if (worth < 1e6 && upcoming.length > 0) {
      let next = 0;
      for (const following of upcoming) {
        const options = legalPlacements(piles, following);
        next +=
          options.length === 0
            ? -1000
            : Math.max(
                ...options.map((option) =>
                  gridWorth(placeCard(piles, option, following)),
                ),
              );
      }
      worth += next / upcoming.length;
    }
    if (!best || worth > best.worth) best = { index, worth };
  }
  return best
    ? makeHint("moveCard", cardTarget(card), zoneTarget(`pile-${best.index}`))
    : null;
}

export const cityGridRules = {
  getColRow,
  numFaceDownTopCards,
  hasAllFaceUp,
  getAdjacentPiles,
  isMinOrMax,
  flipTop,
  applyFlips,
  legalPlacements,
  findHint: findCityGridHint,
};

export default function CityGrid() {
  const showToast = useToast();

  const [showLegalPlacements, setShowLegalPlacements] = useState(false);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setShowLegalPlacements(false);
      },
    });

  // ====================================
  // PLACE CARD ON A PILE
  // ====================================
  async function placeAt(index: number) {
    if (!legal.includes(index)) return;

    // Save state for undo
    saveUndoState(structuredClone(game));

    // Move draw card to selected pile
    const drawCard = top(game.draw);

    const draw = [...game.draw];
    draw.pop();

    const piles = [...game.piles];
    let targetPile = [...piles[index]];

    // Flip top of target pile face down
    const pileTop = top(targetPile);
    if (targetPile.length && pileTop) {
      targetPile = targetPile.slice(0, -1);
      targetPile.push({ ...pileTop, faceUp: false });
    }

    // Add new card to pile
    if (drawCard) {
      targetPile.push(drawCard);
    }

    piles[index] = targetPile;

    // Prepare to update game
    const intermediateGame = { ...game, piles, draw };

    // Update game
    setGame(intermediateGame);

    await delay(defaultAnimDuration / 2);

    // Flip cards in piles logic
    const topCardAtTargetPile = top(intermediateGame.piles[index]);
    let finalPiles = [...intermediateGame.piles];

    if (topCardAtTargetPile) {
      const flipResult = applyFlips(
        [...intermediateGame.piles],
        index,
        topCardAtTargetPile,
      );

      finalPiles = flipResult.newPiles;
    }

    const finalGame = { ...intermediateGame, piles: finalPiles };

    setGame(finalGame);

    await delay(defaultAnimDuration / 2);

    // Turn over deck card if the top card is face down
    const topCard = top(finalGame.draw);

    if (topCard && !topCard.faceUp) {
      setGame((draft) => {
        draft.draw = flipTopCardToFace(draft.draw);
      });
    }
  }

  useHint(() => findCityGridHint(game), {
    game,
    enabled: !game.ended,
  });

  const legal = useMemo(
    () => legalPlacements(game.piles, top(game.draw)),
    [game.piles],
  );

  // Win/lose conditions
  useEffect(() => {
    if (game.draw.length === 40) return;

    // Win condition
    if (hasAllFaceUp(game.piles)) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = true;
        draft.winLoseMessage = i18n.t("cards:youWon");
      });
    } else if (game.draw.length === 0) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = i18n.t("games:cityGrid.youRanOutOfCards");
      });
    } else if (legal.length === 0) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = i18n.t("games:cityGrid.youRanOutOfPlacements");
      });
    }
  }, [legal, game.draw]);

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const pileZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 4,
      colOffset: 0,
      rowOffset: 1.25,
    }).map((pos, i) => ({
      id: `pile-${i}`,
      pileIndex: i,
      cards: game.piles[i],
      name: "pile",
      col: pos.c,
      row: pos.r,
      baseZIndex: 10,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    return [
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 1.5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      ...pileZones,
    ];
  }, [game]);

  function handOnPress(isLegal: boolean, pileIndex: number) {
    if (!isLegal) {
      if (game.piles[pileIndex!].length >= 4) {
        showToast(i18n.t("games:cityGrid.pileIsFull"));
      } else {
        const validAdjacentPiles = getAdjacentPiles(game.piles);
        if (!validAdjacentPiles.includes(pileIndex!)) {
          showToast(i18n.t("games:cityGrid.mustPlaceOnExistingOr"));
        } else {
          showToast(i18n.t("games:cityGrid.placingHereWouldResultIn"));
        }
      }

      setShowLegalPlacements(true);
    } else {
      setShowLegalPlacements(false);
      placeAt(pileIndex!);
    }
  }

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "pile" && zone.pileIndex !== undefined) {
      const isLegal = legal.includes(zone.pileIndex);

      return {
        selectColor: showLegalPlacements
          ? isLegal
            ? Colors.cardSelectGreen
            : Colors.cardSelectRed
          : "none",
        onPress: () => handOnPress(isLegal, zone.pileIndex!),
      };
    }
    return {};
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "pile" && mappedCard.pileIndex !== undefined) {
      const isLegal = legal.includes(mappedCard.pileIndex);
      const selectColor = showLegalPlacements
        ? isLegal
          ? Colors.cardSelectGreen
          : Colors.cardSelectRed
        : "none";

      return {
        selectColor,
        forceOverlayColor: showLegalPlacements && mappedCard.topOfZone,
        onPress: () => handOnPress(isLegal, mappedCard.pileIndex!),
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "regular",
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.draw.length * (game.won ? 1 : -1)}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
