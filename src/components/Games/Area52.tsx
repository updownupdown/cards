import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  AnimCardInfo,
  CardAnimationParams,
  useAnimations,
} from "../Animations/Animations";
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
  idPrefix: string,
  card: AnimCardInfo,
  from: AnimPos,
  to: AnimPos,
  duration = animDuration,
  delay = 0,
  flip?: "toFace" | "toBack",
  keepAlive = true,
): CardAnimationParams | null => {
  if (!from || !to) return null;

  return {
    id: `${idPrefix}-${Date.now()}`,
    cardInfo: {
      rank: card.rank,
      suit: card.suit,
      isBack: card.isBack,
      cardsPerRow,
    },
    from,
    to,
    duration,
    delay,
    flip,
    keepAlive,
  };
};

export default function Area52() {
  const isLoaded = useGameLoading();
  const [game, setGame] = useState<AreaState>(() => ensureQueue(setup()));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);
  const showToast = useToast();

  const {
    animateCards,
    clearAnimations,
    measureRef,
    isAnimating,
    setIsAnimating,
  } = useAnimations();

  const attackerDeckCurrentRef = useRef<View>(null);
  const attackerDeckNextRef = useRef<View>(null);
  const discardDeckRef = useRef<View>(null);
  const defenderDeckRef = useRef<View>(null);
  const attackerRefs = useRef<(View | null)[]>([]);
  const defenderRefs = useRef<(View | null)[]>([]);

  const currentAttacker =
    game.currentAttackers[game.currentAttackers.length - 1] ?? null;
  const score = useMemo(() => {
    if (!game.ended) return undefined;
    return game.won ? calcWinScore(game) : calcLoseScore(game);
  }, [game]);

  function reset() {
    setIsAnimating(false);
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

  async function applyAction(action: Action) {
    if (!currentAttacker || game.ended || isAnimating) return;

    const prev = game;
    const attackerIndex = prev.currentAttackers.length - 1;
    const attacker = prev.currentAttackers[attackerIndex];
    const defenders = [...prev.currentDefenders];
    let attackerDeck = [...prev.attackerDeck];
    let discardDeck = [...prev.discardDeck];

    let anims: CardAnimationParams[] = [];

    // Helper to push animations safely
    const addAnim = (anim: CardAnimationParams | null | undefined) => {
      if (anim) anims.push(anim);
    };

    const getAttackerPos = async (idx: number) =>
      await measureRef({ current: attackerRefs.current[idx] });
    const getDefenderPos = async (idx: number) =>
      await measureRef({ current: defenderRefs.current[idx] });

    if (action === "dual") {
      if (selectedDefenders.length !== 2) {
        return;
      }
      const [aIdx, bIdx] = selectedDefenders;
      const a = defenders[aIdx];
      const b = defenders[bIdx];
      if (!a || !b) {
        return;
      }

      const sum = RANK_VALUE[a.rank] + RANK_VALUE[b.rank];
      if (sum !== RANK_VALUE[attacker.rank]) {
        return;
      }

      discardDeck.push(attacker);
      const attackerPos = await getAttackerPos(attackerIndex);
      const discardDeckPos = await measureRef(discardDeckRef);
      addAnim(
        buildAnim(
          "dual-attacker",
          attacker,
          attackerPos,
          discardDeckPos,
          undefined,
          undefined,
          "toBack",
          false,
        ),
      );

      if (prev.wave === 2) {
        const attackerIsRed = isRed(attacker.suit);

        if (isRed(a.suit) === attackerIsRed) {
          discardDeck.push(a);
          (defenders as any)[aIdx] = null;
          const posA = await getDefenderPos(aIdx);
          addAnim(
            buildAnim(
              "dual-da",
              a,
              posA,
              discardDeckPos,
              undefined,
              undefined,
              "toBack",
            ),
          );
        }

        if (isRed(b.suit) === attackerIsRed) {
          discardDeck.push(b);
          (defenders as any)[bIdx] = null;
          const posB = await getDefenderPos(bIdx);
          if (posB && discardDeckPos) {
            addAnim(
              buildAnim(
                "dual-attack",
                b,
                posB,
                discardDeckPos,
                undefined,
                undefined,
                "toBack",
              ),
            );
          }
        }
      }
    } else if (action === "single") {
      if (selectedDefenders.length !== 1) {
        return;
      }
      const [index] = selectedDefenders;
      const defender = defenders[index];
      if (!defender) {
        return;
      }

      const valid =
        RANK_VALUE[defender.rank] > RANK_VALUE[attacker.rank] &&
        isRed(defender.suit) !== isRed(attacker.suit);
      if (!valid) {
        return;
      }

      discardDeck.push(defender);
      defenders[index] = attacker;

      const attackerPos = await getAttackerPos(attackerIndex);
      const defenderPos = await getDefenderPos(index);
      const discardDeckPos = await measureRef(discardDeckRef);

      // Animate defender from hand to discard
      if (defenderPos && discardDeckPos) {
        addAnim(
          buildAnim(
            "single-def",
            defender,
            defenderPos,
            discardDeckPos,
            undefined,
            undefined,
            "toBack",
          ),
        );
      }

      // Animate attacker from lineup to hand
      if (attackerPos && defenderPos) {
        addAnim(buildAnim("single-attack", attacker, attackerPos, defenderPos));
      }
    } else if (action === "sacrifice") {
      if (selectedDefenders.length !== 1) {
        return;
      }
      const [index] = selectedDefenders;
      if (!defenders[index]) {
        return;
      }

      discardDeck.push(defenders[index]);
      const defPos = await getDefenderPos(index);
      const discardDeckPos = await measureRef(discardDeckRef);

      // Animate defender from hand to discard
      if (defPos && discardDeckPos) {
        addAnim(
          buildAnim(
            "sac-def",
            defenders[index],
            defPos,
            discardDeckPos,
            undefined,
            undefined,
            "toBack",
          ),
        );
      }

      (defenders as any)[index] = null;
      attackerDeck.push(attacker);
      const attackerPos = await getAttackerPos(attackerIndex);
      const attackerDeckPos = await measureRef(attackerDeckCurrentRef);

      // Animate attacker from lineup to attacker deck
      if (attackerPos && attackerDeckPos) {
        addAnim(
          buildAnim(
            "sac-att",
            attacker,
            attackerPos,
            attackerDeckPos,
            undefined,
            undefined,
            "toBack",
          ),
        );
      }
    }

    setIsAnimating(true);

    if (anims.length > 0) {
      await animateCards(anims);
    }
    anims = [];

    // It's safe to unselect defenders now (earlier would mess up animations)
    setSelectedDefenders([]);

    // Form intermediate state after action resolves
    let nextState = {
      ...prev,
      currentDefenders: defenders,
      attackerDeck,
      discardDeck,
    };

    // Remove current attacker
    let currentAttackers = [...prev.currentAttackers];
    currentAttackers.pop();
    nextState.currentAttackers = currentAttackers;

    if (anims.length > 0) {
      // Show intermediate update to fix discard count for the discarded attacker
      setGame(nextState);
      await animateCards(anims);
      anims = [];
    } else {
      setGame(nextState);
    }

    // Handle Wave Transition
    if (nextState.currentAttackers.length === 0 && !nextState.ended) {
      if (nextState.attackerDeck.length === 0) {
        if (nextState.discardDeck.length === 0) {
          nextState = { ...nextState, ended: true, won: true };
          setGame(nextState);
        } else {
          if (nextState.wave === 1) {
            showToast("Wave 2");
          }

          let cardsToMove = shuffle([...nextState.discardDeck]);
          let animatedDiscardDeck = [...nextState.discardDeck];
          let animatedAttackerDeck = [...nextState.attackerDeck];

          for (let i = 0; i < cardsToMove.length; i++) {
            const card = cardsToMove[i];
            animatedDiscardDeck.pop();
            animatedAttackerDeck.push(card);

            const discardDeckPos = await measureRef(discardDeckRef);
            const attackerDeckPos = await measureRef(attackerDeckNextRef);

            // Animate refill from discard to attacker deck
            await animateCards([
              buildAnim(
                `wave-trans-${i}`,
                { ...card, isBack: true },
                discardDeckPos,
                attackerDeckPos,
                50,
                0,
                undefined,
                false,
              ),
            ]);

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

    // Refill attackers one by one
    if (nextState.currentAttackers.length === 0 && !nextState.ended) {
      if (!nextState.ended) {
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
          setGame(nextState);

          const attackerDeckPos = await measureRef(attackerDeckCurrentRef);
          const toPos = await getAttackerPos(i);
          await animateCards([
            buildAnim(
              `deal-att-${i}`,
              nextCard,
              attackerDeckPos,
              toPos,
              animDuration,
              0,
              "toFace",
              true,
            ),
          ]);
        }
      } else {
        setGame(nextState);
      }
    }

    // Refill defenders
    let updatedDefenders = [...nextState.currentDefenders];
    let updatedDefenderDeck = [...nextState.defenderDeck];

    for (let i = 0; i < updatedDefenders.length; i++) {
      if (!updatedDefenders[i]) {
        const next = updatedDefenderDeck.shift();
        // Use a delay count, because i can be 6, which gives inaccurate delays
        let delayCount = 0;
        if (next) {
          updatedDefenders[i] = next;

          const defenderDeckPos = await measureRef(defenderDeckRef);
          const targetPos = await getDefenderPos(i);

          // Animate from defender deck to hand
          if (defenderDeckPos && targetPos) {
            addAnim(
              buildAnim(
                `deal-def-${i}`,
                next,
                defenderDeckPos,
                targetPos,
                animDuration,
                delayCount * animDuration - 100 * delayCount,
                "toFace",
              ),
            );
            delayCount += 1;
          }
        }
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    const finalDefenders = updatedDefenders.filter(Boolean) as PlayingCard[];
    nextState.currentDefenders = finalDefenders;
    nextState.defenderDeck = updatedDefenderDeck;

    if (nextState.currentDefenders.length === 0) {
      nextState.ended = true;
      nextState.won = false;
    }

    setGame(nextState);
    setSelectedDefenders([]);
    setIsAnimating(false);
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
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={`${score} (${game.won ? "higher is better" : "closer to zero is better"})`}
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
              refTopNext={attackerDeckNextRef}
              refTopCurrent={attackerDeckCurrentRef}
              backCount={game.attackerDeck.length}
              showCount
              countPosition="above"
              fan="verticalDown"
              limitFan
              cardsPerRow={cardsPerRow}
            />

            <Deck
              // title="Discard"
              refTopNext={discardDeckRef}
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
              refTopNext={defenderDeckRef}
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
                targetGirdCols={maxAttackersNum}
                style={[{ flexDirection: "row", justifyContent: "flex-start" }]}
              >
                {Array.from({ length: maxAttackersNum }, (_, idx) => {
                  const card: PlayingCard | undefined =
                    game.currentAttackers[idx];
                  const isCurrentAttacker =
                    idx === game.currentAttackers.length - 1;

                  const isAnimatingCardToPile =
                    isAnimating && isCurrentAttacker;

                  return (
                    <Card
                      key={`attacker-${idx}`}
                      ref={(el) => {
                        attackerRefs.current[idx] = el;
                      }}
                      suit={card?.suit}
                      rank={card?.rank}
                      isPlaceholder={!card || isAnimatingCardToPile}
                      cardsPerRow={cardsPerRow}
                      selectColor={isAnimatingCardToPile ? "none" : "red"}
                      forceOverlay={
                        isAnimatingCardToPile ? false : isCurrentAttacker
                      }
                      forceSelectColor={
                        isAnimatingCardToPile ? false : isCurrentAttacker
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
              <CardGrid cardsPerRow={cardsPerRow} targetGirdCols={3}>
                {game.currentDefenders.map((card, index) => {
                  const isSelected = selectedDefenders.includes(index);

                  const isAnimatingCardToPile =
                    isAnimating && isSelected && selectedDefenders.length === 1;

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
                      ref={(el) => {
                        defenderRefs.current[index] = el;
                      }}
                      onPress={
                        isAnimating ? undefined : () => toggleDefender(index)
                      }
                      suit={card?.suit}
                      rank={card?.rank}
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
