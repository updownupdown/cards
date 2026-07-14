import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  type CardRank,
  flipToBack,
  flipToFace,
  type PlayingCard,
  rankValue,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const startingHand = 4;
const winTarget = 100;

type LoboMode = "hard" | "ordinary" | "easy";
type Action = "perfect" | "sum" | "split" | "over";

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
};

const gameStateInitial: GameState = {
  deck: [],
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

function dealRound(draft: GameState, mode: LoboMode) {
  const deck = shuffle(buildLoboDeck(mode)).map(flipToBack);
  draft.wolf = [];
  draft.player = [];
  draft.discard = [];
  for (let i = 0; i < startingHand; i += 1) {
    const c = deck.pop();
    if (c) draft.wolf.push(flipToFace(c));
  }
  for (let i = 0; i < startingHand; i += 1) {
    const c = deck.pop();
    if (c) draft.player.push(flipToFace(c));
  }
  draft.deck = deck;
  keepTopFaceUp(draft);
  draft.roundOver = false;
  draft.roundWon = false;
  draft.roundPoints = 0;
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
  const { cardBg, cardText } = useGameZoneBackground();
  const mode = useGameSettingValue("loboMode") as LoboMode;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [selectedPlayer, setSelectedPlayer] = useState<string[]>([]);
  const [selectedWolf, setSelectedWolf] = useState<string[]>([]);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedPlayer([]);
        setSelectedWolf([]);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          draft.playerScore = 0;
          draft.wolfScore = 0;
          draft.round = 1;
          draft.ended = false;
          draft.won = false;
          dealRound(draft, modeRef.current);
        });
        await delay();
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

  function executeCapture() {
    if (game.ended || game.roundOver || !action) return;
    const pIds = new Set(selectedPlayer);
    const wIds = new Set(selectedWolf);
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const pSel = draft.player.filter((c) => pIds.has(c.id));
      const wSel = draft.wolf.filter((c) => wIds.has(c.id));
      draft.player = draft.player.filter((c) => !pIds.has(c.id));
      draft.wolf = draft.wolf.filter((c) => !wIds.has(c.id));
      draft.discard.push(...pSel, ...wSel);

      if (action === "perfect" || action === "sum") {
        drawTo(draft, "player", 1);
      } else if (action === "split") {
        drawTo(draft, "wolf", 1);
      } else {
        const diff = rankValue(pSel[0]) - rankValue(wSel[0]);
        drawTo(draft, "wolf", diff);
      }

      if (draft.wolf.length === 0) finishRound(draft, true);
    });

    setSelectedPlayer([]);
    setSelectedWolf([]);
  }

  function fold() {
    if (game.ended || game.roundOver) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => finishRound(draft, false));
    setSelectedPlayer([]);
    setSelectedWolf([]);
  }

  function nextRound() {
    setGame((draft) => {
      if (draft.ended) return;
      draft.round += 1;
      dealRound(draft, modeRef.current);
    });
    setSelectedPlayer([]);
    setSelectedWolf([]);
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  function fan(count: number) {
    const maxStep = 1.15;
    const span = 5.2;
    const step = count <= 1 ? 0 : Math.min(maxStep, span / (count - 1));
    const width = (count - 1) * step + 1;
    const startX = Math.max(0, (5.6 - width) / 2);
    return { step, startX };
  }

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      { id: "hud", col: 0, row: 0, width: "full", height: 0.6 },
    ];

    const wolfFan = fan(game.wolf.length);
    game.wolf.forEach((card, i) => {
      result.push({
        id: `wolf-${card.id}`,
        name: "wolf",
        cards: [card],
        col: wolfFan.startX + i * wolfFan.step,
        row: 1.0,
        baseZIndex: 5 + i,
      });
    });

    const playerFan = fan(game.player.length);
    game.player.forEach((card, i) => {
      result.push({
        id: `player-${card.id}`,
        name: "player",
        cards: [card],
        col: playerFan.startX + i * playerFan.step,
        row: 2.9,
        baseZIndex: 5 + i,
      });
    });

    result.push(
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0.2,
        row: 4.15,
        fan: { maxVisible: 1 },
        baseZIndex: 40,
        placeholder: { text: "Cub", infoPos: "right", showCount: true },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4.4,
        row: 4.15,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: "Out", infoPos: "left" },
      },
      { id: "status", col: 1.4, row: 4.3, width: 2.8, height: 0.7 },
      { id: "controls", col: 0, row: 5.3, width: "full", height: 0.9 },
    );

    return result;
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "wolf") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedWolf.includes(id),
        selectColor: "red",
        isDisabled: game.ended || game.roundOver,
        onPress: () => onWolfPress(id),
      };
    }
    if (mappedCard.zoneName === "player") {
      const id = mappedCard.card.id;
      return {
        isSelected: selectedPlayer.includes(id),
        selectColor: "blue",
        isDisabled: game.ended || game.roundOver,
        onPress: () => onPlayerPress(id),
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.12,
    cardSize: "small",
  });

  const actionLabel = action
    ? action.charAt(0).toUpperCase() + action.slice(1)
    : "Capture";

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
          : `The Wolf wins ${game.wolfScore}-${game.playerScore}.`
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <Text size="sm" weight={600} color={cardText}>
          You {game.playerScore}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Wolf {game.wolfScore}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Round {game.round} · to {winTarget}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("status"),
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        {game.roundOver && !game.ended ? (
          <Text size="sm" weight={700} color={cardText}>
            {game.roundWon
              ? `Round won!  +${game.roundPoints}`
              : `Folded — Wolf +${game.roundPoints}`}
          </Text>
        ) : (
          <Text size="xs" weight={400} color={cardText}>
            {selPlayerCards.length || selWolfCards.length
              ? `You ${sumVals(selPlayerCards)} · Wolf ${sumVals(selWolfCards)}`
              : "Select your cards, then the Wolf's"}
          </Text>
        )}
      </View>

      <View
        style={[
          getZoneStylesById("controls"),
          { flexDirection: "row", gap: 10, alignItems: "center" },
        ]}
      >
        {game.roundOver && !game.ended ? (
          <Button
            text="Deal Next Round"
            size="md"
            onPress={nextRound}
            fullWidth
            taller
            theme={cardBg}
          />
        ) : (
          <>
            <View style={{ flex: 2 }}>
              <Button
                text={actionLabel}
                size="md"
                onPress={executeCapture}
                fullWidth
                taller
                disabled={game.ended || game.roundOver || !action}
                theme={cardBg}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                text="Fold"
                size="md"
                onPress={fold}
                fullWidth
                taller
                disabled={game.ended || game.roundOver}
                theme="red"
              />
            </View>
          </>
        )}
      </View>
    </GameWrapper>
  );
}
