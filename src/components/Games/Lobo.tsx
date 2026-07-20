import { useFade } from "@/hooks/useFade";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
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
  sortCards,
  SUITS,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { infoSize } from "../Cards/CardMapBackgrounds";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const startingHand = 4;
const handWidth = 6;
const winTarget = 100;

type LoboMode = "hard" | "medium" | "easy";
type Action = "perfect" | "sum" | "split" | "over";

const actionColourMap: Record<Action, string> = {
  perfect: "green",
  sum: "purple",
  split: "pink",
  over: "orange",
};

type GameState = {
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
  mode: LoboMode;
};

const gameStateInitial: GameState = {
  deck: shuffle(buildLoboDeck("medium")).map(flipToBack),
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

// ── Deck (Postas: ranks 1-10, five suits; suit is irrelevant) ─────────────────
function rankToCard(n: number): CardRank {
  return n === 1 ? "A" : (String(n) as CardRank);
}

function buildLoboDeck(mode: LoboMode): PlayingCard[] {
  const maxRank = mode === "easy" ? 8 : mode === "hard" ? 10 : 9;
  const cards: PlayingCard[] = [];
  for (let copy = 0; copy < 5; copy += 1) {
    for (let n = 1; n <= maxRank; n += 1) {
      cards.push({
        id: `${copy}-${n}-${Math.random().toString(36).slice(2, 8)}`,
        suit: SUITS[copy % SUITS.length],
        rank: rankToCard(n),
        faceUp: false,
      });
    }
  }
  return cards;
}

function sumVals(cards: PlayingCard[]) {
  return cards.reduce((sum, c) => sum + rankValue(c), 0);
}

function detectAction(
  player: PlayingCard[],
  wolf: PlayingCard[],
): Action | null {
  if (player.length === 0 || wolf.length === 0) return null;
  const sp = sumVals(player);
  const sw = sumVals(wolf);

  if (player.length === 1 && wolf.length === 1) {
    if (sp === sw) return "perfect";
    if (sp > sw) return "over";
    return null;
  }
  if (player.length >= 2 && wolf.length === 1) return sp === sw ? "sum" : null;
  if (player.length === 1 && wolf.length >= 2)
    return sw === sp ? "split" : null;
  return null;
}

function keepTopFaceUp(draft: GameState) {
  if (draft.deck.length > 0) {
    draft.deck[draft.deck.length - 1] = flipToFace(
      draft.deck[draft.deck.length - 1],
    );
  }
}

function drawTo(draft: GameState, who: "player" | "wolf", count: number) {
  for (let i = 0; i < count; i += 1) {
    if (draft.deck.length === 0) break;
    const card = draft.deck.pop();
    if (card) draft[who].push(flipToFace(card));
  }
  keepTopFaceUp(draft);
}

async function resetDeck(draft: GameState, mode: LoboMode) {
  const allCards = flipAllToBack([
    ...draft.deck,
    ...draft.player,
    ...draft.wolf,
    ...draft.discard,
  ]);

  // Reset cards if the mode has changed
  if (draft.mode !== mode) {
    draft.mode = mode;
    draft.deck = shuffle(buildLoboDeck(mode));
  } else {
    draft.deck = shuffle(allCards);
  }

  draft.player = [];
  draft.wolf = [];
  draft.discard = [];
}

function dealRound(draft: GameState) {
  for (let i = 0; i < startingHand; i += 1) {
    const c = draft.deck.pop();
    if (c) draft.wolf.push(flipToFace(c));
  }
  for (let i = 0; i < startingHand; i += 1) {
    const c = draft.deck.pop();
    if (c) draft.player.push(flipToFace(c));
  }

  sortCards(draft.player);
  sortCards(draft.wolf);

  keepTopFaceUp(draft);
  draft.roundOver = false;
}

function finishRound(draft: GameState, won: boolean) {
  if (won) {
    draft.roundPoints = sumVals(draft.player);
    draft.playerScore += draft.roundPoints;
  } else {
    draft.roundPoints = sumVals(draft.wolf);
    draft.wolfScore += draft.roundPoints;
  }
  draft.roundWon = won;
  draft.roundOver = true;

  if (draft.playerScore >= winTarget || draft.wolfScore >= winTarget) {
    draft.ended = true;
    draft.won = draft.playerScore >= winTarget;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Lobo() {
  const { spacing } = useResponsiveMetrics();
  const { cardText } = useGameZoneBackground();
  const mode = useGameSettingValue("loboMode") as LoboMode;
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
  const action = detectAction(selPlayerCards, selWolfCards);

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
    const pIds = new Set(selectedPlayer);
    const wIds = new Set(selectedWolf);
    let diff: number | null = null;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const pSel = draft.player.filter((c) => pIds.has(c.id));
      const wSel = draft.wolf.filter((c) => wIds.has(c.id));
      draft.player = draft.player.filter((c) => !pIds.has(c.id));
      draft.wolf = draft.wolf.filter((c) => !wIds.has(c.id));
      draft.discard.push(...flipAllToBack(pSel), ...flipAllToBack(wSel));
      diff = rankValue(pSel[0]) - rankValue(wSel[0]);
    });

    await delay(600);

    setGame((draft) => {
      if (action === "perfect" || action === "sum") {
        drawTo(draft, "player", 1);
      } else if (action === "split") {
        drawTo(draft, "wolf", 1);
      } else if (diff !== null && action === "over") {
        drawTo(draft, "wolf", diff);
      }

      sortCards(draft.player);
      sortCards(draft.wolf);

      if (draft.wolf.length === 0) finishRound(draft, true);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);

    nextRound();
  }

  function fold() {
    if (game.ended || game.roundOver) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => finishRound(draft, false));

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
        placeholder: { text: "Draw", infoPos: "below", showCount: true },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: handWidth - 1,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: "Dscrd", infoPos: "below" },
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
    // visualizer: true,
  });

  const actionLabel = action
    ? action.charAt(0).toUpperCase() + action.slice(1)
    : "Capture";

  const countTextColor = (wolf: boolean) => {
    let baseColor = cardText;

    const hasCardsSelected = wolf
      ? sumVals(selWolfCards) > 0
      : sumVals(selPlayerCards) > 0;

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
      ended={game.ended}
      won={game.won}
      score={game.playerScore}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `You beat the Wolf ${game.playerScore}-${game.wolfScore}!`
          : `The Wolf beat you ${game.wolfScore}-${game.playerScore}.`
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
          <Text size="sm" weight={300} color={cardText}>
            Wolf
          </Text>
          <Text size="xl" weight={600} color={cardText}>
            {game.wolfScore}
          </Text>
        </View>

        <View
          style={[flexStyles.colCentered, flexStyles.flex1, { opacity: 0.5 }]}
        >
          <Text size="sm" weight={300} color={cardText}>
            Round
          </Text>
          <Text size="xl" weight={300} color={cardText}>
            {game.round}
          </Text>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={cardText}>
            Player
          </Text>
          <Text size="xl" weight={600} color={cardText}>
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
          {sumVals(selWolfCards)}
        </Text>

        <Text
          size="xxxl"
          weight={300}
          color={rgba(cardText, 0.6)}
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
          {sumVals(selPlayerCards)}
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
            {game.roundWon ? `Player` : `Wolf`}
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
              text="Fold"
              size="md"
              onPress={fold}
              fullWidth
              taller
              disabled={game.ended || game.roundOver}
              theme="red"
              style={{ flex: 1 }}
            />
            <Button
              text={actionLabel}
              size="md"
              onPress={executeCapture}
              fullWidth
              taller
              disabled={game.ended || game.roundOver || !action}
              theme={action ? actionColourMap[action] : "none"}
              style={{ flex: 2 }}
            />
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}
