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
  flipToFace,
  RANK_VALUE,
  shuffle,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { cardTarget, makeHint } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Gambit: a trick-taking duel against a rival whose hand, and habits, are in
// plain sight. Both hands are dealt face up and the rival plays by fixed
// rules, so each deal is a puzzle: take as many tricks as the deal allows
// (its contract), three deals in a row.

type Seat = "player" | "rival";

/**
 * play: the player plays next (a lead, or a reply to the rival's lead).
 * rival: the rival plays next. resolve: both cards are down.
 * made: the contract is made. redeal: the cards are gathered for the next
 * deal. dealing: the first deal is on its way. over: the game has ended.
 */
type Phase =
  | "play"
  | "rival"
  | "resolve"
  | "made"
  | "redeal"
  | "dealing"
  | "over";

type GameState = {
  stock: PlayingCard[];
  trump: PlayingCard | null;
  hand: PlayingCard[];
  rival: PlayingCard[];
  playerCard: PlayingCard | null;
  rivalCard: PlayingCard | null;
  leader: Seat;
  playerTricks: PlayingCard[];
  rivalTricks: PlayingCard[];
  /** Which of the three deals this is, from 0. */
  deal: number;
  /** Tricks to take this deal: the most the deal allows. */
  contract: number;
  phase: Phase;
  won: boolean;
};

export type GambitGameState = GameState;

/** Cards each, in the opening, the middlegame and the endgame. */
const DEAL_SIZES = [6, 8, 10];
const DEAL_ATTEMPTS = 300;
const RIVAL_DELAY = 550;
const RESOLVE_DELAY = 750;
const MADE_DELAY = 900;
const REDEAL_DELAY = 600;

const BOARD_WIDTH = 7;

// —— Card values ——————————————————————————————————————————————

/** Ace high. */
function value(card: PlayingCard) {
  return card.rank === "A" ? 14 : RANK_VALUE[card.rank];
}

/** Between equal ranks, ♣ is lowest, then ♦, ♥ and ♠. */
const SUIT_ORDER: CardSuit[] = ["clubs", "diamonds", "hearts", "spades"];

/** Orders every card: by rank, then by suit. */
function strength(card: PlayingCard) {
  return value(card) * 4 + SUIT_ORDER.indexOf(card.suit);
}

function lowest(cards: PlayingCard[]) {
  return cards.reduce((low, card) =>
    strength(card) < strength(low) ? card : low,
  );
}

function highest(cards: PlayingCard[]) {
  return cards.reduce((high, card) =>
    strength(card) > strength(high) ? card : high,
  );
}

/** Whether `card`, played after `lead`, takes the trick. */
function beats(card: PlayingCard, lead: PlayingCard, trump: CardSuit) {
  if (card.suit === lead.suit) return value(card) > value(lead);
  return card.suit === trump;
}

/** The cards that may answer `lead`: its suit if you have it, else any. */
function legalReplies(hand: PlayingCard[], lead: PlayingCard | null) {
  if (!lead) return hand;
  const following = hand.filter((card) => card.suit === lead.suit);
  return following.length > 0 ? following : hand;
}

// —— The rival's habits ———————————————————————————————————————

/** The rival leads its highest card that isn't a trump (a trump if that's all). */
function rivalLead(hand: PlayingCard[], trump: CardSuit) {
  const plain = hand.filter((card) => card.suit !== trump);
  return highest(plain.length > 0 ? plain : hand);
}

/** The rival answers with its lowest card that wins, else its lowest card. */
function rivalReply(hand: PlayingCard[], lead: PlayingCard, trump: CardSuit) {
  const legal = legalReplies(hand, lead);
  const winners = legal.filter((card) => beats(card, lead, trump));
  return lowest(winners.length > 0 ? winners : legal);
}

// —— Solving a deal ———————————————————————————————————————————

const cardKey = (card: PlayingCard) => `${card.suit[0]}${value(card)}`;

/**
 * The most tricks the player can still take, with `leader` to lead and the
 * rival playing by its habits. Positions repeat a lot, so they're memoized.
 */
function maxTricks(
  hand: PlayingCard[],
  rival: PlayingCard[],
  leader: Seat,
  trump: CardSuit,
  memo = new Map<string, number>(),
): number {
  if (hand.length === 0) return 0;
  const key = `${hand.map(cardKey).sort().join()}|${rival.map(cardKey).sort().join()}|${leader}`;
  const known = memo.get(key);
  if (known !== undefined) return known;

  let best = 0;
  if (leader === "player") {
    for (const card of hand) {
      const reply = rivalReply(rival, card, trump);
      const taken = !beats(reply, card, trump);
      const total =
        (taken ? 1 : 0) +
        maxTricks(
          hand.filter((other) => other !== card),
          rival.filter((other) => other !== reply),
          taken ? "player" : "rival",
          trump,
          memo,
        );
      best = Math.max(best, total);
    }
  } else {
    const lead = rivalLead(rival, trump);
    for (const card of legalReplies(hand, lead)) {
      const taken = beats(card, lead, trump);
      const total =
        (taken ? 1 : 0) +
        maxTricks(
          hand.filter((other) => other !== card),
          rival.filter((other) => other !== lead),
          taken ? "player" : "rival",
          trump,
          memo,
        );
      best = Math.max(best, total);
    }
  }
  memo.set(key, best);
  return best;
}

