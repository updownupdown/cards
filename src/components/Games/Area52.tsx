import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { Button } from "../Button/Button";
import { Card, CardGrid, CardSelectColor } from "../Cards/Card";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck, deckCountAboveBelowHeight, minFanSize } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const animDuration = 400;
const cardsPerRow = 4.2;
const maxAttackersNum = 3;

type AnimPos = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

type AreaState = {
  defenderDeck: PlayingCard[];
  currentDefenders: (PlayingCard | null)[];
  attackerDeck: PlayingCard[];
  discardDeck: PlayingCard[];
  currentAttackers: PlayingCard[];
  wave: 1 | 2;
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: AreaState;
};

type Action = "dual" | "single" | "sacrifice";

function setup(): AreaState {
  const all = shuffle(createDeck({ faceUp: true }));
  const defenders = all.filter((card) => !isRed(card.suit));
  const aliens = all.filter((card) => isRed(card.suit));

  return {
    defenderDeck: defenders.slice(6),
    currentDefenders: defenders.slice(0, 6),
    attackerDeck: aliens,
    discardDeck: [],
    currentAttackers: [],
    wave: 1,
    ended: false,
    won: false,
  };
}

function getNextAttacker(state: AreaState): {
  nextCard: PlayingCard | null;
  newState: AreaState;
} {
  if (state.ended) return { nextCard: null, newState: state };

  let attackerDeck = [...state.attackerDeck];

  if (attackerDeck.length === 0) {
    return {
      nextCard: null,
      newState: state,
    };
  }

  const nextCard = attackerDeck.shift()!;
  return {
    nextCard,
    newState: {
      ...state,
      attackerDeck,
    },
  };
}

function ensureQueue(state: AreaState): AreaState {
  if (state.currentAttackers.length > 0 || state.ended) return state;

  let curr = state;

  while (curr.currentAttackers.length < maxAttackersNum && !curr.ended) {
    const { nextCard, newState } = getNextAttacker(curr);
    if (!nextCard) {
      curr = newState;
      break;
    }
    curr = {
      ...newState,
      currentAttackers: [...newState.currentAttackers, nextCard],
    };
  }
  return curr;
}

function calcLoseScore(state: AreaState) {
  const remainingAliens =
    state.attackerDeck.length + state.currentAttackers.length;
  const base = -remainingAliens;
  return state.wave === 1 ? base - 50 : base;
}

function calcWinScore(state: AreaState) {
  return state.defenderDeck.length + state.currentDefenders.length;
}

const buildAnim = (
  card: PlayingCard,
  cardsPerRow: number,
  from: AnimPos,
  to: AnimPos,
  duration = animDuration,
  delay = 0,
  flip?: "toFace" | "toBack",
  keepAlive = true,
): CardAnimationParams | null => {
  if (!from || !to) return null;

  return {
    card,
    cardsPerRow,
    from,
    to,
    duration,
    delay,
    flip,
    keepAlive,
  };
};

