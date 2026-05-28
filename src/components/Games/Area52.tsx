import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { Colors, FontWeight } from "@/styles/styles";

const cardsPerRow = 4.2;

type AreaState = {
  defenderDeck: PlayingCard[];
  currentDefenders: PlayingCard[];
  attackerDeck: PlayingCard[];
  discardDeck: PlayingCard[];
  currentAttackers: PlayingCard[];
  wave: 1 | 2;
  ended: boolean;
  won: boolean;
};

type Action = "dual" | "single" | "sacrifice";

function initState(): AreaState {
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

function ensureQueue(state: AreaState): AreaState {
  if (state.currentAttackers.length > 0 || state.ended) return state;

  let attackerDeck = [...state.attackerDeck];
  let discardDeck = [...state.discardDeck];
  let wave = state.wave;

  if (attackerDeck.length === 0) {
    if (wave === 1) {
      if (discardDeck.length === 0) {
        return { ...state, ended: true, won: true };
      }
      attackerDeck = shuffle(discardDeck);
      discardDeck = [];
      wave = 2;
    } else {
      if (discardDeck.length === 0) {
        return { ...state, ended: true, won: true };
      }
      attackerDeck = shuffle(discardDeck);
      discardDeck = [];
    }
  }

  const currentAttackers = attackerDeck.splice(
    0,
    Math.min(3, attackerDeck.length),
  );
  if (currentAttackers.length === 0) {
    return { ...state, ended: true, won: wave === 2 };
  }

  return {
    ...state,
    attackerDeck,
    discardDeck,
    currentAttackers,
    wave,
  };
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

function useCardAnimBuilder(cardsPerRow: number) {
  return useCallback(
    (
      idPrefix: string,
      card: PlayingCard,
      from: any,
      to: any,
      duration = 400,
      delay = 0,
      flip?: "toFace" | "toBack",
    ): CardAnimationParams => {
      return {
        id: `${idPrefix}-${Date.now()}`,
        cardInfo: {
          rank: card.rank,
          suit: card.suit,
          isBack: false,
          cardsPerRow,
        },
        from,
        to,
        duration,
        delay,
        flip,
        keepAlive: false,
      };
    },
    [cardsPerRow],
  );
}

export default function Area52() {
  const isLoaded = useGameLoading();
  const [game, setGame] = useState<AreaState>(() => ensureQueue(initState()));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);

  const { animateCards, measureRef, isAnimating, setIsAnimating } =
    useAnimations();

  const buildAnim = useCardAnimBuilder(cardsPerRow);

  const attackerDeckRef = useRef<View>(null);
  const discardDeckRef = useRef<View>(null);
  const defenderDeckRef = useRef<View>(null);
  const attackerRefs = useRef<(View | null)[]>([]);
  const defenderRefs = useRef<(View | null)[]>([]);

  const currentAttacker = game.currentAttackers[0] ?? null;
  const score = useMemo(() => {
    if (!game.ended) return undefined;
    return game.won ? calcWinScore(game) : calcLoseScore(game);
  }, [game]);

  function reset() {
    setSelectedDefenders([]);
    setGame(ensureQueue(initState()));
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
    setIsAnimating(true);

    const prev = game;
    const attacker = prev.currentAttackers[0];
    const defenders = [...prev.currentDefenders];
    let attackerDeck = [...prev.attackerDeck];
    let discardDeck = [...prev.discardDeck];

    let anims: CardAnimationParams[] = [];

    // Helper to push animations safely
    const addAnim = (anim: CardAnimationParams | null | undefined) => {
      if (anim) anims.push(anim);
    };

    const discardDeckPos = await measureRef(discardDeckRef);
    const attackerDeckPos = await measureRef(attackerDeckRef);
    const defenderDeckPos = await measureRef(defenderDeckRef);

    const getAttackerPos = async (idx: number) =>
      await measureRef({ current: attackerRefs.current[idx] });
    const getDefenderPos = async (idx: number) =>
      await measureRef({ current: defenderRefs.current[idx] });

    if (action === "dual") {
      if (selectedDefenders.length !== 2) {
        setIsAnimating(false);
        return;
      }
      const [aIdx, bIdx] = selectedDefenders;
      const a = defenders[aIdx];
      const b = defenders[bIdx];
      if (!a || !b) {
        setIsAnimating(false);
        return;
      }

      const sum = RANK_VALUE[a.rank] + RANK_VALUE[b.rank];
      if (sum !== RANK_VALUE[attacker.rank]) {
        setIsAnimating(false);
        return;
      }

      discardDeck.push(attacker);
      const attackerPos = await getAttackerPos(0);
      if (attackerPos && discardDeckPos) {
        addAnim(
          buildAnim("dual-attacker", attacker, attackerPos, discardDeckPos),
        );
      }

      if (prev.wave === 2) {
        const attackerIsRed = isRed(attacker.suit);

        if (isRed(a.suit) === attackerIsRed) {
          discardDeck.push(a);
          (defenders as any)[aIdx] = null;
          const posA = await getDefenderPos(aIdx);
          if (posA && discardDeckPos) {
            addAnim(buildAnim("dual-da", a, posA, discardDeckPos));
          }
        }

        if (isRed(b.suit) === attackerIsRed) {
          discardDeck.push(b);
          (defenders as any)[bIdx] = null;
          const posB = await getDefenderPos(bIdx);
          if (posB && discardDeckPos) {
            addAnim(buildAnim("dual-db", b, posB, discardDeckPos));
          }
        }
      }
    } else if (action === "single") {
      if (selectedDefenders.length !== 1) {
        setIsAnimating(false);
        return;
      }
      const [index] = selectedDefenders;
      const defender = defenders[index];
      if (!defender) {
        setIsAnimating(false);
        return;
      }

      const valid =
        RANK_VALUE[defender.rank] > RANK_VALUE[attacker.rank] &&
        isRed(defender.suit) !== isRed(attacker.suit);
      if (!valid) {
        setIsAnimating(false);
        return;
      }

      discardDeck.push(defender);
      defenders[index] = attacker;

      const attackerPos = await getAttackerPos(0);
      const defenderPos = await getDefenderPos(index);

      if (defenderPos && discardDeckPos) {
        addAnim(buildAnim("single-def", defender, defenderPos, discardDeckPos));
      }

      if (attackerPos && defenderPos) {
        addAnim(buildAnim("single-att", attacker, attackerPos, defenderPos));
      }
    } else {
      if (selectedDefenders.length !== 1) {
        setIsAnimating(false);
        return;
      }
      const [index] = selectedDefenders;
      if (!defenders[index]) {
        setIsAnimating(false);
        return;
      }

      discardDeck.push(defenders[index]);
      const defPos = await getDefenderPos(index);
      if (defPos && discardDeckPos) {
        addAnim(buildAnim("sac-def", defenders[index], defPos, discardDeckPos));
      }

      (defenders as any)[index] = null;
      attackerDeck.push(attacker);
      const attackerPos = await getAttackerPos(0);
      if (attackerPos && attackerDeckPos) {
        addAnim(
          buildAnim(
            "sac-att",
            attacker,
            attackerPos,
            attackerDeckPos,
            400,
            0,
            "toBack",
          ),
        );
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }
    anims = [];

    // Form intermediate state after action resolves
    let nextState = {
      ...prev,
      currentDefenders: defenders,
      attackerDeck,
      discardDeck,
    };

    // Shift current attacker
    let currentAttackers = [...prev.currentAttackers];
    currentAttackers.shift();
    nextState.currentAttackers = currentAttackers;

    // Use shared ensureQueue logic
    let queuedState = ensureQueue(nextState);

    // If new attackers were dealt, animate them
    if (
      queuedState.currentAttackers.length > 0 &&
      nextState.currentAttackers.length === 0
    ) {
      for (let i = 0; i < queuedState.currentAttackers.length; i++) {
        const toPos = await getAttackerPos(i);
        if (attackerDeckPos && toPos) {
          addAnim(
            buildAnim(
              `deal-att-${i}`,
              queuedState.currentAttackers[i],
              attackerDeckPos,
              toPos,
              300,
              i * 150,
              "toFace",
            ),
          );
        }
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
      anims = [];
    }

    nextState = queuedState;

    // Refill defenders
    let updatedDefenders = [...nextState.currentDefenders];
    let updatedDefenderDeck = [...nextState.defenderDeck];

    for (let i = 0; i < updatedDefenders.length; i++) {
      if (!updatedDefenders[i]) {
        const next = updatedDefenderDeck.shift();
        if (next) {
          updatedDefenders[i] = next;
          const targetPos = await getDefenderPos(i);
          if (defenderDeckPos && targetPos) {
            addAnim(
              buildAnim(
                `deal-def-${i}`,
                next,
                defenderDeckPos,
                targetPos,
                300,
                i * 150,
                "toFace",
              ),
            );
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

    const enemy = game.currentAttackers[0];
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
            { marginVertical: "auto" },
          ]}
        >
          {/* Piles Col */}
          <View style={[flexStyles.colCentered, flexStyles.gap20]}>
            <Deck
              // title="Attackers"
              refTopCurrent={attackerDeckRef}
              backCount={game.attackerDeck.length}
              showCount
              countPosition="above"
              fan="verticalDown"
              limitFan
              cardsPerRow={cardsPerRow}
            />

            <Deck
              // title="Discard"
              refTopCurrent={discardDeckRef}
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
              refTopCurrent={defenderDeckRef}
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
              { height: "100%" },
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
                targetGirdCols={3}
                style={[
                  { flexDirection: "row-reverse", justifyContent: "flex-end" },
                ]}
              >
                {game.currentAttackers.map((card, idx) => (
                  <View
                    key={card.id}
                    ref={(el) => {
                      attackerRefs.current[idx] = el;
                    }}
                    style={[idx === 0 && { transform: [{ translateY: 20 }] }]}
                  >
                    <Card
                      suit={card.suit}
                      rank={card.rank}
                      cardsPerRow={cardsPerRow}
                      selectColor="red"
                      forceOverlay={idx === 0}
                      forceSelectColor={idx === 0}
                    />
                  </View>
                ))}

                {game.currentAttackers.length === 0 && (
                  <Text style={textStyles.default}>No active attackers</Text>
                )}
              </CardGrid>
            </View>

            <View style={[styles.section]}>
              <View style={[styles.sectionTitleWrap]}>
                <Text style={styles.sectionTitle}>Defenders</Text>
              </View>
              <CardGrid cardsPerRow={cardsPerRow} targetGirdCols={3}>
                {game.currentDefenders.map((card, index) => {
                  const isSelected = selectedDefenders.includes(index);

                  const selectedColor = () => {
                    if (!isSelected || canAttack === undefined) {
                      return "blue" as CardSelectColor;
                    } else if (selectedDefenders.length === 2) {
                      if (canAttack) {
                        return "purple" as CardSelectColor;
                      } else {
                        return "orange" as CardSelectColor;
                      }
                    } else {
                      if (canAttack) {
                        return "green" as CardSelectColor;
                      } else {
                        return "red" as CardSelectColor;
                      }
                    }
                  };

                  return (
                    <CardButton
                      key={`${card.id}-${index}`}
                      ref={(el) => {
                        defenderRefs.current[index] = el;
                      }}
                      onPress={() => toggleDefender(index)}
                      suit={card.suit}
                      rank={card.rank}
                      cardsPerRow={cardsPerRow}
                      isSelected={isSelected}
                      selectColor={selectedColor()}
                    />
                  );
                })}
              </CardGrid>
            </View>
          </View>
        </View>
        {/* ///////// BUTTONS //////////// */}

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
