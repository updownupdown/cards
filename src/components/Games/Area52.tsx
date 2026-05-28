import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "../Button/Button";
import { Card, CardSelectColor, useCardSize } from "../Cards/Card";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 5;
const cardGap = 15;

type AreaState = {
  defenderDeck: PlayingCard[];
  defenders: PlayingCard[];
  alienDeck: PlayingCard[];
  alienDiscard: PlayingCard[];
  attackerQueue: PlayingCard[];
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
    defenders: defenders.slice(0, 6),
    alienDeck: aliens,
    alienDiscard: [],
    attackerQueue: [],
    wave: 1,
    ended: false,
    won: false,
  };
}

function ensureQueue(state: AreaState): AreaState {
  if (state.attackerQueue.length > 0 || state.ended) return state;

  let alienDeck = [...state.alienDeck];
  let alienDiscard = [...state.alienDiscard];
  let wave = state.wave;

  if (alienDeck.length === 0) {
    if (wave === 1) {
      if (alienDiscard.length === 0) {
        return { ...state, ended: true, won: true };
      }
      alienDeck = shuffle(alienDiscard);
      alienDiscard = [];
      wave = 2;
    } else {
      if (alienDiscard.length === 0) {
        return { ...state, ended: true, won: true };
      }
      alienDeck = shuffle(alienDiscard);
      alienDiscard = [];
    }
  }

  const attackerQueue = alienDeck.splice(0, Math.min(3, alienDeck.length));
  if (attackerQueue.length === 0) {
    return { ...state, ended: true, won: wave === 2 };
  }

  return {
    ...state,
    alienDeck,
    alienDiscard,
    attackerQueue,
    wave,
  };
}

function refillDefenders(state: AreaState): AreaState {
  const defenders = [...state.defenders];
  const defenderDeck = [...state.defenderDeck];

  for (let i = 0; i < defenders.length; i++) {
    if (!defenders[i]) {
      const next = defenderDeck.shift();
      if (next) {
        defenders[i] = next;
      }
    }
  }

  // If there are still empty spots but deck is empty, filter out nulls
  const finalDefenders = defenders.filter(Boolean) as PlayingCard[];

  return { ...state, defenders: finalDefenders, defenderDeck };
}

function nextAttacker(state: AreaState): AreaState {
  const attackerQueue = [...state.attackerQueue];
  attackerQueue.shift();
  return ensureQueue({ ...state, attackerQueue });
}

function calcLoseScore(state: AreaState) {
  const remainingAliens = state.alienDeck.length + state.attackerQueue.length;
  const base = -remainingAliens;
  return state.wave === 1 ? base - 50 : base;
}

function calcWinScore(state: AreaState) {
  return state.defenderDeck.length + state.defenders.length;
}

