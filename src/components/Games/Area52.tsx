import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameHeader } from "../common/GameHeader";
import { flexStyles, layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { Button } from "../Button/Button";
import { MessageBox } from "../common/MessageBox";
import { CardButton } from "../Cards/CardButton";

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

  while (defenders.length < 6 && defenderDeck.length > 0) {
    const next = defenderDeck.shift();
    if (!next) break;
    defenders.push(next);
  }

  return { ...state, defenders, defenderDeck };
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
  const [game, setGame] = useState<AreaState>(() => ensureQueue(initState()));
  const [selectedDefenders, setSelectedDefenders] = useState<number[]>([]);
  const [message, setMessage] = useState(
    "Choose action to handle current attacker.",
  );

  const currentAttacker = game.attackerQueue[0] ?? null;
  const score = useMemo(() => {
    if (!game.ended) return null;
    return game.won ? calcWinScore(game) : calcLoseScore(game);
  }, [game]);

  function reset() {
    setSelectedDefenders([]);
    setMessage("Choose action to handle current attacker.");
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
          setMessage("Dual attack needs exactly two defenders.");
          return prev;
        }

        const [aIdx, bIdx] = selectedDefenders;
        const a = defenders[aIdx];
        const b = defenders[bIdx];
        if (!a || !b) return prev;

        const sum = RANK_VALUE[a.rank] + RANK_VALUE[b.rank];
        if (sum !== RANK_VALUE[attacker.rank]) {
          setMessage("Dual attack must sum exactly to attacker value.");
          return prev;
        }

        alienDiscard.push(attacker);
      } else if (action === "single") {
        if (selectedDefenders.length !== 1) {
          setMessage("Single attack needs exactly one defender.");
          return prev;
        }

        const [index] = selectedDefenders;
        const defender = defenders[index];
        if (!defender) return prev;

        const valid =
          RANK_VALUE[defender.rank] > RANK_VALUE[attacker.rank] &&
          isRed(defender.suit) !== isRed(attacker.suit);

        if (!valid) {
          setMessage(
            "Single attack needs higher value defender with opposite color.",
          );
          return prev;
        }

        defenders[index] = attacker;
      } else {
        if (selectedDefenders.length !== 1) {
          setMessage("Sacrifice needs exactly one defender.");
          return prev;
        }

        const [index] = selectedDefenders;
        if (!defenders[index]) return prev;

        defenders.splice(index, 1);
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
    setMessage("Action resolved.");
  }

  return (
    <>
      <GameHeader
        gameTitle="Area 52"
        ended={game.ended}
        won={game.won}
        reset={reset}
      />

      <View style={layoutStyles.gameArea}>
        <MessageBox message={message} />

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.justifyEvenly,
            flexStyles.fullWidth,
          ]}
        >
          <Text style={textStyles.default}>Wave: {game.wave}</Text>
          <Text style={textStyles.default}>
            Defender deck: {game.defenderDeck.length}
          </Text>
          <Text style={textStyles.default}>
            Alien deck: {game.alienDeck.length}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={textStyles.default}>Current attackers</Text>
          <View style={styles.attackersRow}>
            {game.attackerQueue.map((card, idx) => (
              <View
                key={card.id}
                style={idx === 0 ? styles.currentAttacker : null}
              >
                <Card suit={card.suit} rank={card.rank} cardsPerRow={4} />
              </View>
            ))}
            {game.attackerQueue.length === 0 ? (
              <Text style={textStyles.default}>No active attackers</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={textStyles.default}>Defenders (select 1-2)</Text>
          <View style={styles.defendersWrap}>
            {game.defenders.map((card, index) => {
              const selected = selectedDefenders.includes(index);
              return (
                <CardButton
                  key={`${card.id}-${index}`}
                  onPress={() => toggleDefender(index)}
                  suit={card.suit}
                  rank={card.rank}
                  cardsPerRow={4}
                  isSelected={selected}
                />
              );
            })}
          </View>
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <Button onPress={() => applyAction("single")} text="Single Attack" />
          <Button onPress={() => applyAction("dual")} text="Dual Attack" />
          <Button onPress={() => applyAction("sacrifice")} text="Sacrifice" />
        </View>

        {game.ended ? (
          <View style={flexStyles.rowCentered}>
            <Text style={textStyles.default}>
              {game.won ? "You won!" : "You lost"}
            </Text>
            <Text style={textStyles.default}>
              Score: {score ?? 0}{" "}
              {game.won ? "(higher is better)" : "(closer to zero is better)"}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingHorizontal: 10,
    paddingBottom: 24,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_400Regular",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#111827",
  },
  attackersRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  currentAttacker: {
    transform: [{ translateY: 12 }],
  },
  defendersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  defenderCard: {
    borderRadius: 8,
  },
  selectedCard: {
    backgroundColor: "rgba(37,99,235,0.15)",
    transform: [{ translateY: -12 }],
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0f766e",
  },
  actionText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  resultBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.2)",
    backgroundColor: "rgba(16,185,129,0.12)",
    padding: 10,
    gap: 4,
  },
  resultTitle: {
    fontFamily: "Outfit_600SemiBold",
    color: "#065f46",
  },
});
