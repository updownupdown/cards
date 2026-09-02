import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { useMemo } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  isFace,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "./GameWrapper";
import { Text } from "./Text";

export type EncounterVariant = "tombs" | "night" | "quest";

type GameState = {
  deck: PlayingCard[];
  encounter: PlayingCard | null;
  discard: PlayingCard[];
  trophies: PlayingCard[];
  health: number;
  power: number;
  progress: number;
  ended: boolean;
  won: boolean;
};

const CONFIG = {
  tombs: { health: 20, target: 4, power: 0, progressLabel: "Seals" },
  night: { health: 12, target: 12, power: 0, progressLabel: "Hours" },
  quest: { health: 18, target: 8, power: 2, progressLabel: "Depth" },
} as const;

function createInitialState(variant: EncounterVariant): GameState {
  const config = CONFIG[variant];
  return {
    deck: shuffle(createDeck()).map((card) => ({ ...card, faceUp: false })),
    encounter: null,
    discard: [],
    trophies: [],
    health: config.health,
    power: config.power,
    progress: 0,
    ended: false,
    won: false,
  };
}

function resolveCard(
  state: GameState,
  variant: EncounterVariant,
  action: "use" | "brace",
) {
  const card = state.encounter;
  if (!card || state.ended) return;
  const value = Math.min(rankValue(card), 10);

  if (variant === "tombs") {
    if (card.rank === "K") {
      if (state.power >= 10) {
        state.progress += 1;
        state.power -= 10;
        state.trophies.push(card);
      } else {
        state.health -= action === "brace" ? 3 : 7;
        state.discard.push(card);
      }
    } else if (action === "use") {
      if (card.suit === "diamonds") state.power += Math.ceil(value / 2);
      else if (card.suit === "hearts")
        state.health = Math.min(20, state.health + Math.ceil(value / 3));
      else if (card.suit === "clubs") state.power += 2;
      else state.health -= Math.max(1, value - state.power);
      state.discard.push(card);
    } else {
      state.power += 1;
      state.discard.push(card);
    }
  } else if (variant === "night") {
    state.progress += 1;
    if (card.suit === "hearts" && action === "use")
      state.health = Math.min(12, state.health + Math.ceil(value / 2));
    else if (card.suit === "diamonds" && action === "use")
      state.power += Math.ceil(value / 3);
    else if (card.suit === "clubs" && action === "use") state.power += 2;
    else if (card.suit === "spades")
      state.health -= Math.max(1, value - state.power);
    else if (action === "brace") state.health -= 1;
    state.discard.push(card);
  } else {
    if (card.suit === "diamonds" && action === "use")
      state.power = Math.max(state.power, value);
    else if (card.suit === "hearts" && action === "use")
      state.health = Math.min(18, state.health + Math.ceil(value / 2));
    else if (card.suit === "clubs" || card.suit === "spades") {
      const damage = Math.max(
        0,
        value - (action === "brace" ? state.power + 3 : state.power),
      );
      state.health -= damage;
      if (damage === 0) {
        state.progress += 1;
        state.trophies.push(card);
      } else state.discard.push(card);
    } else state.discard.push(card);
  }

  state.encounter = null;
  const target = CONFIG[variant].target;
  state.won = state.progress >= target;
  state.ended =
    state.won || state.health <= 0 || (!state.deck.length && !state.encounter);
}

export const encounterRunRules = { createInitialState, resolveCard };

export function EncounterRunGame({ variant }: { variant: EncounterVariant }) {
  const config = CONFIG[variant];
  const initial = useMemo(() => createInitialState(variant), [variant]);
  const { colorPale } = useGameColors();
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial: initial,
      resetAndSetup: async () => {
        const next = createInitialState(variant);
        setGame((draft) => void Object.assign(draft, next));
      },
    });

  function mutate(action: (draft: GameState) => void) {
    saveUndoState(structuredClone(game));
    setGame(action);
  }

  function draw() {
    if (game.encounter || game.ended) return;
    mutate((draft) => {
      const card = draft.deck.pop();
      if (card) draft.encounter = { ...card, faceUp: true };
      else draft.ended = true;
    });
  }

  const zones = useMemo<MapZone[]>(
    () => [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 1 },
        placeholder: { text: "Draw" },
      },
      {
        id: "encounter",
        name: "encounter",
        cards: game.encounter ? [game.encounter] : [],
        col: 2,
        row: 0,
        placeholder: { text: "Encounter" },
      },
      {
        id: "trophies",
        name: "trophies",
        cards: game.trophies,
        col: 4,
        row: 0,
        fan: { maxVisible: 1 },
        placeholder: { text: "Trophies" },
      },
      { id: "hud", name: "hud", col: 0, row: 2, width: 5, baseZIndex: 1 },
    ],
    [game],
  );

  const cardMapper = (mapped: MappedCard): AnimatedCardMapping =>
    mapped.zoneName === "deck"
      ? { onPress: draw, isDisabled: !!game.encounter || game.ended }
      : {};
  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
    fixedCols: 5,
    fixedRows: 4,
  });

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.progress}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      <View
        style={[getZoneStylesById("hud"), { flexDirection: "column", gap: 8 }]}
      >
        <View
          style={[flexStyles.rowCentered, { justifyContent: "space-around" }]}
        >
          <Text color={colorPale}>Health {Math.max(0, game.health)}</Text>
          <Text color={colorPale}>Power {game.power}</Text>
          <Text color={colorPale}>
            {config.progressLabel} {game.progress}/{config.target}
          </Text>
        </View>
        <View style={[flexStyles.rowCentered, { gap: 8 }]}>
          <Button
            text={game.encounter ? "Use" : "Draw"}
            onPress={() =>
              game.encounter
                ? mutate((draft) => resolveCard(draft, variant, "use"))
                : draw()
            }
            disabled={game.ended}
            fullWidth
          />
          <Button
            text="Brace"
            theme="orange"
            onPress={() =>
              mutate((draft) => resolveCard(draft, variant, "brace"))
            }
            disabled={!game.encounter || game.ended}
            fullWidth
          />
        </View>
      </View>
    </GameWrapper>
  );
}