export default function Area52() {
  const isLoaded = useGameLoading();
  const [game, setGame] = useState<AreaState>(() => ensureQueue(initState()));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);
  const { width: cardWidth } = useCardSize(cardsPerRow);

  const currentAttacker = game.attackerQueue[0] ?? null;
  const score = useMemo(() => {
    if (!game.ended) return undefined;
    return game.won ? calcWinScore(game) : calcLoseScore(game);
  }, [game]);

  function reset() {
    setSelectedDefenders([]);
    setGame(ensureQueue(initState()));
  }

  function toggleDefender(index: number) {
    if (game.ended) return;
    setSelectedDefenders((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= 2) return prev;
      return [...prev, index];
    });
  }

  function applyAction(action: Action) {
    if (!currentAttacker || game.ended) return;

    setGame((prev) => {
      if (prev.ended || prev.attackerQueue.length === 0) return prev;

      const attacker = prev.attackerQueue[0];
      const defenders = [...prev.defenders];
      let alienDeck = [...prev.alienDeck];
      let alienDiscard = [...prev.alienDiscard];

      if (action === "dual") {
        if (selectedDefenders.length !== 2) {
          // setMessage("Dual attack needs exactly two defenders.");
          return prev;
        }

        const [aIdx, bIdx] = selectedDefenders;
        const a = defenders[aIdx];
        const b = defenders[bIdx];
        if (!a || !b) return prev;

        const sum = RANK_VALUE[a.rank] + RANK_VALUE[b.rank];
        if (sum !== RANK_VALUE[attacker.rank]) {
          // setMessage("Dual attack must sum exactly to attacker value.");
          return prev;
        }

        // Keep spaces empty initially so when we drop in replacements they match index
        (defenders as any)[aIdx] = null;
        (defenders as any)[bIdx] = null;

        alienDiscard.push(attacker);
      } else if (action === "single") {
        if (selectedDefenders.length !== 1) {
          // setMessage("Single attack needs exactly one defender.");
          return prev;
        }

        const [index] = selectedDefenders;
        const defender = defenders[index];
        if (!defender) return prev;

        const valid =
          RANK_VALUE[defender.rank] > RANK_VALUE[attacker.rank] &&
          isRed(defender.suit) !== isRed(attacker.suit);

        if (!valid) {
          // setMessage(
          //   "Single attack needs higher value defender with opposite color.",
          // );
          return prev;
        }

        defenders[index] = attacker;
      } else {
        if (selectedDefenders.length !== 1) {
          // setMessage("Sacrifice needs exactly one defender.");
          return prev;
        }

        const [index] = selectedDefenders;
        if (!defenders[index]) return prev;

        // Rather than removing and shifting elements, replace it with null explicitly
        // to maintain structural positions until refill or rendering skips it
        // We assert any to bypass strict PlayingCard array checks, or we can handle it safely:
        (defenders as any)[index] = null;

        alienDeck = [...alienDeck, attacker];
      }

      let next = nextAttacker({
        ...prev,
        defenders,
        alienDeck,
        alienDiscard,
      });

      next = refillDefenders(next);

      if (next.defenders.length === 0) {
        return { ...next, ended: true, won: false };
      }

      return next;
    });

    setSelectedDefenders([]);
  }

  const [canAttack, setCanAttack] = useState(false);

  useEffect(() => {
    console.log(selectedDefenders);
    if (selectedDefenders.length === 0) setCanAttack(false);

    const enemy = game.attackerQueue[0];
    const enemyValue = RANK_VALUE[enemy.rank];

    if (selectedDefenders.length === 1) {
      const defender = game.defenders[selectedDefenders[0]];
      const defenderValue = RANK_VALUE[defender.rank];
      const oppositeColor = isRed(defender.suit) !== isRed(enemy.suit);

      setCanAttack(defenderValue > enemyValue && oppositeColor);
    } else if (selectedDefenders.length !== 0) {
      let defenderValue = 0;

      Array.from({ length: selectedDefenders.length }, (_, index) => {
        defenderValue +=
          RANK_VALUE[game.defenders[selectedDefenders[index]].rank];
      });

      setCanAttack(defenderValue === enemyValue);
    }
  }, [selectedDefenders]);

  console.log(game);

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={`${score} (${game.won ? "higher is better" : "closer to zero is better"})`}
    >
      {/* Attackers */}
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceBetween,
          flexStyles.fullWidth,
          flexStyles.gap24,
        ]}
      >
        <Text style={textStyles.h4}>Attackers (Wave {game.wave})</Text>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap30,
            { alignItems: "flex-start" },
          ]}
        >
          <Deck
            // title="Attackers"
            backCount={game.alienDeck.length}
            showCount
            countPosition="below"
            limitFan
          />

          <View
            style={[
              { display: "flex", flexDirection: "row-reverse", gap: cardGap },
            ]}
          >
            {game.attackerQueue.map((card, idx) => (
              <View
                key={card.id}
                style={[idx === 0 && { transform: [{ translateY: 12 }] }]}
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
          </View>

          {game.attackerQueue.length === 0 ? (
            <Text style={textStyles.default}>No active attackers</Text>
          ) : null}
        </View>
      </View>

      {/* Defenders */}
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceBetween,
          flexStyles.fullWidth,
          flexStyles.gap24,
        ]}
      >
        <Text style={textStyles.h4}>Defenders</Text>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.gap30,
            { alignItems: "flex-start" },
          ]}
        >
          <Deck
            // title="Defenders"
            backCount={game.defenderDeck.length}
            showCount
            countPosition="below"
            limitFan
          />

          <View
            style={[
              cardStyles.row,
              {
                gap: cardGap,
                width: cardWidth * 3 + cardGap * 2,
                alignSelf: "center",
              },
            ]}
          >
            {game.defenders.map((card, index) => {
              const isSelected = selectedDefenders.includes(index);

              const selectedColor = () => {
                if (!isSelected) {
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
                  onPress={() => toggleDefender(index)}
                  suit={card.suit}
                  rank={card.rank}
                  cardsPerRow={cardsPerRow}
                  isSelected={isSelected}
                  selectColor={selectedColor()}
                />
              );
            })}
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
          disabled={selectedDefenders.length !== 1}
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
          disabled={!canAttack || selectedDefenders.length < 1}
          theme={selectedDefenders.length === 2 ? "purple" : "green"}
        />
      </View>
    </GameWrapper>
  );
}
