import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isRed,
  rankValue,
  redealWith,
  shuffle,
  zoneFanOffset,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";

// A push-your-luck deck builder in cards (The Quacks of Quedlinburg): each
// round, cards are flipped from your own deck into the cauldron until you stop
// or the duds boil over, and the potion's strength buys better cards.
const ROUNDS = 9;
const DUD_LIMIT = 7;
const MAX_BUYS = 2;
// Diamonds, clubs and spades have an effect, and cost this much more.
const EFFECT_SURCHARGE = 1;
const WIN_SCORE = 150;
const MARKET_SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
const STARTING_INGREDIENTS = [
  "2-hearts",
  "3-hearts",
  "4-hearts",
  "2-diamonds",
  "3-diamonds",
];

const TIERS = [
  { min: 250, key: "games:charlatan.tierMiracleWorker" },
  { min: 200, key: "games:charlatan.tierCourtAlchemist" },
  { min: WIN_SCORE, key: "games:charlatan.tierVillageHealer" },
] as const;

type Phase = "brewing" | "boiledOver" | "market" | "over";

export type CharlatanGameState = {
  /** Your own cards, face down. The last card is the top. */
  deck: PlayingCard[];
  /** This round's potion, in the order the cards went in. */
  cauldron: PlayingCard[];
  /** Cards for sale: one row per suit, in MARKET_SUITS order, lowest first. */
  market: PlayingCard[][];
  round: number;
  score: number;
  coins: number;
  /** Suits bought on this visit to the market. */
  bought: CardSuit[];
  phase: Phase;
};

// ========== Rules ========== //
/** The black A, 2 and 3 are duds. */
function isDud(card: PlayingCard) {
  return !isRed(card.suit) && rankValue(card) <= 3;
}

function dudTotal(cauldron: PlayingCard[]) {
  return cauldron.reduce(
    (sum, card) => sum + (isDud(card) ? rankValue(card) : 0),
    0,
  );
}

function strengthOf(cauldron: PlayingCard[]) {
  return cauldron.reduce(
    (sum, card) => sum + (isDud(card) ? 0 : rankValue(card)),
    0,
  );
}

/** A diamond that ends the potion counts twice. */
function diamondBonus(cauldron: PlayingCard[]) {
  const last = cauldron[cauldron.length - 1];
  return last?.suit === "diamonds" ? rankValue(last) : 0;
}

function coinsFor(strength: number) {
  return Math.ceil(strength / 2);
}

function costOf(card: PlayingCard) {
  return rankValue(card) + (card.suit === "hearts" ? 0 : EFFECT_SURCHARGE);
}

function isFinalRound(state: CharlatanGameState) {
  return state.round >= ROUNDS;
}

/** The chance that the next card from the deck boils the potion over. */
function bustChance(state: CharlatanGameState) {
  const { deck } = state;
  if (deck.length === 0) return 0;
  const room = DUD_LIMIT - dudTotal(state.cauldron);
  const busts = (card: PlayingCard) => isDud(card) && rankValue(card) > room;
  const top = deck[deck.length - 1];
  if (top.faceUp) return busts(top) ? 1 : 0;
  return deck.filter(busts).length / deck.length;
}

type DrawResult = "ingredient" | "dud" | "dudReturned" | "boiledOver";

function drawCard(state: CharlatanGameState): DrawResult | null {
  if (state.phase !== "brewing" || state.deck.length === 0) return null;
  const card = flipToFace(state.deck.pop()!);
  const previous = state.cauldron[state.cauldron.length - 1];
  state.cauldron.push(card);

  if (isDud(card)) {
    if (dudTotal(state.cauldron) <= DUD_LIMIT) return "dud";
    if (isFinalRound(state)) {
      // No market follows the last round, so the points are the only choice.
      state.score += strengthOf(state.cauldron);
      state.phase = "over";
    } else {
      state.phase = "boiledOver";
    }
    return "boiledOver";
  }

  if (card.suit === "spades" && state.deck.length > 0) {
    const top = state.deck.length - 1;
    state.deck[top] = flipToFace(state.deck[top]);
  }

  if (card.suit === "clubs" && previous && isDud(previous)) {
    state.cauldron.splice(state.cauldron.length - 2, 1);
    const at = Math.floor(Math.random() * (state.deck.length + 1));
    state.deck.splice(at, 0, flipToBack(previous));
    return "dudReturned";
  }

  return "ingredient";
}

