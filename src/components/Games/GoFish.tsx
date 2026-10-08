import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  flipToFace,
  RANK_VALUE,
  shuffle,
  zoneFanOffset,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { cardTarget, makeHint } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Go Fish against a rival whose hand is hidden. Ask for a rank you hold by
// tapping one of its cards: the rival hands over every card of that rank,
// or you go fishing in the pond. Four of a rank is a book. The rival
// remembers what you ask for, so what you ask for gives you away.

type Seat = "player" | "rival";

/**
 * ask: the player asks next. rival: the rival asks next. dealing: the deal
 * is on its way. over: every book is made.
 */
type Phase = "ask" | "rival" | "dealing" | "over";

/** What happened last, for the line under the board. */
type Event =
  | { kind: "got"; who: Seat; rank: CardRank; count: number }
  | { kind: "fished"; who: Seat; rank: CardRank; lucky: boolean }
  | { kind: "passed"; who: Seat };

type GameState = {
  stock: PlayingCard[];
  hand: PlayingCard[];
  rival: PlayingCard[];
  /** Books laid down, four cards each. */
  playerBooks: PlayingCard[];
  rivalBooks: PlayingCard[];
  /** Ranks the rival knows you hold: what you've asked for. */
  known: CardRank[];
  last: Event | null;
  phase: Phase;
};

export type GoFishGameState = GameState;

const HAND_SIZE = 7;
const BOOK_SIZE = 4;
const BOOKS = 13;
const BOOKS_TO_WIN = 7;
const RIVAL_DELAY = 900;
const BOARD_WIDTH = 7;

function value(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

function sortHand(cards: PlayingCard[]) {
  return [...cards].sort((a, b) => value(a) - value(b));
}

function ofRank(cards: PlayingCard[], rank: CardRank) {
  return cards.filter((card) => card.rank === rank);
}

/** How many of each rank a hand holds. */
function counts(cards: PlayingCard[]) {
  const result = new Map<CardRank, number>();
  for (const card of cards)
    result.set(card.rank, (result.get(card.rank) ?? 0) + 1);
  return result;
}

// —— The rival's habits ———————————————————————————————————————

/**
 * The rival asks for a rank it holds that it knows you hold (one you've
 * asked for). Otherwise, the rank it holds most of. Of equals, the lowest.
 */
function rivalAsk(rival: PlayingCard[], known: CardRank[]): CardRank | null {
  if (rival.length === 0) return null;
  const held = counts(rival);
  const ranks = [...held.keys()].sort((a, b) => RANK_VALUE[a] - RANK_VALUE[b]);
  const remembered = ranks.filter((rank) => known.includes(rank));
  if (remembered.length > 0) return remembered[0];
  return ranks.reduce((best, rank) =>
    held.get(rank)! > held.get(best)! ? rank : best,
  );
}

// —— Moves ————————————————————————————————————————————————————

function allCards(state: GameState) {
  return [
    ...state.stock,
    ...state.hand,
    ...state.rival,
    ...state.playerBooks,
    ...state.rivalBooks,
  ];
}

function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.hand = [];
  draft.rival = [];
  draft.playerBooks = [];
  draft.rivalBooks = [];
  draft.known = [];
  draft.last = null;
  draft.phase = "dealing";
}

function deal(draft: GameState) {
  draft.hand = sortHand(flipAllToFace(draft.stock.splice(0, HAND_SIZE)));
  draft.rival = flipAllToBack(draft.stock.splice(0, HAND_SIZE));
  layBooks(draft);
  draft.phase = "ask";
}

/** Lays down any four of a rank, from either hand. */
function layBooks(draft: GameState) {
  for (const seat of ["player", "rival"] as Seat[]) {
    const hand = seat === "player" ? draft.hand : draft.rival;
    for (const [rank, count] of counts(hand)) {
      if (count < BOOK_SIZE) continue;
      const book = flipAllToFace(ofRank(hand, rank));
      const rest = hand.filter((card) => card.rank !== rank);
      if (seat === "player") {
        draft.hand = rest;
        draft.playerBooks.push(...book);
      } else {
        draft.rival = rest;
        draft.rivalBooks.push(...book);
      }
      draft.known = draft.known.filter((other) => other !== rank);
    }
  }
  if (
    draft.playerBooks.length + draft.rivalBooks.length ===
    BOOKS * BOOK_SIZE
  ) {
    draft.phase = "over";
  }
}

