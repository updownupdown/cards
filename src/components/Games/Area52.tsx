import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "@/components/Cards/CardMap";
import { CardColor } from "@/components/Cards/CardStyles";
import { Text } from "@/components/common/Text";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  defaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isRed,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

const maxAttackersNum = 3;
const maxDefendersNum = 6;

type Wave = 1 | 2;

type GameState = {
  defenderDeck: PlayingCard[];
  currentDefenders: (PlayingCard | null)[];
  attackerDeck: PlayingCard[];
  discardDeck: PlayingCard[];
  currentAttackers: PlayingCard[];
  wave: Wave;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

// --- SETUP --- //
const gameStateInitial: GameState = {
  defenderDeck: [],
  currentDefenders: [],
  attackerDeck: [],
  discardDeck: createDeck(),
  currentAttackers: [],
  wave: 1,
  ended: false,
  won: false,
  winLoseMessage: "",
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.defenderDeck,
      ...draft.currentDefenders,
      ...draft.attackerDeck,
      ...draft.currentAttackers,
      ...draft.discardDeck,
    ].filter((card): card is PlayingCard => card !== null);

    draft.discardDeck = flipAllToBack(allCards);
    draft.defenderDeck = [];
    draft.currentDefenders = [];
    draft.attackerDeck = [];
    draft.currentAttackers = [];
  });

  await delay();

  setGame((draft) => {
    const draw = shuffle(draft.discardDeck);
    draft.defenderDeck = draw.filter((card) => !isRed(card.suit));
    draft.attackerDeck = draw.filter((card) => isRed(card.suit));
    draft.discardDeck = [];
    draft.wave = 1;
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
  });

  await delay();
}