function stopBrewing(state: CharlatanGameState) {
  if (state.phase !== "brewing" || state.cauldron.length === 0) return false;
  const strength = strengthOf(state.cauldron) + diamondBonus(state.cauldron);
  state.score += strength;
  if (isFinalRound(state)) {
    state.phase = "over";
  } else {
    state.coins = coinsFor(strength);
    state.bought = [];
    state.phase = "market";
  }
  return true;
}

/** After boiling over, keep either the potion's points or its coins. */
function keepAfterBoilOver(
  state: CharlatanGameState,
  choice: "points" | "coins",
) {
  if (state.phase !== "boiledOver") return false;
  const strength = strengthOf(state.cauldron);
  if (choice === "points") state.score += strength;
  state.coins = choice === "coins" ? coinsFor(strength) : 0;
  state.bought = [];
  state.phase = "market";
  return true;
}

function canBuy(state: CharlatanGameState, card: PlayingCard) {
  return (
    state.phase === "market" &&
    state.bought.length < MAX_BUYS &&
    !state.bought.includes(card.suit) &&
    costOf(card) <= state.coins
  );
}

function buyCard(state: CharlatanGameState, row: number, index: number) {
  const card = state.market[row]?.[index];
  if (!card || !canBuy(state, card)) return false;
  state.market[row].splice(index, 1);
  state.coins -= costOf(card);
  state.bought.push(card.suit);
  state.deck.push(flipToBack(card));
  return true;
}

/** Everything goes back into the deck; coins left over are lost. */
function startNextRound(state: CharlatanGameState) {
  if (state.phase !== "market") return false;
  state.deck = shuffle(flipAllToBack([...state.deck, ...state.cauldron]));
  state.cauldron = [];
  state.coins = 0;
  state.bought = [];
  state.round += 1;
  state.phase = "brewing";
  return true;
}

function getTier(score: number) {
  return TIERS.find((tier) => score >= tier.min);
}

// ========== Deal ========== //
function createInitialState(): CharlatanGameState {
  const cards = createDeck();
  const starts = (card: PlayingCard) =>
    isDud(card) || STARTING_INGREDIENTS.includes(`${card.rank}-${card.suit}`);
  return {
    deck: shuffle(flipAllToBack(cards.filter(starts))),
    cauldron: [],
    market: MARKET_SUITS.map((suit) =>
      cards
        .filter((card) => card.suit === suit && !starts(card))
        .map(flipToFace)
        .sort((a, b) => rankValue(a) - rankValue(b)),
    ),
    round: 1,
    score: 0,
    coins: 0,
    bought: [],
    phase: "brewing",
  };
}

function gatherState(state: CharlatanGameState): CharlatanGameState {
  return {
    ...createInitialState(),
    deck: shuffle(flipAllToBack(collectCards(state))),
    market: MARKET_SUITS.map(() => []),
  };
}

const gameStateInitial = createInitialState();

export const charlatanRules = {
  ROUNDS,
  DUD_LIMIT,
  WIN_SCORE,
  MARKET_SUITS,
  isDud,
  dudTotal,
  strengthOf,
  diamondBonus,
  coinsFor,
  costOf,
  bustChance,
  drawCard,
  stopBrewing,
  keepAfterBoilOver,
  canBuy,
  buyCard,
  startNextRound,
  createInitialState,
};

// ========== Layout ========== //
const GAP = 0.15;
const COLS = 7;
const HUD_ROW = 0;
const CAULDRON_ROW = 0.6;
const METER_ROW = CAULDRON_ROW + 1.1;
const METER_HEIGHT = 0.4;
const MARKET_ROW = METER_ROW + 0.6;
const LABEL_WIDTH = 2;
const STATUS_ROW = MARKET_ROW + MARKET_SUITS.length;
const DECK_ROW = STATUS_ROW + 0.55;
const CONTROLS_COL = 1.3;