/** Draws a card into a hand. Returns it, or null when the pond is empty. */
function fish(draft: GameState, seat: Seat) {
  const drawn = draft.stock.shift();
  if (!drawn) return null;
  if (seat === "player")
    draft.hand = sortHand([...draft.hand, flipToFace(drawn)]);
  else draft.rival = [...draft.rival, drawn];
  return drawn;
}

/** An empty hand draws a card before asking; with the pond empty, it passes. */
function refill(draft: GameState, seat: Seat) {
  const hand = seat === "player" ? draft.hand : draft.rival;
  if (hand.length > 0) return true;
  if (fish(draft, seat)) return true;
  draft.last = { kind: "passed", who: seat };
  draft.phase = seat === "player" ? "rival" : "ask";
  return false;
}

function ask(draft: GameState, seat: Seat, rank: CardRank) {
  const other = seat === "player" ? draft.rival : draft.hand;
  const taken = ofRank(other, rank);
  if (seat === "player" && !draft.known.includes(rank)) draft.known.push(rank);
  if (taken.length > 0) {
    const rest = other.filter((card) => card.rank !== rank);
    if (seat === "player") {
      draft.rival = rest;
      draft.hand = sortHand([...draft.hand, ...flipAllToFace(taken)]);
    } else {
      draft.hand = rest;
      draft.rival = [...draft.rival, ...flipAllToBack(taken)];
      // You've given them all away: the rival has nothing to remember.
      draft.known = draft.known.filter((known) => known !== rank);
    }
    draft.last = { kind: "got", who: seat, rank, count: taken.length };
    layBooks(draft);
    if (draft.phase !== "over") refill(draft, seat);
    return;
  }
  if (seat === "rival") {
    draft.known = draft.known.filter((known) => known !== rank);
  }
  const drawn = fish(draft, seat);
  const lucky = drawn?.rank === rank;
  draft.last = { kind: "fished", who: seat, rank, lucky };
  layBooks(draft);
  if (draft.phase === "over") return;
  if (lucky) {
    refill(draft, seat);
  } else {
    draft.phase = seat === "player" ? "rival" : "ask";
    refill(draft, seat === "player" ? "rival" : "player");
  }
}

function playerAsks(draft: GameState, rank: CardRank) {
  if (draft.phase !== "ask") return;
  if (ofRank(draft.hand, rank).length === 0) return;
  ask(draft, "player", rank);
}

/** On your turn with an empty hand, you draw first, or pass with the pond empty. */
function playerRefills(draft: GameState) {
  if (draft.phase !== "ask" || draft.hand.length > 0) return;
  refill(draft, "player");
}

function rivalAsks(draft: GameState) {
  if (draft.phase !== "rival") return;
  const rank = rivalAsk(draft.rival, draft.known);
  if (!rank) {
    refill(draft, "rival");
    return;
  }
  ask(draft, "rival", rank);
}

function bookCount(cards: PlayingCard[]) {
  return cards.length / BOOK_SIZE;
}

// —— Hints ————————————————————————————————————————————————————

/**
 * Asks for a rank the rival asked for and you still hold, since the rival
 * must hold it too; otherwise, the rank you hold most of.
 */
function bestRank(state: GameState): CardRank | null {
  if (state.phase !== "ask" || state.hand.length === 0) return null;
  const held = counts(state.hand);
  const ranks = [...held.keys()];
  if (
    state.last?.kind === "fished" &&
    state.last.who === "rival" &&
    held.has(state.last.rank)
  ) {
    return state.last.rank;
  }
  return ranks.reduce((best, rank) =>
    held.get(rank)! > held.get(best)! ||
    (held.get(rank) === held.get(best) && RANK_VALUE[rank] < RANK_VALUE[best])
      ? rank
      : best,
  );
}

function findGoFishHint(state: GameState) {
  const rank = bestRank(state);
  const card = rank ? ofRank(state.hand, rank)[0] : null;
  return card ? makeHint("tapCard", cardTarget(card)) : null;
}

export const goFishRules = {
  HAND_SIZE,
  BOOK_SIZE,
  BOOKS_TO_WIN,
  counts,
  rivalAsk,
  gather,
  deal,
  layBooks,
  playerAsks,
  playerRefills,
  rivalAsks,
  bookCount,
  bestRank,
  findHint: findGoFishHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  hand: [],
  rival: [],
  playerBooks: [],
  rivalBooks: [],
  known: [],
  last: null,
  phase: "dealing",
};

