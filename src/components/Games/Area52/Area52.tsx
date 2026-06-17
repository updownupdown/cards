import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useZoneLayout } from "@/hooks/useZoneLayout";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "../../Button/Button";
import { AnimatedCard } from "../../Cards/AnimatedCard";
import { CardSelectColor } from "../../Cards/CardOLD";
import { CardPositionBuilder } from "../../Cards/CardPositionBuilder";
import { ZoneBackgrounds } from "../../Cards/ZoneBackgrounds";
import {
  cardDims,
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
  layoutZones,
  maxAttackersNum,
  maxDefendersNum,
  setup,
} from "./Area52Setup";
import { ZoneVisualizer } from "@/components/Cards/ZoneVisualizer";

export default function Area52() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const showToast = useToast();
  const { saveUndoState, undo, canUndo, clearHistory } = useUndoHistory<{
    game: GameState;
  }>();

  const [game, setGame] = useState<GameState>(setup(true));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    paddingBottomPc: cardDims.layoutPadding + 0.25 + 0.5,
  });

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

  const {
    cardWidth,
    cardHeight,
    getCardPosition,
    getZoneBasePos,
    layoutMetrics,
  } = layoutManager;

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

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    return new CardPositionBuilder(getCardPosition)
      .addDeck(game.attackerDeck, "attackerDeck")
      .addDeck(game.discardDeck, "discardDeck")
      .addDeck(game.defenderDeck, "defenderDeck")
      .addCollection(game.currentAttackers, "attacker", 0, (_, i) => ({
        type: "attacker",
        attackerIndex: i,
      }))
      .addCollection(game.currentDefenders, "defender", 0, (_, i) => ({
        type: "defender",
        defenderIndex: i,
      }))
      .build();
  }, [game, selectedDefenders, canAttack, getCardPosition]);

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

  const aTitlePos = getZoneBasePos(
    layoutZones.find((z) => z.id === "attacker-1")!,
  );
  const dTitlePos = getZoneBasePos(
    layoutZones.find((z) => z.id === "defender-1")!,
  );

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
      <ZoneBackgrounds layoutManager={layoutManager} game={game} />

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

      {Object.values(cardPositions).map((target) => {
        let selectColor: CardSelectColor = "none";
        let isSelected = undefined;
        let isCurrent = undefined;
        let yOffset = 0;
        let forceOverlay = false;
        let forceSelectColor = false;

        // Attacker logic
        if (target.misc?.type === "attacker") {
          isCurrent = target.card.id === currentAttacker.id;
          selectColor = isCurrent ? "red" : "none";
          forceSelectColor = isCurrent;
          forceOverlay = isCurrent;
          yOffset = isCurrent ? 0.15 * cardHeight : 0;
        }

        // Defender Logic
        if (target.misc?.type === "defender") {
          isSelected = selectedDefenders.includes(target.misc?.defenderIndex);
          selectColor = "none";
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
        }

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onPress={() => {
              const dIndex = game.currentDefenders.findIndex(
                (d) => d?.id === target.card.id,
              );
              if (dIndex !== -1) toggleDefender(dIndex);
            }}
            isSelected={isSelected}
            yOffset={yOffset}
            selectColor={selectColor}
            forceOverlay={forceOverlay}
            forceSelectColor={forceSelectColor}
            isVisible={!target.isHiddenUnderDeck}
          />
        );
      })}

      {/* Buttons */}
      <View
        style={[
          {
            position: "absolute",
            zIndex: 100,
            left: layoutMetrics.startX,
            width: layoutMetrics.gridWidthPadded,
            top:
              layoutMetrics.startY +
              layoutMetrics.gridHeightPadded +
              cardHeight * 0.35,
            height: cardHeight * 0.5,
            gap: layoutMetrics.gridGap,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <Button
          onPress={() => applyAction("sacrifice")}
          text="Sacrifice"
          size="large"
          disabled={selectedDefenders.length !== 1}
          theme="red"
          style={[{ height: "100%" }]}
        />
        <Button
          onPress={() =>
            applyAction(selectedDefenders.length === 2 ? "dual" : "single")
          }
          text={`Attack${selectedDefenders.length === 2 ? " x2" : ""}`}
          size="large"
          disabled={!canAttack || selectedDefenders.length < 1}
          theme={selectedDefenders.length === 2 ? "purple" : "green"}
          style={[flexStyles.flex1, { height: "100%" }]}
        />
      </View>
    </GameWrapper>
  );
}