/** Tricks taken by always leading high, or always low, and winning cheaply. */
function naiveTricks(
  start: PlayingCard[],
  startRival: PlayingCard[],
  trump: CardSuit,
  leadHigh: boolean,
) {
  let hand = start;
  let rival = startRival;
  let leader: Seat = "player";
  let taken = 0;
  while (hand.length > 0) {
    let mine: PlayingCard;
    let theirs: PlayingCard;
    let won: boolean;
    if (leader === "player") {
      mine = leadHigh ? highest(hand) : lowest(hand);
      theirs = rivalReply(rival, mine, trump);
      won = !beats(theirs, mine, trump);
    } else {
      theirs = rivalLead(rival, trump);
      const legal = legalReplies(hand, theirs);
      const winners = legal.filter((card) => beats(card, theirs, trump));
      mine = lowest(winners.length > 0 ? winners : legal);
      won = beats(mine, theirs, trump);
    }
    hand = hand.filter((card) => card !== mine);
    rival = rival.filter((card) => card !== theirs);
    if (won) taken += 1;
    leader = won ? "player" : "rival";
  }
  return taken;
}

type Deal = {
  hand: PlayingCard[];
  rival: PlayingCard[];
  trump: PlayingCard;
  rest: PlayingCard[];
  contract: number;
};

/**
 * Deals `size` cards each, and turns the next card up for trumps. A deal is
 * kept when its contract is at least half the tricks and playing it the
 * obvious way (always high, or always low) falls short: there's a trick to
 * every deal.
 */
function findDeal(
  cards: PlayingCard[],
  size: number,
  random: () => number = Math.random,
): Deal {
  let fallback: Deal | null = null;
  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
    const deck = shuffle(cards, random);
    const hand = deck.slice(0, size);
    const rival = deck.slice(size, size * 2);
    const trump = deck[size * 2];
    const rest = deck.slice(size * 2 + 1);
    const contract = maxTricks(hand, rival, "player", trump.suit);
    const deal = { hand, rival, trump, rest, contract };
    fallback ??= deal;
    if (contract < Math.ceil(size / 2)) continue;
    const obvious = Math.max(
      naiveTricks(hand, rival, trump.suit, true),
      naiveTricks(hand, rival, trump.suit, false),
    );
    if (obvious < contract) return deal;
  }
  return fallback!;
}

/** Hands are shown grouped by suit, alternating colours, then by rank. */
const DISPLAY_SUITS: CardSuit[] = ["spades", "hearts", "clubs", "diamonds"];

function sortHand(cards: PlayingCard[]) {
  return [...cards].sort(
    (a, b) =>
      DISPLAY_SUITS.indexOf(a.suit) - DISPLAY_SUITS.indexOf(b.suit) ||
      value(a) - value(b),
  );
}

// —— Moves ————————————————————————————————————————————————————

function trickCount(pile: PlayingCard[]) {
  return pile.length / 2;
}

/** The cards the player may play now. */
function playableCards(state: GameState) {
  if (state.phase !== "play") return [];
  return legalReplies(state.hand, state.rivalCard);
}

function allCards(state: GameState) {
  return [
    ...state.stock,
    ...(state.trump ? [state.trump] : []),
    ...state.hand,
    ...state.rival,
    ...(state.playerCard ? [state.playerCard] : []),
    ...(state.rivalCard ? [state.rivalCard] : []),
    ...state.playerTricks,
    ...state.rivalTricks,
  ];
}

/** Gathers every card back into the stock, face down. */
function gather(draft: GameState) {
  draft.stock = flipAllToBack(shuffle(allCards(draft)));
  draft.trump = null;
  draft.hand = [];
  draft.rival = [];
  draft.playerCard = null;
  draft.rivalCard = null;
  draft.playerTricks = [];
  draft.rivalTricks = [];
  draft.leader = "player";
  draft.phase = "dealing";
}

function dealInto(
  draft: GameState,
  dealIndex: number,
  random: () => number = Math.random,
) {
  const deal = findDeal(draft.stock, DEAL_SIZES[dealIndex], random);
  draft.hand = sortHand(deal.hand.map(flipToFace));
  draft.rival = sortHand(deal.rival.map(flipToFace));
  draft.trump = flipToFace(deal.trump);
  draft.stock = flipAllToBack(deal.rest);
  draft.contract = deal.contract;
  draft.deal = dealIndex;
  draft.leader = "player";
  draft.phase = "play";
}

