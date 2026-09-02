import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToFace,
  flipToBack,
  rankValue,
  shuffle,
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

type RealmSuit = Exclude<CardSuit, "spades">;
type ChampionRank = Extract<CardRank, "A" | "3" | "5">;

export type CastleSiegeCommand = Record<RealmSuit, number>;

export type CastleSiegeGameState = {
  defenses: PlayingCard[];
  kingdoms: PlayingCard[];
  champions: PlayingCard[];
  commandDeck: number[];
  activeCommand: number | null;
  commandDiscard: number[];
  removedCommands: number[];
  assaults: number;
  ended: boolean;
  won: boolean;
};

const COMMANDS: CastleSiegeCommand[] = [
  { hearts: 1, clubs: 2, diamonds: 3 },
  { hearts: 1, clubs: 3, diamonds: 2 },
  { hearts: 2, clubs: 1, diamonds: 3 },
  { hearts: 2, clubs: 3, diamonds: 1 },
  { hearts: 3, clubs: 1, diamonds: 2 },
  { hearts: 3, clubs: 2, diamonds: 1 },
];

const MORALE_BY_DEFENSE: Partial<
  Record<number, { rank: ChampionRank; delta: -1 | 1 }>
> = {
  2: { rank: "A", delta: -1 },
  3: { rank: "A", delta: 1 },
  4: { rank: "3", delta: -1 },
  5: { rank: "3", delta: 1 },
  6: { rank: "5", delta: -1 },
  7: { rank: "5", delta: 1 },
};

const initialState: CastleSiegeGameState = {
  defenses: [],
  kingdoms: [],
  champions: [],
  commandDeck: [],
  activeCommand: null,
  commandDiscard: [],
  removedCommands: [],
  assaults: 0,
  ended: false,
  won: false,
};

function isRealmSuit(suit: CardSuit): suit is RealmSuit {
  return suit !== "spades";
}

function isChampionRank(rank: CardRank): rank is ChampionRank {
  return rank === "A" || rank === "3" || rank === "5";
}

function isRallied(kingdom: PlayingCard, champion: PlayingCard) {
  return kingdom.suit === champion.suit;
}

function isBattleReady(kingdom: PlayingCard, champion: PlayingCard) {
  return rankValue(kingdom) + rankValue(champion) === 7;
}

function moveCard<T>(cards: T[], from: number, to: number) {
  const next = [...cards];
  const [card] = next.splice(from, 1);
  next.splice(to, 0, card);
  return next;
}

function destroyedDefenses(defenses: PlayingCard[]) {
  return defenses.filter((defense) => !defense.faceUp);
}

function unlockedMorale(
  defenses: PlayingCard[],
  champion: PlayingCard | undefined,
) {
  if (!champion || !isChampionRank(champion.rank)) return [];

  return destroyedDefenses(defenses)
    .map((defense) => MORALE_BY_DEFENSE[rankValue(defense)])
    .filter(
      (boost): boost is { rank: ChampionRank; delta: -1 | 1 } =>
        boost !== undefined && boost.rank === champion.rank,
    );
}

function drawNextCommand(
  deck: number[],
  discard: number[],
  removed: number[],
) {
  let nextDeck = [...deck];
  let nextDiscard = [...discard];
  const nextRemoved = [...removed];

  if (nextDeck.length === 0 && nextDiscard.length > 0) {
    nextDeck = shuffle(nextDiscard);
    nextDiscard = [];
    const removedCommand = nextDeck.pop();
    if (removedCommand !== undefined) nextRemoved.push(removedCommand);
  }

  return {
    deck: nextDeck,
    discard: nextDiscard,
    removed: nextRemoved,
    active: nextDeck.pop() ?? null,
  };
}

export const castleSiegeRules = {
  commands: COMMANDS,
  moraleByDefense: MORALE_BY_DEFENSE,
  isRallied,
  isBattleReady,
  moveCard,
  destroyedDefenses,
  unlockedMorale,
  drawNextCommand,
};

