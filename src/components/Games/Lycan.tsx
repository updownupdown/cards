import { useFade } from "@/hooks/useFade";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  type CardRank,
  flipAllToBack,
  flipToBack,
  flipToFace,
  type PlayingCard,
  rankValue,
  shuffle,
  sortCardsByRank,
  SUITS,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { infoSize } from "../Cards/CardMapBackgrounds";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
const handWidth = 6;
const WOLFS_GAMBIT_STARTING_HAND = 4;
const WOLFS_GAMBIT_WIN_TARGET = 100;

export type LycanMode = "hard" | "medium" | "easy";
export type LycanAction = "perfect" | "sum" | "split" | "over";

export type LycanGameState = {
  deck: PlayingCard[];
  player: PlayingCard[];
  wolf: PlayingCard[];
  discard: PlayingCard[];
  playerScore: number;
  wolfScore: number;
  round: number;
  roundOver: boolean;
  roundWon: boolean;
  roundPoints: number;
  ended: boolean;
  won: boolean;
  mode: LycanMode;
};

const actionColourMap: Record<LycanAction, string> = {
  perfect: "green",
  sum: "purple",
  split: "pink",
  over: "orange",
};

const gameStateInitial: LycanGameState = {
  deck: shuffle(buildLycanDeck("medium")).map(flipToBack),
  player: [],
  wolf: [],
  discard: [],
  playerScore: 0,
  wolfScore: 0,
  round: 1,
  roundOver: false,
  roundWon: false,
  roundPoints: 0,
  ended: false,
  won: false,
  mode: "medium",
};

function rankToCard(rank: number): CardRank {
  return rank === 1 ? "A" : (String(rank) as CardRank);
}

function buildLycanDeck(
  mode: LycanMode,
  random: () => number = Math.random,
): PlayingCard[] {
  const maxRank = mode === "easy" ? 8 : mode === "hard" ? 10 : 9;
  const cards: PlayingCard[] = [];

  for (let copy = 0; copy < 5; copy += 1) {
    for (let rank = 1; rank <= maxRank; rank += 1) {
      cards.push({
        id: `${copy}-${rank}-${random().toString(36).slice(2, 8)}`,
        suit: SUITS[copy % SUITS.length],
        rank: rankToCard(rank),
        faceUp: false,
      });
    }
  }

  return cards;
}

function sumLycanCards(cards: readonly PlayingCard[]) {
  return cards.reduce((sum, card) => sum + rankValue(card), 0);
}

function detectLycanAction(
  player: readonly PlayingCard[],
  wolf: readonly PlayingCard[],
): LycanAction | null {
  if (player.length === 0 || wolf.length === 0) return null;

  const playerTotal = sumLycanCards(player);
  const wolfTotal = sumLycanCards(wolf);

  if (player.length === 1 && wolf.length === 1) {
    if (playerTotal === wolfTotal) return "perfect";
    if (playerTotal > wolfTotal) return "over";
    return null;
  }

  if (player.length >= 2 && wolf.length === 1) {
    return playerTotal === wolfTotal ? "sum" : null;
  }

  if (player.length === 1 && wolf.length >= 2) {
    return wolfTotal === playerTotal ? "split" : null;
  }

  return null;
}

function getLycanCaptureEffect(
  player: readonly PlayingCard[],
  wolf: readonly PlayingCard[],
) {
  const action = detectLycanAction(player, wolf);
  if (action === null) return null;

  if (action === "perfect" || action === "sum") {
    return { action, drawFor: "player" as const, drawCount: 1 };
  }

  if (action === "split") {
    return { action, drawFor: "wolf" as const, drawCount: 1 };
  }

  return {
    action,
    drawFor: "wolf" as const,
    drawCount: rankValue(player[0]) - rankValue(wolf[0]),
  };
}

