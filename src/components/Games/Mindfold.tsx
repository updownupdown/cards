import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  PlayingCard,
  RANKS,
  rankValue,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const MOVE_LIMIT = 30;
const TARGET = 5;

type GameState = {
  packet: PlayingCard[];
  claimed: PlayingCard[];
  moves: number;
  ended: boolean;
  won: boolean;
};

function createInitialState(): GameState {
  const packet = shuffle(
    Array.from({ length: 18 }, (_, index) => ({
      id: `mindfold-${index}`,
      suit: SUITS[index % SUITS.length],
      rank: RANKS[index % 9],
      faceUp: true,
    })),
  );
  return { packet, claimed: [], moves: 0, ended: false, won: false };
}

function activeValue(card: PlayingCard) {
  const value = rankValue(card);
  return card.faceUp ? value : 10 - value;
}

function canClaim(packet: PlayingCard[]) {
  const active = packet.slice(0, 3);
  return (
    active.length === 3 &&
    (active.every((card) => card.suit === active[0].suit) ||
      active.reduce((sum, card) => sum + activeValue(card), 0) === 15)
  );
}

export const mindfoldRules = { activeValue, canClaim };
const gameStateInitial = createInitialState();

export default function Mindfold() {
  const { colorPale } = useGameColors();
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        const next = createInitialState();
        setGame((draft) => void Object.assign(draft, next));
      },
    });

  function act(action: "cycle" | "invert" | "reverse" | "claim") {
    if (game.ended || (action === "claim" && !canClaim(game.packet))) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (action === "cycle") draft.packet.push(draft.packet.shift()!);
      if (action === "invert") draft.packet[0].faceUp = !draft.packet[0].faceUp;
      if (action === "reverse")
        draft.packet.splice(0, 3, ...draft.packet.slice(0, 3).reverse());
      if (action === "claim") draft.claimed.push(...draft.packet.splice(0, 3));
      draft.moves += 1;
      draft.won = draft.claimed.length / 3 >= TARGET;
      draft.ended =
        draft.won || draft.moves >= MOVE_LIMIT || draft.packet.length < 3;
    });
  }

  const zones = useMemo<MapZone[]>(
    () => [
      ...game.packet.slice(0, 6).map((card, index) => ({
        id: `active-${index}`,
        name: "active",
        cards: [card],
        col: index,
        row: 0,
        baseZIndex: 5,
      })),
      {
        id: "packet",
        name: "packet",
        cards: game.packet.slice(6).map((card) => ({ ...card, faceUp: false })),
        col: 0,
        row: 2,
        fan: { maxVisible: 1 },
        placeholder: { text: "Packet" },
      },
      {
        id: "claimed",
        name: "claimed",
        cards: game.claimed,
        col: 5,
        row: 2,
        fan: { maxVisible: 1 },
        placeholder: { text: "Claims" },
      },
      { id: "hud", name: "hud", col: 1, row: 2, width: 4, baseZIndex: 1 },
    ],
    [game],
  );
  const cardMapper = (): AnimatedCardMapping => ({});
  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 6,
    fixedRows: 4,
    gap: 0.1,
  });

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.moves}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      <View
        style={[getZoneStylesById("hud"), { flexDirection: "column", gap: 6 }]}
      >
        <Text color={colorPale} style={{ textAlign: "center" }}>
          Claims {game.claimed.length / 3}/{TARGET} | Moves {game.moves}/
          {MOVE_LIMIT}
        </Text>
        <View style={[flexStyles.rowCentered, { gap: 5, flexWrap: "wrap" }]}>
          <Button
            text="Cycle"
            size="sm"
            onPress={() => act("cycle")}
            disabled={game.ended}
          />
          <Button
            text="Invert"
            size="sm"
            onPress={() => act("invert")}
            disabled={game.ended}
          />
          <Button
            text="Reverse"
            size="sm"
            onPress={() => act("reverse")}
            disabled={game.ended}
          />
          <Button
            text="Claim"
            size="sm"
            theme="green"
            onPress={() => act("claim")}
            disabled={game.ended || !canClaim(game.packet)}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