export default function Area52() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<AreaState>(() => ensureQueue(setup()));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);
  const showToast = useToast();

  const { animateCards, clearAnimations, isAnimating, animatingCardIds } =
    useAnimations();

  const { getLayout, setRef } = useLayoutManager([
    "attackerTop",
    "attackerNext",
    "defenderDeck",
    "attackers",
    "defenders",
    "discardDeck",
  ]);

  const currentAttacker =
    game.currentAttackers[game.currentAttackers.length - 1] ?? null;
  const score = useMemo(() => {
    if (!game.ended) return undefined;
    return game.won ? calcWinScore(game) : calcLoseScore(game);
  }, [game]);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  function reset() {
    clearHistory();
    clearAnimations();
    setSelectedDefenders([]);
    setGame(ensureQueue(setup()));
  }

  function toggleDefender(index: number) {
    if (game.ended || isAnimating) return;

    setSelectedDefenders((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= 2) return prev;
      return [...prev, index];
    });
  }

  const processSpecificAction = async (
    action: Action,
    attackerIndex: number,
    attacker: PlayingCard,
    defenders: (PlayingCard | null)[],
    discardDeck: PlayingCard[],
    attackerDeck: PlayingCard[],
    anims: CardAnimationParams[],
  ) => {
    saveUndoState(structuredClone({ game }));

    const addAnim = (anim: CardAnimationParams | null | undefined) => {
      if (anim) anims.push(anim);
    };

    if (action === "dual") {
      if (selectedDefenders.length !== 2) return false;
      const [aIdx, bIdx] = selectedDefenders;
      const a = defenders[aIdx];
      const b = defenders[bIdx];
      if (!a || !b) return false;

      const sum = RANK_VALUE[a.rank] + RANK_VALUE[b.rank];
      if (sum !== RANK_VALUE[attacker.rank]) return false;

      discardDeck.push(attacker);
      const attackerPos = getLayout("attackers", attackerIndex);
      const discardDeckPos = getLayout("discardDeck");
      addAnim(
        buildAnim(
          attacker,
          cardsPerRow,
          attackerPos ?? null,
          discardDeckPos ?? null,
          undefined,
          undefined,
          "toBack",
          false,
        ),
      );

      if (game.wave === 2) {
        const attackerIsRed = isRed(attacker.suit);

        if (isRed(a.suit) === attackerIsRed) {
          discardDeck.push(a);
          (defenders as any)[aIdx] = null;
          const posA = getLayout("defenders", aIdx);
          addAnim(
            buildAnim(
              a,
              cardsPerRow,
              posA ?? null,
              discardDeckPos ?? null,
              undefined,
              undefined,
              "toBack",
            ),
          );
        }

        if (isRed(b.suit) === attackerIsRed) {
          discardDeck.push(b);
          (defenders as any)[bIdx] = null;
          const posB = getLayout("attackers", bIdx);
          if (posB && discardDeckPos) {
            addAnim(
              buildAnim(
                b,
                cardsPerRow,
                posB ?? null,
                discardDeckPos ?? null,
                undefined,
                undefined,
                "toBack",
              ),
            );
          }
        }
      }
      return true;
    } else if (action === "single") {
      if (selectedDefenders.length !== 1) return false;
      const [index] = selectedDefenders;
      const defender = defenders[index];
      if (!defender) return false;

      const valid =
        RANK_VALUE[defender.rank] > RANK_VALUE[attacker.rank] &&
        isRed(defender.suit) !== isRed(attacker.suit);
      if (!valid) return false;

      discardDeck.push(defender);
      defenders[index] = attacker;

      const attackerPos = getLayout("attackers", attackerIndex);
      const defenderPos = getLayout("defenders", index);
      const discardDeckPos = getLayout("discardDeck");

      if (defenderPos && discardDeckPos) {
        addAnim(
          buildAnim(
            defender,
            cardsPerRow,
            defenderPos ?? null,
            discardDeckPos ?? null,
            undefined,
            undefined,
            "toBack",
          ),
        );
      }

      if (attackerPos && defenderPos) {
        addAnim(
          buildAnim(
            attacker,
            cardsPerRow,
            attackerPos ?? null,
            defenderPos ?? null,
          ),
        );
      }
      return true;
    } else if (action === "sacrifice") {
      if (selectedDefenders.length !== 1) return false;
      const [index] = selectedDefenders;
      if (!defenders[index]) return false;

      discardDeck.push(defenders[index]);
      const defPos = getLayout("defenders", index);
      const discardDeckPos = getLayout("discardDeck");

      if (defPos && discardDeckPos) {
        addAnim(
          buildAnim(
            defenders[index],
            cardsPerRow,
            defPos ?? null,
            discardDeckPos ?? null,
            undefined,
            undefined,
            "toBack",
          ),
        );
      }

      (defenders as any)[index] = null;
      attackerDeck.push(attacker);
      const attackerPos = getLayout("attackers", attackerIndex);
      const attackerDeckPos = getLayout("attackerTop");

      if (attackerPos && attackerDeckPos) {
        addAnim(
          buildAnim(
            attacker,
            cardsPerRow,
            attackerPos ?? null,
            attackerDeckPos ?? null,
            undefined,
            undefined,
            "toBack",
          ),
        );
      }
      return true;
    }

    return false;
  };

  const checkWaveTransition = async (nextState: AreaState) => {
    if (nextState.currentAttackers.length === 0 && !nextState.ended) {
      if (nextState.attackerDeck.length === 0) {
        if (nextState.wave === 2) {
          nextState = { ...nextState, ended: true, won: true };
          setGame(nextState);
        } else {
          showToast("Wave 2");

          let cardsToMove = shuffle([...nextState.discardDeck]);
          let animatedDiscardDeck = [...nextState.discardDeck];
          let animatedAttackerDeck = [...nextState.attackerDeck];

          for (let i = 0; i < cardsToMove.length; i++) {
            const card = cardsToMove[i];
            animatedDiscardDeck.pop();
            animatedAttackerDeck.push(card);

            const discardDeckPos = getLayout("discardDeck");
            const attackerDeckPos = getLayout("attackerNext");

            const transAnim = buildAnim(
              { ...card, faceUp: false },
              cardsPerRow,
              discardDeckPos ?? null,
              attackerDeckPos ?? null,
              50,
              0,
              undefined,
              false,
            );

            if (transAnim) {
              await animateCards([transAnim]);
            }

            setGame({
              ...nextState,
              discardDeck: [...animatedDiscardDeck],
              attackerDeck: [...animatedAttackerDeck],
            });
          }

          nextState = {
            ...nextState,
            discardDeck: [],
            attackerDeck: cardsToMove,
            wave: nextState.wave === 1 ? 2 : nextState.wave,
          };
          setGame(nextState);
        }
      }
    }

    return nextState;
  };

  const processAttackerRefill = async (nextState: AreaState) => {
    if (nextState.currentAttackers.length === 0 && !nextState.ended) {
      for (let i = 0; i < maxAttackersNum; i++) {
        const { nextCard, newState } = getNextAttacker(nextState);
        if (!nextCard) {
          nextState = newState;
          break;
        }

        nextState = {
          ...newState,
          currentAttackers: [...newState.currentAttackers, nextCard],
        };

        const attackerDeckPos = getLayout("attackerTop");
        const toPos = getLayout("attackers", i);
        const anim = buildAnim(
          nextCard,
          cardsPerRow,
          attackerDeckPos ?? null,
          toPos ?? null,
          animDuration,
          0,
          "toFace",
          true,
        );

        if (anim) {
          await animateCards([anim]);
        }

        setGame(nextState);
      }
    }
    return nextState;
  };

  const processDefenderRefill = async (nextState: AreaState) => {
    let updatedDefenders = [...nextState.currentDefenders];
    let updatedDefenderDeck = [...nextState.defenderDeck];
    let anims: CardAnimationParams[] = [];
    let delayCount = 0;

    for (let i = 0; i < updatedDefenders.length; i++) {
      if (!updatedDefenders[i]) {
        const next = updatedDefenderDeck.shift();
        if (next) {
          updatedDefenders[i] = next;
          const defenderDeckPos = getLayout("defenderDeck");
          const targetPos = getLayout("defenders", i);

          if (defenderDeckPos && targetPos) {
            const anim = buildAnim(
              next,
              cardsPerRow,
              defenderDeckPos ?? null,
              targetPos ?? null,
              animDuration,
              delayCount * animDuration - 100 * delayCount,
              "toFace",
            );
            if (anim) anims.push(anim);
            delayCount += 1;
          }
        }
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    nextState.currentDefenders = updatedDefenders.filter(
      Boolean,
    ) as PlayingCard[];
    nextState.defenderDeck = updatedDefenderDeck;

    if (nextState.currentDefenders.length === 0) {
      nextState.ended = true;
      nextState.won = false;
    }

    return nextState;
  };

  async function applyAction(action: Action) {
    if (!currentAttacker || game.ended || isAnimating) return;

    const attackerIndex = game.currentAttackers.length - 1;
    const attacker = game.currentAttackers[attackerIndex];
    const defenders = [...game.currentDefenders];
    let attackerDeck = [...game.attackerDeck];
    let discardDeck = [...game.discardDeck];
    let anims: CardAnimationParams[] = [];

    const isActionValid = await processSpecificAction(
      action,
      attackerIndex,
      attacker,
      defenders,
      discardDeck,
      attackerDeck,
      anims,
    );

    if (!isActionValid) {
      return;
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setSelectedDefenders([]);

    let nextState = {
      ...game,
      currentDefenders: defenders,
      attackerDeck,
      discardDeck,
    };

    let currentAttackers = [...game.currentAttackers];
    currentAttackers.pop();
    nextState.currentAttackers = currentAttackers;

    setGame(nextState);

    nextState = await checkWaveTransition(nextState);

    if (!nextState.ended) {
      nextState = await processAttackerRefill(nextState);
      nextState = await processDefenderRefill(nextState);
    }

    setGame(nextState);
    setSelectedDefenders([]);
  }

  const canAttack = useMemo(() => {
    if (selectedDefenders.length === 0) return undefined;

    const enemy = game.currentAttackers[game.currentAttackers.length - 1];
    if (!enemy) return undefined;

    const enemyValue = RANK_VALUE[enemy.rank];

    if (selectedDefenders.length === 1) {
      const defender = game.currentDefenders[selectedDefenders[0]];
      if (!defender) return undefined;

      const defenderValue = RANK_VALUE[defender.rank];
      const oppositeColor = isRed(defender.suit) !== isRed(enemy.suit);

      return defenderValue > enemyValue && oppositeColor;
    } else {
      let defenderValue = 0;

      for (const index of selectedDefenders) {
        const d = game.currentDefenders[index];
        if (d) {
          defenderValue += RANK_VALUE[d.rank];
        }
      }

      return defenderValue === enemyValue;
    }
  }, [selectedDefenders, game.currentAttackers, game.currentDefenders]);

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={`${score} (${game.won ? "higher is better" : "closer to zero is better"})`}
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceBetween,
          flexStyles.flex1,
          flexStyles.gap20,
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            flexStyles.fullWidth,
            { marginVertical: "auto", position: "relative", zIndex: 2 },
          ]}
        >
          {/* Piles Col */}
          <View style={[flexStyles.colCentered, flexStyles.gap20]}>
            <Deck
              // title="Attackers"
              refNext={setRef("attackerNext")}
              refTop={setRef("attackerTop")}
              backCount={game.attackerDeck.length}
              showCount
              countPosition="above"
              fan="verticalDown"
              limitFan
              cardsPerRow={cardsPerRow}
            />

            <Deck
              // title="Discard"
              refNext={setRef("discardDeck")}
              backCount={game.discardDeck.length}
              showCount
              countPosition="above"
              fan="verticalDown"
              limitFan
              cardsPerRow={cardsPerRow}
              iconName="delete"
            />

            <Deck
              // title="Defenders"
              refNext={setRef("defenderDeck")}
              backCount={game.defenderDeck.length}
              showCount
              countPosition="above"
              fan="verticalDown"
              limitFan
              cardsPerRow={cardsPerRow}
            />
          </View>

          {/* Cards Col */}
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.spaceBetween,
              { height: "100%", position: "relative", zIndex: 1 },
            ]}
          >
            <View style={[styles.section]}>
              <View style={[styles.sectionTitleWrap]}>
                <Text style={styles.sectionTitle}>
                  Attackers (Wave {game.wave})
                </Text>
              </View>

              <CardGrid
                cardsPerRow={cardsPerRow}
                targetGridCols={maxAttackersNum}
              >
                {Array.from({ length: maxAttackersNum }, (_, idx) => {
                  const card: PlayingCard | undefined =
                    game.currentAttackers[idx];
                  const isCurrentAttacker =
                    !isAnimating && idx === game.currentAttackers.length - 1;

                  const animatingCard =
                    card && animatingCardIds.includes(card.id);

                  return (
                    <Card
                      key={`attacker-${idx}`}
                      ref={setRef("attackers", idx)}
                      card={card}
                      isPlaceholder={!card || animatingCard}
                      cardsPerRow={cardsPerRow}
                      selectColor={animatingCard ? "none" : "red"}
                      forceOverlay={animatingCard ? false : isCurrentAttacker}
                      forceSelectColor={
                        animatingCard ? false : isCurrentAttacker
                      }
                    />
                  );
                })}
              </CardGrid>
            </View>

            <View style={[styles.section]}>
              <View style={[styles.sectionTitleWrap]}>
                <Text style={styles.sectionTitle}>Defenders</Text>
              </View>
              <CardGrid cardsPerRow={cardsPerRow} targetGridCols={3}>
                {game.currentDefenders.map((card, index) => {
                  const isSelected = selectedDefenders.includes(index);

                  const isAnimatingCardToPile = !!(
                    card && animatingCardIds.includes(card.id)
                  );

                  const selectedColor = (): CardSelectColor => {
                    if (isAnimatingCardToPile) {
                      return "none";
                    } else if (!isSelected || canAttack === undefined) {
                      return "blue";
                    } else if (selectedDefenders.length === 2) {
                      return canAttack ? "purple" : "orange";
                    } else {
                      return canAttack ? "green" : "red";
                    }
                  };

                  return (
                    <CardButton
                      key={`defender-hand-${index}`}
                      ref={setRef("defenders", index)}
                      onPress={
                        isAnimating ? undefined : () => toggleDefender(index)
                      }
                      card={card}
                      cardsPerRow={cardsPerRow}
                      isSelected={isAnimatingCardToPile ? false : isSelected}
                      selectColor={selectedColor()}
                      isPlaceholder={!card || isAnimatingCardToPile}
                    />
                  );
                })}
              </CardGrid>
            </View>
          </View>
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
            flexStyles.gap12,
          ]}
        >
          <Button
            onPress={() => applyAction("sacrifice")}
            text="Sacrifice"
            size="large"
            disabled={selectedDefenders.length !== 1 || isAnimating}
            theme="red"
          />
          <Button
            onPress={() => {
              if (selectedDefenders.length === 1) {
                applyAction("single");
              } else if (selectedDefenders.length === 2) {
                applyAction("dual");
              }
            }}
            text={`Attack${selectedDefenders.length === 2 ? " x2" : ""}`}
            size="large"
            style={[flexStyles.flex1]}
            disabled={!canAttack || selectedDefenders.length < 1 || isAnimating}
            theme={selectedDefenders.length === 2 ? "purple" : "green"}
          />
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  section: {
    ...flexStyles.colCentered,
  },
  sectionTitleWrap: {
    ...flexStyles.colCentered,
    minHeight: deckCountAboveBelowHeight + minFanSize * 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FontWeight[300],
    color: Colors.K200,
  },
  defenderAttackerRow: {
    ...flexStyles.rowCentered,
    ...flexStyles.fullWidth,
    ...flexStyles.spaceBetween,
    alignItems: "flex-start",
  },
});