function scoreLycanRound(
  state: Readonly<LycanGameState>,
  roundWon: boolean,
): LycanGameState {
  const roundPoints = sumLycanCards(roundWon ? state.player : state.wolf);
  const playerScore = state.playerScore + (roundWon ? roundPoints : 0);
  const wolfScore = state.wolfScore + (roundWon ? 0 : roundPoints);
  const ended =
    playerScore >= WOLFS_GAMBIT_WIN_TARGET ||
    wolfScore >= WOLFS_GAMBIT_WIN_TARGET;

  return {
    ...state,
    playerScore,
    wolfScore,
    roundPoints,
    roundWon,
    roundOver: true,
    ended,
    won: ended ? playerScore >= WOLFS_GAMBIT_WIN_TARGET : state.won,
  };
}

function assertLycanInvariants(state: Readonly<LycanGameState>) {
  const cards = [
    ...state.deck,
    ...state.player,
    ...state.wolf,
    ...state.discard,
  ];
  const uniqueIds = new Set(cards.map((card) => card.id));

  if (uniqueIds.size !== cards.length) {
    throw new Error("A Lycan card exists in more than one zone");
  }
  if (state.playerScore < 0 || state.wolfScore < 0 || state.roundPoints < 0) {
    throw new Error("Lycan scores cannot be negative");
  }
  if (
    state.ended &&
    state.playerScore < WOLFS_GAMBIT_WIN_TARGET &&
    state.wolfScore < WOLFS_GAMBIT_WIN_TARGET
  ) {
    throw new Error("An ended Lycan game must have a score at the win target");
  }
}

function keepTopFaceUp(draft: LycanGameState) {
  if (draft.deck.length > 0) {
    draft.deck[draft.deck.length - 1] = flipToFace(
      draft.deck[draft.deck.length - 1],
    );
  }
}

function drawTo(draft: LycanGameState, who: "player" | "wolf", count: number) {
  for (let i = 0; i < count; i += 1) {
    if (draft.deck.length === 0) break;
    const card = draft.deck.pop();
    if (card) draft[who].push(flipToFace(card));
  }
  keepTopFaceUp(draft);
}

function resetDeck(
  draft: LycanGameState,
  mode: LycanMode,
  random: () => number = Math.random,
) {
  const allCards = flipAllToBack([
    ...draft.deck,
    ...draft.player,
    ...draft.wolf,
    ...draft.discard,
  ]);

  // Reset cards if the mode has changed
  if (draft.mode !== mode) {
    draft.mode = mode;
    draft.deck = shuffle(buildLycanDeck(mode, random), random);
  } else {
    draft.deck = shuffle(allCards, random);
  }

  draft.player = [];
  draft.wolf = [];
  draft.discard = [];
}

function dealRound(draft: LycanGameState) {
  for (let i = 0; i < WOLFS_GAMBIT_STARTING_HAND; i += 1) {
    const c = draft.deck.pop();
    if (c) draft.wolf.push(flipToFace(c));
  }
  for (let i = 0; i < WOLFS_GAMBIT_STARTING_HAND; i += 1) {
    const c = draft.deck.pop();
    if (c) draft.player.push(flipToFace(c));
  }

  draft.player = sortCardsByRank(draft.player);
  draft.wolf = sortCardsByRank(draft.wolf);

  keepTopFaceUp(draft);
  draft.roundOver = false;
}

function finishRound(draft: LycanGameState, won: boolean) {
  Object.assign(draft, scoreLycanRound(draft, won));
}

function foldLycanRoundAction(draft: LycanGameState) {
  if (draft.ended || draft.roundOver) return false;
  finishRound(draft, false);
  return true;
}

function startNextLycanRoundAction(
  draft: LycanGameState,
  mode: LycanMode,
  random: () => number = Math.random,
) {
  if (!draft.roundOver) return false;
  resetDeck(draft, mode, random);
  if (draft.ended) return true;
  draft.round += 1;
  dealRound(draft);
  return true;
}

export type LycanCapturePlan = {
  playerIds: string[];
  wolfIds: string[];
  effect: NonNullable<ReturnType<typeof getLycanCaptureEffect>>;
  roundWillEnd: boolean;
};