export default function Area52() {
  const { spacing } = useResponsiveMetrics();
  const showToast = useToast();

  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedDefenders([]);
      },
    });

  async function startGame(gameState: GameState) {
    const stateFrame = await refillAttackers(gameState);
    await refillDefenders(stateFrame);
  }

  useEffect(() => {
    if (game.currentAttackers.length > 0 || game.currentDefenders.length > 0) {
      return;
    }

    startGame(game);
  }, [game.currentAttackers, game.attackerDeck]);

  const currentAttacker = useMemo(
    () => game.currentAttackers[game.currentAttackers.length - 1] ?? null,
    [game.currentAttackers],
  );

  const score = game.ended
    ? game.won
      ? game.defenderDeck.length + game.currentDefenders.length
      : -(game.attackerDeck.length + game.currentAttackers.length) -
        (game.wave === 1 ? 50 : 0)
    : undefined;

  const canAttack = useMemo(() => {
    if (selectedDefenders.length === 0 || !currentAttacker) return undefined;
    const enemyValue = rankValue(currentAttacker);

    if (selectedDefenders.length === 1) {
      const defender = game.currentDefenders[selectedDefenders[0]];
      if (!defender) return undefined;
      return (
        rankValue(defender) > enemyValue &&
        isRed(defender.suit) !== isRed(currentAttacker.suit)
      );
    } else {
      const sum = selectedDefenders.reduce(
        (acc, i) =>
          acc +
          (game.currentDefenders[i] ? rankValue(game.currentDefenders[i]!) : 0),
        0,
      );
      return sum === enemyValue;
    }
  }, [selectedDefenders, currentAttacker, game.currentDefenders]);

  // ========== Actions ========== //
  function toggleDefender(index: number) {
    setSelectedDefenders(
      produce((draft) => {
        const existingIdx = draft.indexOf(index);
        if (existingIdx !== -1) {
          draft.splice(existingIdx, 1); // Remove if exists
        } else if (draft.length < 2) {
          draft.push(index); // Add if there is room
        }
      }),
    );
  }

  async function applyAction(action: "dual" | "single" | "sacrifice") {
    if (!currentAttacker) return;

    saveUndoState(structuredClone(game));

    // 1. Calculate the combat outcome perfectly synchronously
    let gameState = produce(game, (draft) => {
      const activeEnemy = draft.currentAttackers.pop()!;
      const defs = draft.currentDefenders;
      const discard = draft.discardDeck;

      if (action === "single") {
        const [idx] = selectedDefenders;
        discard.push(flipToBack(defs[idx]!));
        defs[idx] = activeEnemy;
      } else if (action === "dual") {
        const [idx1, idx2] = selectedDefenders;
        const d1 = defs[idx1]!;
        const d2 = defs[idx2]!;

        discard.push(flipToBack(activeEnemy));

        if (draft.wave === 2) {
          const enemyIsRed = isRed(activeEnemy.suit);
          if (isRed(d1.suit) === enemyIsRed) {
            discard.push(flipToBack(d1));
            defs[idx1] = null;
          }
          if (isRed(d2.suit) === enemyIsRed) {
            discard.push(flipToBack(d2));
            defs[idx2] = null;
          }
        }
      } else if (action === "sacrifice") {
        const [idx] = selectedDefenders;
        discard.push(flipToBack(defs[idx]!));
        defs[idx] = null;
        draft.attackerDeck.unshift(flipToBack(activeEnemy));
      }

      draft.discardDeck = flipAllToBack(discard);
    });

    // 2. Apply it and wait for visual flight
    setGame(gameState);
    setSelectedDefenders([]);

    await delay();

    // 3. Pass the resulting state down the async pipeline
    gameState = await checkWaveTransition(gameState);

    if (!gameState.ended) {
      if (gameState.currentAttackers.length === 0) {
        gameState = await refillAttackers(gameState);
      }
      await refillDefenders(gameState);
    }
  }

  async function checkWaveTransition(gameState: GameState) {
    if (
      gameState.currentAttackers.length !== 0 ||
      gameState.ended ||
      gameState.attackerDeck.length !== 0
    ) {
      return gameState;
    }

    if (gameState.wave === 2) {
      const finalState = produce(gameState, (draft) => {
        draft.ended = true;
        draft.won = true;
      });
      setGame(finalState);
      return finalState;
    } else {
      showToast("Wave 2");
      let stateFrame = gameState;

      const zippedDiscard = [...stateFrame.discardDeck];
      const shuffled = shuffle([...zippedDiscard]);

      for (const card of shuffled) {
        stateFrame = produce(stateFrame, (draft) => {
          draft.discardDeck = draft.discardDeck.filter((c) => c.id !== card.id);
          draft.attackerDeck.push({ ...card, faceUp: false });
        });
        setGame(stateFrame);
        await delay(defaultAnimDuration / 2);
      }

      const wave2ReadyState = produce(stateFrame, (draft) => {
        draft.discardDeck = [];
        draft.attackerDeck = shuffled;
        draft.wave = 2;
      });
      setGame(wave2ReadyState);
      return wave2ReadyState;
    }
  }

  // ========== Refill Attackers ========== //
  async function refillAttackers(currentGameState: GameState) {
    let gameState = currentGameState;

    while (
      gameState.currentAttackers.length < maxAttackersNum &&
      gameState.attackerDeck.length > 0 &&
      !gameState.ended
    ) {
      await delay(defaultAnimDuration / 2);

      gameState = produce(gameState, (draft) => {
        const nextAttacker = draft.attackerDeck.pop()!;
        draft.currentAttackers.push(flipToFace(nextAttacker));
      });

      setGame(gameState);
    }

    return gameState;
  }

  // ========== Refill Defenders ========== //
  async function refillDefenders(currentGame: GameState) {
    let stateFrame = currentGame;

    // Refill defenders
    for (let i = 0; i < maxDefendersNum; i++) {
      if (
        !stateFrame.currentDefenders[i] &&
        stateFrame.defenderDeck.length > 0
      ) {
        stateFrame = produce(stateFrame, (draft) => {
          const nextDefender = draft.defenderDeck.pop()!;
          draft.currentDefenders[i] = flipToFace(nextDefender);
        });
        setGame(stateFrame);
        await delay(defaultAnimDuration / 2);
      }
    }

    return stateFrame;
  }

  // Check lose condition
  useEffect(() => {
    if (game.ended) return;

    const hasAttackers = game.currentAttackers.length > 0;
    const hasDefenders = game.currentDefenders.some((d) => d !== null);
    const hasAttackerDeck = game.attackerDeck.length > 0;

    if (hasAttackers && !hasDefenders && !hasAttackerDeck) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = "You have no cards left to play!";
      });
    }
  }, [game]);

  // ========== Card Map ========== //
  const zones: MapZone[] = useMemo(() => {
    const zoneGap = 0.2;
    const rowOffset = 1.3;

    const attackers: MapZone[] = Array.from({ length: 3 }, (_, i) => ({
      id: `attacker-${i}`,
      refIndex: i,
      name: "attacker",
      cards: game.currentAttackers[i] ? [game.currentAttackers[i]] : undefined,

      col: i + 1 + zoneGap,
      row: 0,
      baseZIndex: 10 + i,
      placeholder: {},
    }));
    const defenders: MapZone[] = getGridColRows({
      cols: 3,
      rows: 2,
      colOffset: 1.2,
      rowOffset: 1.6,
    }).map((pos, i) => ({
      id: `defender-${i}`,
      refIndex: i,
      cards: game.currentDefenders[i] ? [game.currentDefenders[i]] : undefined,
      name: "defender",

      col: pos.c,
      row: pos.r,
      baseZIndex: 10 + pos.c,
      placeholder: {},
    }));

    return [
      {
        id: "attackerDeck",

        cards: game.attackerDeck,
        col: 0,
        row: rowOffset * 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Atks", infoPos: "above" },
      },
      ...attackers,
      {
        id: "discardDeck",
        cards: game.discardDeck,

        col: 0,
        row: rowOffset * 1,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Dscrd", infoPos: "above" },
      },
      {
        id: "defenderDeck",
        cards: game.defenderDeck,

        col: 0,
        row: rowOffset * 2,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Defs", infoPos: "above" },
      },
      ...defenders,
      {
        id: "buttons",

        col: 0,
        row: 3.75,
        width: "full",
        height: 0.6,
        baseZIndex: 10,
      },
    ];
  }, [game, selectedDefenders, canAttack]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    // Attacker logic
    if (mappedCard.zoneName === "attacker") {
      const isCurrent = mappedCard.card.id === currentAttacker.id;

      return {
        selectColor: isCurrent ? "red" : "none",
        forceSelectColor: isCurrent,
        forceOverlayColor: isCurrent,
        yOffset: isCurrent ? 0.15 : 0,
      };
    }

    // Defender Logic
    if (mappedCard.zoneName === "defender") {
      const isSelected =
        mappedCard.refIndex !== undefined &&
        selectedDefenders.includes(mappedCard.refIndex);
      let selectColor: CardColor = "none";
      if (isSelected) {
        selectColor =
          selectedDefenders.length === 2
            ? canAttack
              ? "purple"
              : "orange"
            : canAttack
              ? "green"
              : "red";
      } else if (canAttack !== undefined && !isSelected) {
        selectColor = "blue";
      }

      return {
        selectColor,
        isSelected,
        onPress: () => {
          const dIndex = game.currentDefenders.findIndex(
            (d) => d?.id === mappedCard.card.id,
          );
          if (dIndex !== -1) toggleDefender(dIndex);
        },
      };
    }
  };

  const { cardMap, getZoneBasePos, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
    paddingTop: 0.6,
  });

  const aTitlePos = getZoneBasePos(zones.find((z) => z.id === "attacker-1")!);
  const dTitlePos = getZoneBasePos(zones.find((z) => z.id === "defender-1")!);

  return (
    <GameWrapper
      tipPhase={selectedDefenders.length === 0 ? "select" : "act"}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
      score={`${score} (${game.won ? "higher is better" : "closer to zero is better"})`}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* Titles */}
      <Text
        size="sm"
        weight={300}
        textTransform="uppercase"
        style={[
          {
            position: "absolute",
            top: aTitlePos.y - 30,
            left: aTitlePos.x - 20,
          },
        ]}
      >
        Attackers (Wave {game.wave})
      </Text>
      <Text
        textTransform="uppercase"
        size="sm"
        weight={300}
        style={[
          {
            position: "absolute",
            top: dTitlePos.y - 30,
            left: dTitlePos.x + 10,
          },
        ]}
      >
        Defenders
      </Text>

      {/* Buttons */}
      <View
        style={[
          getZoneStylesById("buttons"),
          flexStyles.rowCentered,
          { gap: spacing(10) },
        ]}
      >
        <Button
          onPress={() => applyAction("sacrifice")}
          text="Sacrifice"
          size="lg"
          disabled={selectedDefenders.length !== 1}
          theme="red"
        />

        <Button
          onPress={() =>
            applyAction(selectedDefenders.length === 2 ? "dual" : "single")
          }
          text={`Attack${selectedDefenders.length === 2 ? " x2" : ""}`}
          size="lg"
          disabled={!canAttack || selectedDefenders.length < 1}
          theme={selectedDefenders.length === 2 ? "purple" : "green"}
          style={[flexStyles.flex1]}
        />
      </View>
    </GameWrapper>
  );
}