function playCard(draft: GameState, cardId: string) {
  if (draft.phase !== "play") return;
  const card = playableCards(draft).find(
    (candidate) => candidate.id === cardId,
  );
  if (!card) return;
  draft.hand = draft.hand.filter((other) => other.id !== card.id);
  draft.playerCard = card;
  draft.phase = draft.rivalCard ? "resolve" : "rival";
}

function rivalPlays(draft: GameState) {
  if (draft.phase !== "rival" || !draft.trump) return;
  const trump = draft.trump.suit;
  const card = draft.playerCard
    ? rivalReply(draft.rival, draft.playerCard, trump)
    : rivalLead(draft.rival, trump);
  draft.rival = draft.rival.filter((other) => other.id !== card.id);
  draft.rivalCard = card;
  draft.phase = draft.playerCard ? "resolve" : "play";
}

/** Who took the trick on the table. */
function trickWinner(state: GameState): Seat | null {
  const { playerCard, rivalCard, trump } = state;
  if (!playerCard || !rivalCard || !trump) return null;
  return state.leader === "player"
    ? beats(rivalCard, playerCard, trump.suit)
      ? "rival"
      : "player"
    : beats(playerCard, rivalCard, trump.suit)
      ? "player"
      : "rival";
}

function resolveTrick(draft: GameState) {
  if (draft.phase !== "resolve") return;
  const winner = trickWinner(draft);
  if (!winner || !draft.playerCard || !draft.rivalCard) return;
  const pile = winner === "player" ? draft.playerTricks : draft.rivalTricks;
  pile.push(...flipAllToBack([draft.rivalCard, draft.playerCard]));
  draft.playerCard = null;
  draft.rivalCard = null;
  draft.leader = winner;

  const taken = trickCount(draft.playerTricks);
  if (taken >= draft.contract) {
    if (draft.deal >= DEAL_SIZES.length - 1) {
      draft.won = true;
      draft.phase = "over";
    } else {
      draft.phase = "made";
    }
  } else if (taken + draft.hand.length < draft.contract) {
    draft.phase = "over";
  } else {
    draft.phase = winner === "player" ? "play" : "rival";
  }
}

// —— Hints ————————————————————————————————————————————————————

/** The card that keeps the most tricks in reach (the lowest, of equals). */
function bestCard(state: GameState) {
  const options = playableCards(state);
  if (options.length === 0 || !state.trump) return null;
  const trump = state.trump.suit;
  const memo = new Map<string, number>();
  let best: PlayingCard | null = null;
  let bestTotal = -1;
  for (const card of [...options].sort((a, b) => strength(a) - strength(b))) {
    const hand = state.hand.filter((other) => other !== card);
    let total: number;
    if (state.rivalCard) {
      const taken = beats(card, state.rivalCard, trump);
      total =
        (taken ? 1 : 0) +
        maxTricks(hand, state.rival, taken ? "player" : "rival", trump, memo);
    } else {
      const reply = rivalReply(state.rival, card, trump);
      const taken = !beats(reply, card, trump);
      total =
        (taken ? 1 : 0) +
        maxTricks(
          hand,
          state.rival.filter((other) => other !== reply),
          taken ? "player" : "rival",
          trump,
          memo,
        );
    }
    if (total > bestTotal) {
      bestTotal = total;
      best = card;
    }
  }
  return best;
}

function findGambitHint(state: GameState) {
  const card = bestCard(state);
  return card ? makeHint("tapCard", cardTarget(card)) : null;
}

export const gambitRules = {
  DEAL_SIZES,
  value,
  beats,
  legalReplies,
  rivalLead,
  rivalReply,
  maxTricks,
  naiveTricks,
  findDeal,
  dealInto,
  gather,
  playCard,
  rivalPlays,
  resolveTrick,
  trickWinner,
  bestCard,
  findHint: findGambitHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  stock: createDeck(),
  trump: null,
  hand: [],
  rival: [],
  playerCard: null,
  rivalCard: null,
  leader: "player",
  playerTricks: [],
  rivalTricks: [],
  deal: 0,
  contract: 0,
  phase: "dealing",
  won: false,
};

