import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const routeLength = 15;
const holdCount = 3;

type GameState = {
  route: PlayingCard[];
  holds: (PlayingCard | null)[];
  gear: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  route: [],
  holds: Array.from({ length: holdCount }, () => null),
  gear: shuffle(createDeck()),
  discard: [],
  ended: false,
  won: false,
};

/** A grip overcomes a pitch by matching suit or with an equal-or-higher rank (Aces high). */
function canClear(hold: PlayingCard | null, pitch?: PlayingCard) {
  if (!hold || !pitch) return false;
  if (hold.suit === pitch.suit) return true;
  return rankValue(hold, 14) >= rankValue(pitch, 14);
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.route,
      ...draft.holds.filter((card): card is PlayingCard => card !== null),
      ...draft.gear,
      ...draft.discard,
    ];

    draft.gear = shuffle(allCards);
    draft.route = [];
    draft.holds = Array.from({ length: holdCount }, () => null);
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const deck = [...draft.gear];

    // Deal the route face down, then expose the first pitch.
    const route: PlayingCard[] = [];
    for (let i = 0; i < routeLength; i += 1) {
      const card = deck.pop();
      if (card) route.push(flipToBack(card));
    }
    if (route.length > 0) {
      route[route.length - 1] = flipToFace(route[route.length - 1]);
    }

    // Deal the starting grips.
    const holds: (PlayingCard | null)[] = Array.from(
      { length: holdCount },
      () => {
        const card = deck.pop();
        return card ? flipToFace(card) : null;
      },
    );

    draft.route = route;
    draft.holds = holds;
    draft.gear = deck;
  });
}

function drawGrip(draft: GameState): PlayingCard | null {
  const card = draft.gear.pop();
  return card ? flipToFace(card) : null;
}

function exposeTopPitch(draft: GameState) {
  if (draft.route.length > 0) {
    draft.route[draft.route.length - 1] = flipToFace(
      draft.route[draft.route.length - 1],
    );
  }
}

function evaluateEnd(state: GameState) {
  if (state.route.length === 0) return { ended: true, won: true };

  const pitch = top(state.route);
  const anyHoldClears = state.holds.some((hold) => canClear(hold, pitch));
  if (anyHoldClears) return { ended: false, won: false };

  // Stuck: can only recover by swapping in fresh gear.
  if (state.gear.length === 0) return { ended: true, won: false };
  return { ended: false, won: false };
}

// ========== Main Component ========== //
export default function Ascent() {
  const { cardText } = useGameZoneBackground();

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game]);

  const pitch = top(game.route);
  const clearedCount = routeLength - game.route.length;

  function playHold(holdIndex: number) {
    if (game.ended) return;
    const hold = game.holds[holdIndex];
    if (!hold) return;

    const currentPitch = top(game.route);

    if (canClear(hold, currentPitch)) {
      // Overcome the pitch: spend the grip, expose the next pitch, refill.
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const usedHold = draft.holds[holdIndex];
        const clearedPitch = draft.route.pop();
        if (clearedPitch) draft.discard.push(clearedPitch);
        if (usedHold) draft.discard.push(usedHold);
        draft.holds[holdIndex] = drawGrip(draft);
        exposeTopPitch(draft);
      });
      return;
    }

    // Swap a grip that can't help — costs a card of gear.
    if (game.gear.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const swapped = draft.holds[holdIndex];
      if (swapped) draft.discard.push(swapped);
      draft.holds[holdIndex] = drawGrip(draft);
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const holdPositions = getGridColRows({
      cols: holdCount,
      rows: 1,
      rowOffset: 2.5,
    });

    const holdZones: MapZone[] = holdPositions.map((pos, i) => ({
      id: `hold-${i}`,
      name: "hold",
      pileIndex: i,
      cards: game.holds[i] ? [game.holds[i] as PlayingCard] : [],
      col: pos.c,
      row: pos.r,
      baseZIndex: 5,
      placeholder: { text: "Grip", hideBackground: false },
    }));

    return [
      {
        id: "hud",
        col: 0,
        row: 0,
        width: "full",
        height: 0.55,
      },
      {
        id: "route",
        name: "route",
        cards: game.route,
        col: 0.7,
        row: 0.85,
        fan: { maxVisible: 3, direction: "up", offset: 0.14 },
        baseZIndex: 20,
        placeholder: { text: "Route", infoPos: "left" },
      },
      {
        id: "gear",
        name: "gear",
        cards: game.gear,
        col: 2.3,
        row: 0.85,
        fan: { maxVisible: 3 },
        baseZIndex: 20,
        placeholder: { text: "Gear", infoPos: "right", showCount: true },
      },
      ...holdZones,
      {
        id: "footer",
        col: 0,
        row: 3.7,
        width: "full",
        height: 0.5,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "hold" || mappedCard.pileIndex === undefined) {
      return {};
    }

    const holdIndex = mappedCard.pileIndex;
    const hold = game.holds[holdIndex];
    const clears = canClear(hold, pitch);
    const canSwap = game.gear.length > 0;

    return {
      isDisabled: game.ended || (!clears && !canSwap),
      selectColor: clears ? "green" : "none",
      onPress: () => playHold(holdIndex),
    };
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={clearedCount}
      winLoseMessage={
        game.won ? "Summit reached!" : "You ran out of holds and fell."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("hud"), { justifyContent: "center" }]}>
        <Text size="lg" weight={600} color={cardText}>
          Altitude {clearedCount} / {routeLength}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("footer"),
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text size="sm" weight={400} color={cardText}>
          {pitch
            ? "Tap a grip: green clears the pitch, others swap for fresh gear."
            : ""}
        </Text>
      </View>
    </GameWrapper>
  );
}