function createLycanCapturePlan(
  state: Readonly<LycanGameState>,
  playerIds: readonly string[],
  wolfIds: readonly string[],
): LycanCapturePlan | null {
  if (state.ended || state.roundOver) return null;

  const uniquePlayerIds = [...new Set(playerIds)];
  const uniqueWolfIds = [...new Set(wolfIds)];
  const selectedPlayer = state.player.filter((card) =>
    uniquePlayerIds.includes(card.id),
  );
  const selectedWolf = state.wolf.filter((card) =>
    uniqueWolfIds.includes(card.id),
  );
  if (
    selectedPlayer.length !== uniquePlayerIds.length ||
    selectedWolf.length !== uniqueWolfIds.length
  ) {
    return null;
  }

  const effect = getLycanCaptureEffect(selectedPlayer, selectedWolf);
  if (!effect) return null;

  return {
    playerIds: uniquePlayerIds,
    wolfIds: uniqueWolfIds,
    effect,
    roundWillEnd:
      (effect.action === "perfect" || effect.action === "sum") &&
      selectedWolf.length === state.wolf.length,
  };
}

function removeLycanCaptureAction(
  draft: LycanGameState,
  plan: LycanCapturePlan,
) {
  const playerIds = new Set(plan.playerIds);
  const wolfIds = new Set(plan.wolfIds);
  const selectedPlayer = draft.player.filter((card) => playerIds.has(card.id));
  const selectedWolf = draft.wolf.filter((card) => wolfIds.has(card.id));
  if (
    selectedPlayer.length !== playerIds.size ||
    selectedWolf.length !== wolfIds.size
  ) {
    return false;
  }

  draft.player = draft.player.filter((card) => !playerIds.has(card.id));
  draft.wolf = draft.wolf.filter((card) => !wolfIds.has(card.id));
  draft.discard.push(
    ...flipAllToBack(selectedPlayer),
    ...flipAllToBack(selectedWolf),
  );
  return true;
}

function completeLycanCaptureAction(
  draft: LycanGameState,
  plan: LycanCapturePlan,
) {
  drawTo(draft, plan.effect.drawFor, plan.effect.drawCount);
  draft.player = sortCardsByRank(draft.player);
  draft.wolf = sortCardsByRank(draft.wolf);
  if (draft.wolf.length === 0) finishRound(draft, true);
}

function executeLycanCaptureAction(
  draft: LycanGameState,
  playerIds: readonly string[],
  wolfIds: readonly string[],
) {
  const plan = createLycanCapturePlan(draft, playerIds, wolfIds);
  if (!plan || !removeLycanCaptureAction(draft, plan)) return null;
  completeLycanCaptureAction(draft, plan);
  return plan;
}