export default function Gambit() {
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
    saveUndoState,
    clearUndoHistory,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame((draft) => dealInto(draft, 0));
    },
  });

  const ended = game.phase === "over";

  useHint(() => findGambitHint(game), {
    game,
    enabled: !isSettingUp && game.phase === "play",
  });

  // The rival plays, tricks are taken and deals follow on their own.
  useEffect(() => {
    if (isSettingUp) return;
    if (game.phase === "rival") {
      const timer = setTimeout(() => setGame(rivalPlays), RIVAL_DELAY);
      return () => clearTimeout(timer);
    }
    if (game.phase === "resolve") {
      const timer = setTimeout(() => setGame(resolveTrick), RESOLVE_DELAY);
      return () => clearTimeout(timer);
    }
    if (game.phase === "made") {
      const timer = setTimeout(() => {
        // The next deal shows new cards: there's no undoing back past it.
        clearUndoHistory();
        setGame((draft) => {
          gather(draft);
          draft.phase = "redeal";
        });
      }, MADE_DELAY);
      return () => clearTimeout(timer);
    }
    if (game.phase === "redeal") {
      const timer = setTimeout(
        () => setGame((draft) => dealInto(draft, draft.deal + 1)),
        REDEAL_DELAY,
      );
      return () => clearTimeout(timer);
    }
  }, [game, isSettingUp, setGame, clearUndoHistory]);

  function onHandPress(cardId: string) {
    if (game.phase !== "play") return;
    if (!playableCards(game).some((card) => card.id === cardId)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => playCard(draft, cardId));
  }

  const playable = useMemo(
    () => new Set(playableCards(game).map((card) => card.id)),
    [game],
  );
  const winner = game.phase === "resolve" ? trickWinner(game) : null;

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "rival",
        name: "rival",
        cards: game.rival,
        col: 0,
        row: 0,
        width: BOARD_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.rival.length, BOARD_WIDTH, 0.3, 1.05),
          center: true,
        },
      },
      {
        id: "rivalTricks",
        name: "rivalTricks",
        cards: game.rivalTricks,
        col: 0,
        row: 1.25,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:gambit.rival"),
          showCount: false,
          infoPos: "right",
        },
      },
      {
        id: "rivalCard",
        name: "rivalCard",
        cards: game.rivalCard ? [game.rivalCard] : [],
        col: 3,
        row: 1.25,
        baseZIndex: 30,
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 6,
        row: 1.25,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      {
        id: "playerTricks",
        name: "playerTricks",
        cards: game.playerTricks,
        col: 0,
        row: 2.45,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:gambit.you"),
          showCount: false,
          infoPos: "right",
        },
      },
      {
        id: "playerCard",
        name: "playerCard",
        cards: game.playerCard ? [game.playerCard] : [],
        col: 3,
        row: 2.45,
        baseZIndex: 30,
      },
      {
        id: "trump",
        name: "trump",
        cards: game.trump ? [game.trump] : [],
        col: 6,
        row: 2.45,
        baseZIndex: 10,
        placeholder: {
          text: i18n.t("games:gambit.trump"),
          infoPos: "left",
          showCount: false,
        },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: 3.7,
        width: BOARD_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, BOARD_WIDTH, 0.3, 1.05),
          center: true,
        },
      },
      {
        id: "hud",
        col: 0,
        row: 4.85,
        width: BOARD_WIDTH,
        height: 0.8,
      },
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    if (mappedCard.zoneName === "hand") {
      const canPlay = playable.has(id);
      return {
        onPress: () => onHandPress(id),
        isDisabled: !canPlay,
        // While you follow suit, the cards you can't play are greyed out.
        ...(game.phase === "play" && !canPlay
          ? { selectColor: "grey", forceOverlayColor: true }
          : {}),
      };
    }
    if (mappedCard.zoneName === "rivalCard" && winner) {
      return {
        isSelected: winner === "rival",
        selectColor: winner === "rival" ? "red" : "none",
      };
    }
    if (mappedCard.zoneName === "playerCard" && winner) {
      return {
        isSelected: winner === "player",
        selectColor: winner === "player" ? "green" : "none",
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

  const taken = trickCount(game.playerTricks);
  const lostMessage = i18n.t("games:gambit.contractLost");

  return (
    <GameWrapper
      outcome={!ended ? "playing" : game.won ? "won" : "lost"}
      winLoseMessage={
        ended
          ? game.won
            ? i18n.t("games:gambit.allContractsMade")
            : lostMessage
          : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        <View style={[flexStyles.colStart, { flexShrink: 0 }]}>
          <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
            {i18n.t("games:gambit.dealOf", {
              deal: game.deal + 1,
              total: DEAL_SIZES.length,
            })}
          </Text>
          <Text size="md" weight={500} color={colorPale}>
            {i18n.t("games:gambit.contract", { count: game.contract })}
          </Text>
        </View>
        <ProgressBar
          progressValue={taken}
          totalValue={Math.max(game.contract, 1)}
          scaledHeight={cardHeight * 0.22}
          color="green"
          style={{ flex: 1 }}
          labelText={i18n.t("games:gambit.tricks")}
          tallyText={`${taken}/${game.contract}`}
        />
      </View>
    </GameWrapper>
  );
}