function eventText(event: Event | null) {
  if (!event) return i18n.t("games:gofish.yourTurn");
  const you = event.who === "player";
  switch (event.kind) {
    case "got":
      return i18n.t(you ? "games:gofish.youGot" : "games:gofish.rivalGot", {
        rank: event.rank,
        count: event.count,
      });
    case "fished":
      if (event.lucky) {
        return i18n.t(
          you ? "games:gofish.youFishedIt" : "games:gofish.rivalFishedIt",
          { rank: event.rank },
        );
      }
      return i18n.t(
        you ? "games:gofish.youFished" : "games:gofish.rivalFished",
        {
          rank: event.rank,
        },
      );
    case "passed":
      return i18n.t(
        you ? "games:gofish.youPassed" : "games:gofish.rivalPassed",
      );
  }
}

export default function GoFish() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    clearUndoHistory,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame(deal);
    },
  });

  const ended = game.phase === "over";

  useHint(() => findGoFishHint(game), {
    game,
    enabled: !isSettingUp && game.phase === "ask",
  });

  // The rival asks on its own, and an empty hand draws before asking.
  useEffect(() => {
    if (isSettingUp) return;
    if (game.phase === "rival") {
      const timer = setTimeout(() => setGame(rivalAsks), RIVAL_DELAY);
      return () => clearTimeout(timer);
    }
    if (game.phase === "ask" && game.hand.length === 0) {
      const timer = setTimeout(() => setGame(playerRefills), RIVAL_DELAY);
      return () => clearTimeout(timer);
    }
  }, [game, isSettingUp, setGame]);

  function onHandPress(cardId: string) {
    if (game.phase !== "ask") return;
    const card = game.hand.find((other) => other.id === cardId);
    if (!card) return;
    // What the rival holds, and what you fish up, is unknown until you ask:
    // there's no undoing an ask.
    clearUndoHistory();
    setGame((draft) => playerAsks(draft, card.rank));
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "rivalBooks",
        name: "rivalBooks",
        cards: game.rivalBooks,
        col: 0,
        row: 0,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:gofish.rival"),
          showCount: false,
          infoPos: "right",
        },
      },
      {
        id: "rival",
        name: "rival",
        cards: game.rival,
        col: 1.3,
        row: 0,
        width: 4.4,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.rival.length, 4.4, 0.22, 0.6),
          center: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 6,
        row: 0,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("games:gofish.pond"), infoPos: "left" },
      },
      {
        id: "message",
        col: 0,
        row: 1.2,
        width: BOARD_WIDTH,
        height: 0.6,
      },
      {
        id: "playerBooks",
        name: "playerBooks",
        cards: game.playerBooks,
        col: 0,
        row: 1.95,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:gofish.you"),
          showCount: false,
          infoPos: "right",
        },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 1.3,
        row: 1.95,
        width: 5.7,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, 5.7, 0.24, 1.05),
          center: true,
        },
      },
      {
        id: "hud",
        col: 0,
        row: 3.15,
        width: BOARD_WIDTH,
        height: 0.7,
      },
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    if (mappedCard.zoneName === "hand") {
      return {
        onPress: () => onHandPress(id),
        isDisabled: game.phase !== "ask",
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0.05,
  });

  const mine = bookCount(game.playerBooks);
  const theirs = bookCount(game.rivalBooks);
  const won = ended && mine > theirs;

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      score={won ? mine : 0}
      winLoseMessage={
        ended
          ? i18n.t(won ? "games:gofish.won" : "games:gofish.lost", {
              you: mine,
              rival: theirs,
            })
          : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("message"), flexStyles.colCentered]}>
        <Text
          size="sm"
          weight={400}
          color={colorPale}
          style={{ textAlign: "center" }}
        >
          {eventText(game.last)}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        <ProgressBar
          progressValue={mine}
          totalValue={BOOKS_TO_WIN}
          scaledHeight={cardHeight * 0.2}
          color="green"
          style={{ flex: 1 }}
          labelText={i18n.t("games:gofish.books")}
          tallyText={`${mine}/${BOOKS_TO_WIN}`}
        />
        <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
          {i18n.t("games:gofish.rivalBooks", { count: theirs })}
        </Text>
      </View>
    </GameWrapper>
  );
}
