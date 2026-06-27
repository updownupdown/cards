import { Text } from "@/components/common/Text";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "@/components/Cards/CardMap";
import { CardColor } from "@/components/Cards/CardStyles";
import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../../Button/Button";
import { AnimatedCardMapping } from "../../Cards/AnimatedCard";
import {
  flipAllToBack,
  flipToBack,
  flipToFace,
  isRed,
  rankValue,
  shuffle,
} from "../../Cards/card-utils";
import { GameWrapper } from "../../common/GameWrapper";
import { useToast } from "../../common/Toast";
import {
  GameState,
  maxAttackersNum,
  maxDefendersNum,
  setup,
} from "./Area52Setup";

export default function Area52() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const showToast = useToast();
  const { saveUndoState, undo, canUndo, clearHistory } = useUndoHistory<{
    game: GameState;
  }>();

  const [game, setGame] = useState<GameState>(setup(true));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);

  async function startGame(gameState: GameState) {
    const stateFrame = await refillAttackers(gameState);
    await refillDefenders(stateFrame);
  }

  useEffect(() => {
    if (showIntro === false) startGame(game);
  }, [showIntro]);

  useEffect(() => {
    if (showIntro === false) {
      setGame((prev) => ({ ...prev, started: true }));
    }
  }, [showIntro]);

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

    saveUndoState(structuredClone({ game }));

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
    await delay(400);

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
        await delay(60);
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
      await delay(150);

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
        await delay(150);
      }
    }

    // Check lose condition
    if (stateFrame.currentDefenders.filter(Boolean).length === 0) {
      stateFrame = produce(stateFrame, (draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = "No more defenders left!";
      });
      setGame(stateFrame);
    }

    return stateFrame;
  }

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
        placeholder: { show: true, text: "Atks", infoPos: "above" },
      },
      ...attackers,
      {
        id: "discardDeck",
        cards: game.discardDeck,

        col: 0,
        row: rowOffset * 1,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { show: true, text: "Dscrd", infoPos: "above" },
      },
      {
        id: "defenderDeck",
        cards: game.defenderDeck,

        col: 0,
        row: rowOffset * 2,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { show: true, text: "Defs", infoPos: "above" },
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
      const isSelected = !!(
        mappedCard.refIndex && selectedDefenders.includes(mappedCard.refIndex)
      );
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

  const { cardMap, cardWidth, getZoneBasePos, getZoneStylesById } = useCardMap({
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
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={() => {
        clearHistory();
        setSelectedDefenders([]);
        const gameSetup = setup();
        setGame(gameSetup);
        startGame(gameSetup);
      }}
      isLoaded={isLoaded}
      score={`${score} (${game.won ? "higher is better" : "closer to zero is better"})`}
      canUndo={canUndo}
      handleUndo={() => {
        const p = undo();
        if (p) {
          setGame(p.game);
          setSelectedDefenders([]);
        }
      }}
    >
      {cardMap}

      {/* Titles */}
      <Text
        style={[
          textStyles.caps,
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
        style={[
          textStyles.caps,
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
          flexStyles.gap10,
        ]}
      >
        <Button
          onPress={() => applyAction("sacrifice")}
          text="Sacrifice"
          size="medium"
          disabled={selectedDefenders.length !== 1}
          theme="red"
          style={[{ height: "100%" }]}
        />
        <Button
          onPress={() =>
            applyAction(selectedDefenders.length === 2 ? "dual" : "single")
          }
          text={`Attack${selectedDefenders.length === 2 ? " x2" : ""}`}
          size="medium"
          disabled={!canAttack || selectedDefenders.length < 1}
          theme={selectedDefenders.length === 2 ? "purple" : "green"}
          style={[flexStyles.flex1, { height: "100%" }]}
        />
      </View>
    </GameWrapper>
  );
}