// ========== Component ========== //
export default function Charlatan() {
  const { colorPale, colorDark } = useGameColors();
  const showToast = useToast();

  const {
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
    clearUndoHistory,
  } = useStateManager<CharlatanGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the deck, then lay out the market again.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.deck));
    },
  });

  const ended = game.phase === "over";
  const won = ended && game.score >= WIN_SCORE;
  const duds = dudTotal(game.cauldron);
  const strength = strengthOf(game.cauldron);
  const bonus = game.phase === "brewing" ? diamondBonus(game.cauldron) : 0;
  const risk = useMemo(() => bustChance(game), [game]);

  function update(change: (draft: CharlatanGameState) => void) {
    setGame(produce(game, change));
  }

  function onDraw() {
    if (game.phase !== "brewing" || game.deck.length === 0) return;
    let result: DrawResult | null = null;
    update((draft) => {
      result = drawCard(draft);
    });
    if (result === "dudReturned") {
      showToast(i18n.t("games:charlatan.dudReturned"));
    }
  }

  function onStop() {
    update((draft) => {
      stopBrewing(draft);
    });
  }

  function onKeep(choice: "points" | "coins") {
    update((draft) => {
      keepAfterBoilOver(draft, choice);
    });
  }

  function onBuy(row: number, index: number) {
    const card = game.market[row][index];
    if (!card || !canBuy(game, card)) return;
    saveUndoState(structuredClone(game));
    update((draft) => {
      buyCard(draft, row, index);
    });
  }

  function onNextRound() {
    // Purchases can't be taken back once the new round is under way.
    clearUndoHistory();
    update((draft) => {
      startNextRound(draft);
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const marketZones: MapZone[] = game.market.flatMap((cards, i) => [
      {
        id: `marketLabel-${i}`,
        col: 0,
        row: MARKET_ROW + i,
        width: LABEL_WIDTH - GAP,
        height: 1,
      },
      {
        id: `market-${i}`,
        name: "market",
        pileIndex: i,
        cards,
        col: LABEL_WIDTH,
        row: MARKET_ROW + i,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: cardDims.tableauOffsetHorizontal,
          center: false,
        },
        placeholder: { showCount: false },
      },
    ]);

    return [
      {
        id: "hudBars",
        col: 0,
        row: HUD_ROW,
        width: "full",
        height: 0.45,
      },
      {
        id: "cauldronBed",
        col: 0,
        row: CAULDRON_ROW,
        width: COLS,
        baseZIndex: 5,
        placeholder: { showCount: false },
      },
      {
        id: "cauldron",
        name: "cauldron",
        cards: game.cauldron,
        col: 0,
        row: CAULDRON_ROW,
        width: COLS,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.cauldron.length, COLS, 0.15, 0.7),
          center: false,
        },
      },
      {
        id: "meters",
        col: 0,
        row: METER_ROW,
        width: COLS,
        height: METER_HEIGHT,
      },
      ...marketZones,
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: COLS,
        height: 0.4,
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: DECK_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      {
        id: "controls",
        col: CONTROLS_COL,
        row: DECK_ROW,
        width: COLS - CONTROLS_COL,
        height: 1,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const { zoneName, pileIndex, cardIndex, card, topOfZone } = mappedCard;

    if (zoneName === "deck") {
      const canDraw = game.phase === "brewing" && topOfZone;
      return {
        onPress: canDraw ? onDraw : undefined,
        isDisabled: !canDraw,
        selectColor: canDraw ? "blue" : "none",
      };
    }

    if (zoneName === "cauldron") {
      if (isDud(card)) {
        return {
          isDisabled: true,
          selectColor: "red",
          forceOverlayColor: true,
        };
      }
      const doubled = bonus > 0 && topOfZone;
      return {
        isDisabled: true,
        selectColor: doubled ? "orange" : "none",
        forceSelectColor: doubled,
      };
    }

    if (zoneName === "market" && pileIndex !== undefined) {
      const shopping = game.phase === "market";
      const affordable = canBuy(game, card);
      return {
        onPress: affordable ? () => onBuy(pileIndex, cardIndex) : undefined,
        isDisabled: !affordable,
        selectColor: affordable ? "green" : shopping ? "grey" : "none",
        forceOverlayColor: shopping && !affordable,
      };
    }

    return { isDisabled: true };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: GAP,
    cardSize: "small",
    cardMapper,
  });

  const tier = getTier(game.score);
  const finalRound = isFinalRound(game);

  const status = (() => {
    switch (game.phase) {
      case "brewing":
        if (game.cauldron.length === 0) {
          return i18n.t("games:charlatan.statusStart");
        }
        return i18n.t(
          finalRound
            ? "games:charlatan.statusRiskFinal"
            : "games:charlatan.statusRisk",
          {
            risk: Math.round(risk * 100),
            points: strength + bonus,
            coins: coinsFor(strength + bonus),
          },
        );
      case "boiledOver":
        return i18n.t("games:charlatan.statusBoiledOver");
      case "market":
        return i18n.t("games:charlatan.statusMarket", {
          coins: game.coins,
          buys: MAX_BUYS - game.bought.length,
        });
      default:
        return null;
    }
  })();

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.score}
      hideScore
      winLoseMessage={
        won && tier
          ? i18n.t("games:charlatan.wonWithTier", {
              score: game.score,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:charlatan.lostShortOfTarget", {
              score: game.score,
              target: WIN_SCORE,
            })
      }
      canUndo={canUndo && game.phase === "market"}
      undo={undo}
    >
      {cardMap}

      {MARKET_SUITS.map((suit, i) => (
        <View
          key={`marketLabel-${suit}`}
          style={[
            pointerEventsStyles.none,
            getZoneStylesById(`marketLabel-${i}`),
            flexStyles.colCentered,
            {
              alignItems: "flex-start",
              opacity: game.bought.includes(suit) ? 0.4 : 1,
            },
          ]}
        >
          <Icon
            name={suit}
            size={cardWidth * 0.3}
            color={isRed(suit) ? Colors.suitsRed : colorPale}
          />
          <Text size="xs" weight={500} color={colorPale}>
            {i18n.t(`games:charlatan.effect_${suit}`)}
          </Text>
          <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
            {i18n.t(
              suit === "hearts"
                ? "games:charlatan.costValue"
                : "games:charlatan.costValuePlus",
              { extra: EFFECT_SURCHARGE },
            )}
          </Text>
        </View>
      ))}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("meters"),
          flexStyles.rowCentered,
          { gap: cardHeight * 0.15 },
        ]}
      >
        <View style={[flexStyles.colCentered, { flex: 1 }]}>
          <Text size="sm" weight={700} color={colorPale} numberOfLines={1}>
            {bonus > 0
              ? i18n.t("games:charlatan.strengthWithBonus", {
                  strength,
                  bonus,
                })
              : i18n.t("games:charlatan.strength", { strength })}
          </Text>
        </View>
        <ProgressBar
          progressValue={Math.min(duds, DUD_LIMIT)}
          totalValue={DUD_LIMIT}
          color={
            duds > DUD_LIMIT ? "red" : duds >= DUD_LIMIT - 2 ? "orange" : "blue"
          }
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:charlatan.duds")}
          tallyText={`${duds} / ${DUD_LIMIT}`}
          scaledHeight={cardHeight * 0.38}
          style={{ flex: 1 }}
        />
      </View>

      {status && (
        <View
          style={[
            pointerEventsStyles.none,
            getZoneStylesById("status"),
            flexStyles.colCentered,
          ]}
        >
          <Text size="xs" weight={500} color={colorPale} numberOfLines={1}>
            {status}
          </Text>
        </View>
      )}

      {!ended && (
        <View
          style={[
            getZoneStylesById("controls"),
            flexStyles.rowCentered,
            { gap: cardWidth * 0.15 },
          ]}
        >
          {game.phase === "brewing" && (
            <>
              <Button
                text={i18n.t("games:charlatan.addCard")}
                theme="blue"
                size="sm"
                onPress={onDraw}
                disabled={game.deck.length === 0}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text={i18n.t("games:charlatan.stop")}
                theme="green"
                size="sm"
                onPress={onStop}
                disabled={game.cauldron.length === 0}
                style={{ flex: 1 }}
                taller
              />
            </>
          )}
          {game.phase === "boiledOver" && (
            <>
              <Button
                text={i18n.t("games:charlatan.keepPoints", {
                  value: strength,
                })}
                theme="orange"
                size="sm"
                onPress={() => onKeep("points")}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text={i18n.t("games:charlatan.keepCoins", {
                  value: coinsFor(strength),
                })}
                theme="blue"
                size="sm"
                onPress={() => onKeep("coins")}
                style={{ flex: 1 }}
                taller
              />
            </>
          )}
          {game.phase === "market" && (
            <Button
              text={i18n.t("games:charlatan.nextRound", {
                round: game.round + 1,
                total: ROUNDS,
              })}
              theme="green"
              size="sm"
              onPress={onNextRound}
              style={{ flex: 1 }}
              taller
            />
          )}
        </View>
      )}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hudBars"),
          flexStyles.rowCentered,
          { gap: cardHeight * 0.15 },
        ]}
      >
        <ProgressBar
          progressValue={game.round}
          totalValue={ROUNDS}
          color="blue"
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:charlatan.round")}
          tallyText={`${game.round} / ${ROUNDS}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 1 }}
        />
        <ProgressBar
          progressValue={game.score}
          totalValue={WIN_SCORE}
          color={game.score >= WIN_SCORE ? "green" : "orange"}
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:charlatan.score")}
          tallyText={`${game.score} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 2 }}
        />
      </View>
    </GameWrapper>
  );
}
