import { useStateManager } from "@/hooks/useStateManager";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
const MAX_REDEALS = 2;
type Selection = { zone: "reserve"; index: number } | { zone: "waste" } | null;

export type SultanGameState = {
  center: PlayingCard;
  foundations: PlayingCard[][];
  reserve: (PlayingCard | null)[];
  stock: PlayingCard[];
  waste: PlayingCard[];
  redealsUsed: number;
  ended: boolean;
  won: boolean;
};

function canBuildFoundation(card: PlayingCard, destination?: PlayingCard) {
  if (!destination || card.suit !== destination.suit) return false;
  if (destination.rank === "K") return card.rank === "A";
  return rankValue(card) === rankValue(destination) + 1;
}

function removeCard(
  deck: PlayingCard[],
  predicate: (card: PlayingCard) => boolean,
) {
  const index = deck.findIndex(predicate);
  const [card] = deck.splice(index, 1);
  if (!card) throw new Error("Sultan setup card is missing");
  return flipToFace(card);
}

function createInitialState(): SultanGameState {
  const deck = shuffle(createDeck({ deckCount: 2 }));
  const center = removeCard(
    deck,
    (card) => card.suit === "hearts" && card.rank === "K",
  );
  const foundations: PlayingCard[][] = [];
  while (foundations.length < 7) {
    foundations.push([removeCard(deck, (card) => card.rank === "K")]);
  }
  foundations.push([
    removeCard(deck, (card) => card.suit === "hearts" && card.rank === "A"),
  ]);
  const reserve = deck.splice(0, 8).map(flipToFace);
  return {
    center,
    foundations,
    reserve,
    stock: deck.map(flipToBack),
    waste: [],
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

/**
 * The board with every card gathered face down into the stock, except the
 * King of Hearts in the centre, which never moves.
 */
function gatherState(state: SultanGameState): SultanGameState {
  return {
    center: { ...state.center },
    foundations: state.foundations.map(() => []),
    reserve: state.reserve.map(() => null),
    stock: shuffle(
      flipAllToBack(collectCards({ ...state, center: undefined })),
    ),
    waste: [],
    redealsUsed: 0,
    ended: false,
    won: false,
  };
}

/** A fresh deal played with the gathered cards, the centre King kept. */
function redealState(state: SultanGameState): SultanGameState {
  const { center, ...dealt } = createInitialState();
  return {
    ...redealWith(dealt, state.stock),
    center: { ...center, id: state.center.id },
  };
}

function getSelectedCard(state: SultanGameState, selected: Selection) {
  if (!selected) return undefined;
  return selected.zone === "waste"
    ? top(state.waste)
    : (state.reserve[selected.index] ?? undefined);
}

function getFoundationTarget(state: SultanGameState, card: PlayingCard) {
  const index = state.foundations.findIndex((pile) =>
    canBuildFoundation(card, top(pile)),
  );
  return index < 0 ? null : index;
}

function hasMove(state: SultanGameState) {
  if (
    state.stock.length > 0 ||
    (state.waste.length > 0 && state.redealsUsed < MAX_REDEALS)
  )
    return true;
  const cards = [
    ...(top(state.waste) ? [top(state.waste)!] : []),
    ...state.reserve.filter((card): card is PlayingCard => card !== null),
  ];
  return cards.some((card) => getFoundationTarget(state, card) !== null);
}

/**
 * Reserve cards go home first (their gaps refill, bringing more cards into
 * play), then the waste's; draw, or redeal, when none can.
 */
function findSultanHint(state: SultanGameState) {
  const playable = [...state.reserve, top(state.waste)].find(
    (card) => card && getFoundationTarget(state, card) !== null,
  );
  if (playable) {
    return makeHint(
      "toFoundation",
      cardTarget(playable),
      zoneTarget(`foundation-${getFoundationTarget(state, playable)}`),
    );
  }
  if (state.stock.length > 0) return makeHint("draw", zoneTarget("stock"));
  return state.waste.length > 0 && state.redealsUsed < MAX_REDEALS
    ? makeHint("redeal", zoneTarget("stock"))
    : null;
}

export const sultanRules = {
  findHint: findSultanHint,
  canBuildFoundation,
  createInitialState,
  getFoundationTarget,
  hasMove,
};

export default function Sultan() {
  const [selected, setSelected] = useState<Selection>(null);
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
  } = useStateManager<SultanGameState>({
    // Starts with every card in the stock, to be dealt out from there.
    gameStateInitial: gatherState(createInitialState()),
    resetNonGameStates: () => {
      setSelected(null);
      setLastTap(null);
    },
    resetAndSetup: async () => {
      // Gather every card into the stock, then deal them back out.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealState(draft));
    },
  });

  useHint(() => findSultanHint(game), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  useEffect(() => {
    const won = game.foundations.every((pile) => top(pile)?.rank === "Q");
    const ended = won || !hasMove(game);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [game, setGame]);

  const selectedCard = getSelectedCard(game, selected);

  function moveToFoundation(index: number, source: Selection = selected) {
    const sourceCard = getSelectedCard(game, source);
    if (
      !source ||
      !sourceCard ||
      !canBuildFoundation(sourceCard, top(game.foundations[index]))
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let card: PlayingCard | undefined;
      if (source.zone === "waste") card = draft.waste.pop();
      else {
        card = draft.reserve[source.index] ?? undefined;
        const replacement = draft.waste.pop() ?? draft.stock.pop();
        draft.reserve[source.index] = replacement
          ? flipToFace(replacement)
          : null;
      }
      if (card) draft.foundations[index].push(card);
    });
    setSelected(null);
    return true;
  }

  function selectSource(next: Exclude<Selection, null>) {
    if (game.ended) return;
    const card = getSelectedCard(game, next);
    if (!card) return;
    if (
      selected?.zone === next.zone &&
      (selected.zone === "waste" ||
        (next.zone === "reserve" && selected.index === next.index))
    )
      return setSelected(null);
    setSelected(next);
  }

  function onSourcePress(next: Exclude<Selection, null>) {
    if (game.ended || !getSelectedCard(game, next)) return;
    const key = next.zone === "waste" ? "waste" : `reserve-${next.index}`;
    const now = Date.now();
    if (lastTap?.key === key && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      const target = getFoundationTarget(game, getSelectedCard(game, next)!);
      if (target !== null) {
        moveToFoundation(target, next);
      }
      return;
    }
    setLastTap({ key, at: now });
    selectSource(next);
  }

  function drawStock() {
    if (game.ended) return;
    if (game.stock.length === 0) {
      if (game.waste.length === 0 || game.redealsUsed >= MAX_REDEALS) return;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        draft.stock = shuffle(draft.waste.splice(0)).map(flipToBack);
        draft.redealsUsed += 1;
      });
    } else {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const card = draft.stock.pop();
        if (card) draft.waste.push(flipToFace(card));
      });
    }
    setSelected(null);
  }

  const foundationPositions = [
    [1.5, 0],
    [2.5, 0],
    [3.5, 0],
    [1.5, 1],
    [3.5, 1],
    [1.5, 2],
    [2.5, 2],
    [3.5, 2],
  ];
  const zones: MapZone[] = useMemo(
    () => [
      ...game.foundations.map(
        (pile, index) =>
          ({
            id: `foundation-${index}`,
            name: "foundation",
            pileIndex: index,
            cards: pile,
            col: foundationPositions[index][0],
            row: foundationPositions[index][1],
            fan: { maxVisible: 1 },
            placeholder: {},
          }) as MapZone,
      ),
      {
        id: "center",
        name: "center",
        cards: [game.center],
        col: 2.5,
        row: 1,
      },
      ...game.reserve.map(
        (card, index) =>
          ({
            id: `reserve-${index}`,
            name: "reserve",
            pileIndex: index,
            cards: card ? [card] : [],
            col: index < 4 ? 0 : 5,
            row: (index % 4) * 1,
            placeholder: {},
          }) as MapZone,
      ),
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 2,
        row: 3.6,
        fan: { maxVisible: 1 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: "left",
        },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 3,
        row: 3.6,
        fan: { maxVisible: 1 },
        placeholder: {
          text: i18n.t("cards:waste"),
          showCount: true,
          infoPos: "right",
        },
      },
    ],
    [game],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "center")
      return {
        forceOverlayColor: true,
        selectColor: "lightGrey",
      };
    if (card.zoneName === "stock" && card.topOfZone)
      return { onPress: drawStock };
    if (card.zoneName === "waste" && card.topOfZone)
      return {
        onPress: () => onSourcePress({ zone: "waste" }),
        isSelected: selected?.zone === "waste",
        selectColor: "blue",
      };
    if (card.zoneName === "reserve" && card.pileIndex !== undefined)
      return {
        onPress: () =>
          onSourcePress({ zone: "reserve", index: card.pileIndex! }),
        isSelected:
          selected?.zone === "reserve" && selected.index === card.pileIndex,
        selectColor: "blue",
      };
    if (card.zoneName === "foundation" && card.pileIndex !== undefined)
      return {
        onPress: () => moveToFoundation(card.pileIndex!),
        isDisabled: !selectedCard,
      };
    return {};
  };
  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") return { onPress: drawStock };
    if (zone.name === "waste")
      return {
        onPress: () => onSourcePress({ zone: "waste" }),
        isDisabled: game.waste.length === 0,
      };
    if (zone.name === "reserve" && zone.pileIndex !== undefined) {
      const reserveIndex = zone.pileIndex;
      return {
        onPress: () => onSourcePress({ zone: "reserve", index: reserveIndex }),
        isDisabled: game.reserve[reserveIndex] === null,
      };
    }
    if (zone.name === "foundation" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToFoundation(zone.pileIndex!),
        isDisabled: !selectedCard,
      };
    return {};
  };
  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0.2,
  });
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? i18n.t("games:sultan.theSultanIsSurrounded")
          : i18n.t("cards:noMovesRemain")
      }
    >
      {cardMap}
    </GameWrapper>
  );
}