export const lycanRules = {
  buildDeck: buildLycanDeck,
  detectAction: detectLycanAction,
  getCaptureEffect: getLycanCaptureEffect,
  scoreRound: scoreLycanRound,
  sumCards: sumLycanCards,
  assertInvariants: assertLycanInvariants,
  createCapturePlan: createLycanCapturePlan,
  removeCaptureAction: removeLycanCaptureAction,
  completeCaptureAction: completeLycanCaptureAction,
  executeCaptureAction: executeLycanCaptureAction,
  foldRoundAction: foldLycanRoundAction,
  resetDeckAction: resetDeck,
  dealRoundAction: dealRound,
  startNextRoundAction: startNextLycanRoundAction,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function Lycan() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const mode = useGameSettingValue("lycanMode") as LycanMode;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [selectedPlayer, setSelectedPlayer] = useState<string[]>([]);
  const [selectedWolf, setSelectedWolf] = useState<string[]>([]);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => {
          resetDeck(draft, modeRef.current);
        });

        // Reset game state and deal a new round
        setGame((draft) => {
          draft.playerScore = 0;
          draft.wolfScore = 0;
          draft.round = 1;
          draft.ended = false;
          draft.won = false;
        });

        await delay(600);

        setGame((draft) => {
          dealRound(draft);
        });
      },
      resetNonGameStates: () => {
        setSelectedPlayer([]);
        setSelectedWolf([]);
      },
    });

  const selPlayerCards = useMemo(
    () => game.player.filter((c) => selectedPlayer.includes(c.id)),
    [game.player, selectedPlayer],
  );
  const selWolfCards = useMemo(
    () => game.wolf.filter((c) => selectedWolf.includes(c.id)),
    [game.wolf, selectedWolf],
  );
  const action = detectLycanAction(selPlayerCards, selWolfCards);

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function onPlayerPress(id: string) {
    if (game.ended || game.roundOver) return;
    setSelectedPlayer((prev) => toggle(prev, id));
  }
  function onWolfPress(id: string) {
    if (game.ended || game.roundOver) return;
    setSelectedWolf((prev) => toggle(prev, id));
  }

  async function executeCapture() {
    if (game.ended || game.roundOver || !action) return;
    const capturePlan = createLycanCapturePlan(
      game,
      selectedPlayer,
      selectedWolf,
    );
    if (!capturePlan) return;
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      removeLycanCaptureAction(draft, capturePlan);
    });

    await delay(600);

    setGame((draft) => {
      completeLycanCaptureAction(draft, capturePlan);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);

    if (capturePlan.roundWillEnd) {
      nextRound();
    }
  }

  function fold() {
    if (game.ended || game.roundOver) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      foldLycanRoundAction(draft);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);

    nextRound();
  }

  async function nextRound() {
    await delay(1000);

    setGame((draft) => {
      resetDeck(draft, modeRef.current);
    });

    await delay(1000);

    setGame((draft) => {
      if (draft.ended) return;
      draft.round += 1;
      dealRound(draft);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);
  }

  const { isRendered: buttonsRendered, opacity: buttonsOpacity } = useFade(
    !game.roundOver && !game.ended,
    500,
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const playerOffset = Math.min(1.2, 5 / game.player.length);
    const wolfOffset = Math.min(1.2, 5 / game.wolf.length);

    const result: MapZone[] = [
      {
        id: "hud",
        col: 1.3,
        row: 0,
        width: 3.4,
        height: 1 + infoSize.aboveBelow,
      },
      {
        id: "wolf",
        name: "wolf",
        cards: game.wolf,
        col: 0,
        row: 1.5,
        width: handWidth,
        height: 1.2,
        fan: { direction: "right", offset: wolfOffset },
        baseZIndex: 5,
        placeholder: {},
      },
      { id: "status", col: 0, row: 2.8, width: "full", height: 0.8 },
      {
        id: "player",
        name: "player",
        cards: game.player,
        col: 0,
        row: 3.7,
        width: handWidth,
        height: 1.2,
        fan: { direction: "right", offset: playerOffset },
        baseZIndex: 5,
        placeholder: {},
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "below",
          showCount: true,
        },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: handWidth - 1,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: i18n.t("cards:discard"), infoPos: "below" },
      },

      { id: "buttons", col: 0, row: 5.1, width: "full", height: 0.9 },
    ];

    return result;
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "wolf") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedWolf.includes(id),
        selectColor: action ? actionColourMap[action] : "blue",
        isDisabled: game.ended || game.roundOver,
        onPress: () => onWolfPress(id),
      };
    } else if (mappedCard.zoneName === "player") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedPlayer.includes(id),
        selectColor: action ? actionColourMap[action] : "blue",
        isDisabled: game.ended || game.roundOver,
        onPress: () => onPlayerPress(id),
      };
    }
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0,
    cardSize: "small",
  });

  const actionLabel = action
    ? action.charAt(0).toUpperCase() + action.slice(1)
    : undefined;

  const countTextColor = (wolf: boolean) => {
    let baseColor = colorPale;

    const hasCardsSelected = wolf
      ? sumLycanCards(selWolfCards) > 0
      : sumLycanCards(selPlayerCards) > 0;

    if (hasCardsSelected) baseColor = Colors.cardSelectBlue;

    if (action === "perfect") baseColor = Colors.cardSelectGreen;
    if (action === "sum") baseColor = Colors.cardSelectPurple;
    if (action === "split") baseColor = Colors.cardSelectPink;
    if (action === "over") baseColor = Colors.cardSelectOrange;

    const opacity = hasCardsSelected ? 1 : 0.4;

    return rgba(baseColor, opacity);
  };

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.playerScore}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:lycan.youBeatTheWolf", {
              playerScore: game.playerScore,
              wolfScore: game.wolfScore,
            })
          : i18n.t("games:lycan.theWolfBeatYou", {
              wolfScore: game.wolfScore,
              playerScore: game.playerScore,
            })
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
          flexStyles.spaceAround,
        ]}
      >
        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={colorPale}>
            {i18n.t("games:lycan.wolf")}
          </Text>
          <Text size="xl" weight={600} color={colorPale}>
            {game.wolfScore}
          </Text>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={Colors.white}>
            {i18n.t("games:lycan.round")}
          </Text>
          <Text size="xl" weight={600} color={Colors.white}>
            {game.round}
          </Text>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={colorPale}>
            {i18n.t("cards:player")}
          </Text>
          <Text size="xl" weight={600} color={colorPale}>
            {game.playerScore}
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          getZoneStylesById("status"),
          flexStyles.rowCentered,
          {
            opacity: buttonsOpacity,
          },
        ]}
      >
        <Text
          size="xxxl"
          weight={600}
          color={countTextColor(true)}
          style={{ width: spacing(30), textAlign: "center" }}
          lineHeight={1}
        >
          {sumLycanCards(selWolfCards)}
        </Text>

        <Text
          size="xxxl"
          weight={300}
          color={rgba(colorPale, 0.6)}
          style={{ width: spacing(20), textAlign: "center" }}
        >
          :
        </Text>

        <Text
          size="xxxl"
          weight={600}
          color={countTextColor(false)}
          style={{ width: spacing(30), textAlign: "center" }}
          lineHeight={1}
        >
          {sumLycanCards(selPlayerCards)}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          getZoneStylesById("status"),
          flexStyles.rowCentered,
          {
            opacity: buttonsOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.flex1,
            {
              width: "70%",
              gap: spacing(6),
              marginVertical: spacing(10),
              marginHorizontal: "15%",
              backgroundColor: rgba(
                game.roundWon ? Colors.buttonGreen : Colors.buttonRed,
                0.3,
              ),
              padding: spacing(10),
              borderRadius: spacing(8),
              borderWidth: spacing(1),
              borderColor: rgba(
                game.roundWon ? Colors.buttonGreen : Colors.buttonRed,
                0.6,
              ),
              boxShadow: `0 0 ${spacing(10)}px ${rgba(Colors.black, 0.4)}`,
            },
          ]}
        >
          <Text size="md" weight={400} color={Colors.white}>
            {game.roundWon
              ? i18n.t("cards:player")
              : i18n.t("games:lycan.wolf")}
          </Text>
          <Text size="md" weight={600} color={Colors.white}>
            +{game.roundPoints}
          </Text>
        </View>
      </Animated.View>

      <View style={[getZoneStylesById("buttons")]}>
        {buttonsRendered && (
          <Animated.View
            style={[
              flexStyles.fullWidth,
              flexStyles.fullHeight,
              {
                opacity: buttonsOpacity,
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
              },
            ]}
          >
            <Button
              text={i18n.t("cards:fold")}
              size="md"
              onPress={fold}
              taller
              disabled={game.ended || game.roundOver}
              theme="red"
              style={{ flex: 1 }}
            />

            <View style={[flexStyles.colCentered, { flex: 2 }]}>
              {actionLabel ? (
                <Button
                  text={actionLabel}
                  size="md"
                  onPress={executeCapture}
                  taller
                  disabled={game.ended || game.roundOver || !action}
                  theme={action ? actionColourMap[action] : "none"}
                  style={{ width: "100%", opacity: action ? 1 : 0 }}
                />
              ) : (
                <Text size="sm" weight={300} color={rgba(colorPale, 0.6)}>
                  {i18n.t("games:lycan.selectCardsToCapture")}
                </Text>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}
