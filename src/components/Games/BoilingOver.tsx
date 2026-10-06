import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
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
import { getUnderlayStyle } from "../Cards/CardStyles";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

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
  { min: 250, key: "games:boilingOver.tierMiracleWorker" },
  { min: 200, key: "games:boilingOver.tierCourtAlchemist" },
  { min: WIN_SCORE, key: "games:boilingOver.tierVillageHealer" },
] as const;

type Phase = "brewing" | "boiledOver" | "market" | "over";

export type BoilingOverGameState = {
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

function isFinalRound(state: BoilingOverGameState) {
  return state.round >= ROUNDS;
}

/** The chance that the next card from the deck boils the potion over. */
function bustChance(state: BoilingOverGameState) {
  const { deck } = state;
  if (deck.length === 0) return 0;
  const room = DUD_LIMIT - dudTotal(state.cauldron);
  const busts = (card: PlayingCard) => isDud(card) && rankValue(card) > room;
  const top = deck[deck.length - 1];
  if (top.faceUp) return busts(top) ? 1 : 0;
  return deck.filter(busts).length / deck.length;
}

type DrawResult = "ingredient" | "dud" | "dudReturned" | "boiledOver";

function drawCard(state: BoilingOverGameState): DrawResult | null {
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

function stopBrewing(state: BoilingOverGameState) {
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
  state: BoilingOverGameState,
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

function canBuy(state: BoilingOverGameState, card: PlayingCard) {
  return (
    state.phase === "market" &&
    state.bought.length < MAX_BUYS &&
    !state.bought.includes(card.suit) &&
    costOf(card) <= state.coins
  );
}

function buyCard(state: BoilingOverGameState, row: number, index: number) {
  const card = state.market[row]?.[index];
  if (!card || !canBuy(state, card)) return false;
  state.market[row].splice(index, 1);
  state.coins -= costOf(card);
  state.bought.push(card.suit);
  state.deck.push(flipToBack(card));
  return true;
}

/** Everything goes back into the deck; coins left over are lost. */
function startNextRound(state: BoilingOverGameState) {
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
function createInitialState(): BoilingOverGameState {
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

function gatherState(state: BoilingOverGameState): BoilingOverGameState {
  return {
    ...createInitialState(),
    deck: shuffle(flipAllToBack(collectCards(state))),
    market: MARKET_SUITS.map(() => []),
  };
}

const gameStateInitial = createInitialState();

export const boilingOverRules = {
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
const LABEL_WIDTH = 2.2;
const COLS = 7;
const PAD = 0.1;
const HUD_ROW = 0;
const MARKET_AREA_ROW = 0.55;
const MARKET_ROW = MARKET_AREA_ROW + PAD;
const MARKET_AREA_HEIGHT = MARKET_SUITS.length + PAD * 2;
const AREA_ROW = MARKET_AREA_ROW + MARKET_AREA_HEIGHT + 0.1;
const AREA_HEIGHT = 1.8;
const CAULDRON_ROW = AREA_ROW + PAD;
const METERS_WIDTH = 1.6;
const CAULDRON_COL = PAD * 2;
const CAULDRON_WIDTH = COLS - CAULDRON_COL - METERS_WIDTH - PAD * 2;
const METERS_COL = COLS - PAD * 2 - METERS_WIDTH;
const STATS_ROW = CAULDRON_ROW + 1.05;
const STATS_HEIGHT = AREA_ROW + AREA_HEIGHT - PAD - STATS_ROW;
const DECK_ROW = AREA_ROW + AREA_HEIGHT + 0.1;
const DECK_COL = 1;

/** A ProgressBar turned on its end, filling from the bottom. */
function VerticalBar({
  label,
  text,
  textColor,
  value,
  total,
  color,
  backgroundColor,
}: {
  label: string;
  text: string;
  textColor: string;
  value: number;
  total: number;
  color: string;
  backgroundColor: string;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const barThickness = size.width * 0.35;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        {size.width > 0 && (
          <View
            style={{
              position: "absolute",
              width: size.height,
              height: barThickness,
              left: (size.width - size.height) / 2,
              top: (size.height - barThickness) / 2,
              transform: [{ rotate: "-90deg" }],
            }}
          >
            <ProgressBar
              progressValue={value}
              totalValue={total}
              color={color}
              backgroundColor={backgroundColor}
              scaledHeight={barThickness}
              style={{ width: size.height }}
            />
          </View>
        )}
      </View>
      <View style={[flexStyles.colCentered, { marginTop: 2 }]}>
        <Text size="xs" weight={300} color={rgba(textColor, 0.7)}>
          {label}
        </Text>
        <Text size="sm" weight={700} color={textColor}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={[
        flexStyles.rowCentered,
        { justifyContent: "space-between", gap: 10 },
      ]}
    >
      <Text size="sm" weight={300} color={rgba(color, 0.7)} numberOfLines={1}>
        {label}
      </Text>
      <Text size="lg" weight={700} color={color} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ========== Component ========== //
export default function BoilingOver() {
  const { colorPale, colorDark } = useGameColors();
  const { spacing } = useResponsiveMetrics();
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
  } = useStateManager<BoilingOverGameState>({
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

  function update(change: (draft: BoilingOverGameState) => void) {
    setGame(produce(game, change));
  }

  function onDraw() {
    if (game.phase !== "brewing" || game.deck.length === 0) return;
    let result: DrawResult | null = null;
    update((draft) => {
      result = drawCard(draft);
    });
    if (result === "dudReturned") {
      showToast(i18n.t("games:boilingOver.dudReturned"));
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
        col: PAD,
        row: MARKET_ROW + i,
        width: LABEL_WIDTH,
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
          offset: 0.4,
          center: false,
        },
        placeholder: { showCount: false },
      },
    ]);

    return [
      {
        id: "marketArea",
        col: 0,
        row: MARKET_AREA_ROW,
        width: COLS,
        height: MARKET_AREA_HEIGHT,
      },
      {
        id: "hudBars",
        col: 0,
        row: HUD_ROW,
        width: "full",
        height: 0.45,
      },
      {
        id: "cauldronArea",
        col: 0,
        row: AREA_ROW,
        width: COLS,
        height: AREA_HEIGHT,
      },
      {
        id: "cauldron",
        name: "cauldron",
        cards: game.cauldron,
        col: CAULDRON_COL,
        row: CAULDRON_ROW,
        width: CAULDRON_WIDTH,
        baseZIndex: 10,
        fan: {
          direction: "right",
          offset: zoneFanOffset(
            game.cauldron.length,
            CAULDRON_WIDTH,
            0.15,
            0.7,
          ),
          center: false,
        },
      },
      {
        id: "stats",
        col: CAULDRON_COL,
        row: STATS_ROW,
        width: CAULDRON_WIDTH,
        height: STATS_HEIGHT,
      },
      {
        id: "meters",
        col: METERS_COL,
        row: CAULDRON_ROW,
        width: METERS_WIDTH,
        height: AREA_HEIGHT - PAD * 2,
      },
      ...marketZones,
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
        col: DECK_COL + GAP * 2,
        row: DECK_ROW,
        width: COLS - 1 - GAP * 2,
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
          selectColor: "orange",
          forceOverlayColor: true,
        };
      }
      const multiplier = card.suit === "diamonds";
      return {
        isDisabled: true,
        selectColor: multiplier ? "purple" : "none",
        forceSelectColor: multiplier,
      };
    }

    if (zoneName === "market" && pileIndex !== undefined) {
      const affordable = canBuy(game, card);
      return {
        onPress: affordable ? () => onBuy(pileIndex, cardIndex) : undefined,
        isDisabled: !affordable,
        selectColor: affordable ? "green" : "grey",
        forceOverlayColor: !affordable,
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

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.score}
      hideScore
      winLoseMessage={
        won && tier
          ? i18n.t("games:boilingOver.wonWithTier", {
              score: game.score,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:boilingOver.lostShortOfTarget", {
              score: game.score,
              target: WIN_SCORE,
            })
      }
      canUndo={canUndo && game.phase === "market"}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          pointerEventsStyles.none,
          getUnderlayStyle(cardWidth, colorDark, colorPale),
          getZoneStylesById("marketArea"),
        ]}
      />

      {MARKET_SUITS.map((suit, i) => (
        <View
          key={`marketLabel-${suit}`}
          style={[
            pointerEventsStyles.none,
            getZoneStylesById(`marketLabel-${i}`),
            flexStyles.colCentered,
            {
              zIndex: 2,
              alignItems: "flex-start",
              paddingLeft: spacing(8),
              gap: spacing(2),
              opacity: game.bought.includes(suit) ? 0.4 : 1,
            },
          ]}
        >
          <Icon
            name={suit}
            size={cardWidth * 0.34}
            color={isRed(suit) ? Colors.suitsRed : colorPale}
          />
          <Text size="xs" weight={500} color={colorPale}>
            {i18n.t(`games:boilingOver.effect_${suit}`)}
          </Text>
          <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
            {i18n.t(
              suit === "hearts"
                ? "games:boilingOver.costValue"
                : "games:boilingOver.costValuePlus",
              { extra: EFFECT_SURCHARGE },
            )}
          </Text>
        </View>
      ))}

      <View
        style={[
          pointerEventsStyles.none,
          getUnderlayStyle(cardWidth, colorDark, colorPale),
          getZoneStylesById("cauldronArea"),
        ]}
      />

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("stats"),
          {
            zIndex: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
          },
        ]}
      >
        <Stat
          label={i18n.t("games:boilingOver.strengthLabel")}
          value={bonus > 0 ? `${strength} (+${bonus})` : `${strength}`}
          color={colorPale}
        />
        <Stat
          label={i18n.t("games:boilingOver.pointsLabel")}
          value={`${strength + bonus}`}
          color={colorPale}
        />
        <Stat
          label={i18n.t("games:boilingOver.coinsLabel")}
          value={`${coinsFor(strength + bonus)}`}
          color={colorPale}
        />
      </View>

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("meters"),
          { zIndex: 2, flexDirection: "row", gap: cardWidth * 0.1 },
        ]}
      >
        <VerticalBar
          label={i18n.t("games:boilingOver.dudsLabel")}
          text={`${duds}/${DUD_LIMIT}`}
          textColor={colorPale}
          value={Math.min(duds, DUD_LIMIT)}
          total={DUD_LIMIT}
          color="orange"
          backgroundColor={rgba(colorDark, 0.7)}
        />
        <VerticalBar
          label={i18n.t("games:boilingOver.bustLabel")}
          text={`${Math.round(risk * 100)}%`}
          textColor={colorPale}
          value={Math.round(risk * 100)}
          total={100}
          color="red"
          backgroundColor={rgba(colorDark, 0.7)}
        />
      </View>

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
                text={i18n.t("games:boilingOver.stop")}
                theme="blue"
                size="sm"
                onPress={onStop}
                disabled={game.cauldron.length === 0}
                taller
              />
              <Button
                text={i18n.t("games:boilingOver.addCard")}
                theme="green"
                size="sm"
                onPress={onDraw}
                disabled={game.deck.length === 0}
                style={{ flex: 1 }}
                taller
              />
            </>
          )}
          {game.phase === "boiledOver" && (
            <>
              <Button
                text={i18n.t("games:boilingOver.keepPoints", {
                  value: strength,
                })}
                theme="orange"
                size="sm"
                onPress={() => onKeep("points")}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text={i18n.t("games:boilingOver.keepCoins", {
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
              text={i18n.t("games:boilingOver.continueToRound", {
                round: game.round + 1,
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
          { justifyContent: "space-between", gap: cardHeight * 0.15 },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              alignItems: "center",
              justifyContent: "space-between",
              minWidth: cardWidth * 2,
              paddingHorizontal: spacing(4),
            },
          ]}
        >
          <Text size="sm" weight={400} color={colorPale} numberOfLines={1}>
            {i18n.t("games:boilingOver.roundCounter")}
          </Text>
          <Text size="sm" weight={700} color={colorPale} numberOfLines={1}>
            {`${game.round} / ${ROUNDS}`}
          </Text>
        </View>

        <ProgressBar
          progressValue={game.score}
          totalValue={WIN_SCORE}
          color="blue"
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:boilingOver.score")}
          tallyText={`${game.score} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 1 }}
        />
      </View>
    </GameWrapper>
  );
}