export default function CastleSiege() {
  const { colorZone } = useGameColors(0.72);
  const [selectedChampion, setSelectedChampion] = useState<number | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<-1 | 0 | 1>(0);

  function clearSelection() {
    setSelectedChampion(null);
    setSelectedModifier(0);
  }

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial: initialState,
      resetNonGameStates: clearSelection,
      resetAndSetup: async () => {
        setGame((draft) => {
          Object.assign(draft, initialState);
        });

        await delay();

        setGame((draft) => {
          const deck = createDeck({ faceUp: true });
          draft.defenses = shuffle(
            deck.filter(
              (card) =>
                card.suit === "spades" &&
                rankValue(card) >= 2 &&
                rankValue(card) <= 7,
            ),
          );
          draft.kingdoms = shuffle(
            deck.filter(
              (card) =>
                isRealmSuit(card.suit) && [2, 4, 6].includes(rankValue(card)),
            ),
          );
          draft.champions = shuffle(
            deck.filter(
              (card) =>
                isRealmSuit(card.suit) && isChampionRank(card.rank),
            ),
          );

          const commandDeck = shuffle(COMMANDS.map((_, index) => index));
          draft.activeCommand = commandDeck.pop() ?? null;
          draft.commandDeck = commandDeck;
        });

        await delay(100);
      },
    });

  const activeCommand =
    game.activeCommand === null ? null : COMMANDS[game.activeCommand];
  const champion =
    selectedChampion === null ? undefined : game.champions[selectedChampion];
  const availableMorale = unlockedMorale(game.defenses, champion);
  const baseDistance =
    champion && activeCommand && isRealmSuit(champion.suit)
      ? activeCommand[champion.suit]
      : null;
  const moveDistance =
    baseDistance === null ? null : Math.max(0, baseDistance + selectedModifier);
  const destroyed = destroyedDefenses(game.defenses);
  const destroyedTotal = destroyed.reduce(
    (total, defense) => total + rankValue(defense),
    0,
  );

  function move(direction: -1 | 1) {
    if (
      game.ended ||
      selectedChampion === null ||
      moveDistance === null ||
      game.activeCommand === null
    ) {
      return;
    }

    const target = selectedChampion + moveDistance * direction;
    if (target < 0 || target >= game.champions.length) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.champions = moveCard(draft.champions, selectedChampion, target);
      draft.commandDiscard.push(draft.activeCommand!);
      draft.activeCommand = null;

      if (
        draft.kingdoms.every((kingdom, index) =>
          isRallied(kingdom, draft.champions[index]),
        )
      ) {
        draft.assaults += 1;
        const battleReady = draft.kingdoms.filter((kingdom, index) =>
          isBattleReady(kingdom, draft.champions[index]),
        ).length;
        const defense = draft.defenses.find(
          (card) => rankValue(card) === battleReady && card.faceUp,
        );
        if (defense) {
          const defenseIndex = draft.defenses.indexOf(defense);
          draft.defenses[defenseIndex] = flipToBack(defense);
        }
        draft.champions = flipAllToFace(shuffle(draft.champions));
      }

      const destroyedNow = destroyedDefenses(draft.defenses);
      if (destroyedNow.length >= 3) {
        draft.ended = true;
        draft.won = true;
        return;
      }

      const draw = drawNextCommand(
        draft.commandDeck,
        draft.commandDiscard,
        draft.removedCommands,
      );
      draft.commandDeck = draw.deck;
      draft.commandDiscard = draw.discard;
      draft.removedCommands = draw.removed;
      draft.activeCommand = draw.active;
      if (draw.active === null) {
        draft.ended = true;
        draft.won = false;
      }
    });
    clearSelection();
  }

  const defensePositions = [
    { col: 4, row: 0 },
    { col: 3.45, row: 1.02 },
    { col: 4.55, row: 1.02 },
    { col: 2.9, row: 2.04 },
    { col: 4, row: 2.04 },
    { col: 5.1, row: 2.04 },
  ];

  const zones: MapZone[] = useMemo(
    () => [
      ...game.defenses.map((defense, index) => ({
        id: `defense-${index}`,
        name: "defense",
        pileIndex: index,
        cards: [defense],
        ...defensePositions[index],
      })),
      {
        id: "kingdoms",
        name: "kingdom",
        cards: game.kingdoms,
        col: 0,
        row: 3.25,
        width: 9,
        fan: { direction: "right", offset: 1.04, center: false },
      },
      {
        id: "champions",
        name: "champion",
        cards: game.champions,
        col: 0,
        row: 4.42,
        width: 9,
        fan: { direction: "right", offset: 1.04, center: false },
      },
      {
        id: "command-panel",
        col: 0,
        row: 5.72,
        width: 9,
        height: 1.48,
        baseZIndex: 30,
      },
    ],
    [game.champions, game.defenses, game.kingdoms],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "kingdom") {
      const matchingChampion = game.champions[mappedCard.cardIndex];
      const rallied =
        matchingChampion && isRallied(mappedCard.card, matchingChampion);
      return rallied
        ? {
            isSelected: true,
            forceOverlayColor: true,
            selectColor: "green",
          }
        : { isDisabled: true };
    }

    if (mappedCard.zoneName === "champion") {
      const selected = mappedCard.cardIndex === selectedChampion;
      const ready = isBattleReady(
        game.kingdoms[mappedCard.cardIndex],
        mappedCard.card,
      );
      return {
        isSelected: selected || ready,
        forceOverlayColor: ready && !selected,
        selectColor: selected ? "blue" : "yellow",
        yOffset: selected ? -0.12 : 0,
        onPress: () => {
          setSelectedChampion(selected ? null : mappedCard.cardIndex);
          setSelectedModifier(0);
        },
      };
    }

    return { isDisabled: true };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 9.15,
    fixedRows: 7.35,
    paddingTop: 0.05,
    paddingBottom: 0.1,
  });

  const canMoveLeft =
    selectedChampion !== null &&
    moveDistance !== null &&
    selectedChampion - moveDistance >= 0;
  const canMoveRight =
    selectedChampion !== null &&
    moveDistance !== null &&
    selectedChampion + moveDistance < game.champions.length;
  const suitLabel = champion
    ? champion.suit.charAt(0).toUpperCase() + champion.suit.slice(1)
    : "Select a champion";

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={destroyedTotal}
      winLoseMessage={
        game.won
          ? `${destroyedTotal >= 12 ? "Advanced" : "Basic"} victory: ${destroyedTotal} defense points destroyed.`
          : "The final command was removed before the castle fell."
      }
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("command-panel"),
          flexStyles.colCentered,
          {
            gap: cardHeight * 0.06,
            padding: cardHeight * 0.08,
            borderRadius: cardHeight * 0.08,
            backgroundColor: colorZone,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { justifyContent: "space-between", minHeight: cardHeight * 0.28 },
          ]}
        >
          <Text size="xxs" color={Colors.K300}>
            Commands {game.commandDeck.length + (game.activeCommand === null ? 0 : 1)}
          </Text>
          <Text size="xs" weight={600} color={Colors.K100}>
            {activeCommand
              ? `H${activeCommand.hearts}  C${activeCommand.clubs}  D${activeCommand.diamonds}`
              : "No command"}
          </Text>
          <Text size="xxs" color={Colors.K300}>
            Defenses {destroyed.length}/3
          </Text>
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: cardHeight * 0.07 },
          ]}
        >
          <Button
            text="Left"
            size="xs"
            theme="blue"
            disabled={!canMoveLeft}
            onPress={() => move(-1)}
            style={[flexStyles.flex1]}
          />
          <View style={[flexStyles.colCentered, { flex: 1.5, minWidth: 0 }]}>
            <Text size="xxs" color={Colors.K200}>
              {suitLabel}{moveDistance === null ? "" : ` moves ${moveDistance}`}
            </Text>
            <View style={[flexStyles.rowCentered, { gap: cardHeight * 0.05 }]}>
              <Button
                text="Base"
                size="xxs"
                textOnly
                theme={selectedModifier === 0 ? Colors.brightYellow : Colors.K400}
                disabled={!champion}
                onPress={() => setSelectedModifier(0)}
              />
              {availableMorale.map((boost) => (
                <Button
                  key={boost.delta}
                  text={boost.delta > 0 ? "+1" : "-1"}
                  size="xxs"
                  textOnly
                  theme={
                    selectedModifier === boost.delta
                      ? Colors.brightYellow
                      : Colors.K400
                  }
                  onPress={() => setSelectedModifier(boost.delta)}
                />
              ))}
            </View>
          </View>
          <Button
            text="Right"
            size="xs"
            theme="blue"
            disabled={!canMoveRight}
            onPress={() => move(1)}
            style={[flexStyles.flex1]}
          />
        </View>

        <View
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: cardHeight * 0.08,
            borderWidth: 1,
            borderColor: rgba(Colors.white, 0.12),
          }}
        />
      </View>
    </GameWrapper>
  );
}