import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { GameMenus } from "../common/GameMenus";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { flexStyles } from "@/styles/flexStyles";

type ClockState = {
  piles: PlayingCard[][];
  captured: PlayingCard[][];
  currentSource: number;
  lastRevealed: PlayingCard | null;
  revealedCount: number;
  ended: boolean;
  won: boolean;
};

function rankToPileIndex(card: PlayingCard) {
  if (card.rank === "A") return 0;
  if (card.rank === "J") return 10;
  if (card.rank === "Q") return 11;
  if (card.rank === "K") return 12;
  return Number(card.rank) - 1;
}

function pileLabel(index: number) {
  if (index === 12) return "Center (K)";
  if (index === 0) return "1 (A)";
  if (index === 10) return "11 (J)";
  if (index === 11) return "12 (Q)";
  return `${index + 1}`;
}

function setup(): ClockState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const piles: PlayingCard[][] = Array.from({ length: 13 }, () => []);

  let target = 0;
  while (deck.length > 0) {
    const card = deck.shift();
    if (card) piles[target].push(card);
    target = (target + 1) % 13;
  }

  return {
    piles,
    captured: Array.from({ length: 13 }, () => []),
    currentSource: 12,
    lastRevealed: null,
    revealedCount: 0,
    ended: false,
    won: false,
  };
}

export default function Clock() {
  const [game, setGame] = useState<ClockState>(setup);
  const [message, setMessage] = useState(
    "Reveal next card from the active pile. Its rank selects the next active pile.",
  );

  const kingsCaptured = useMemo(
    () => game.captured[12].length,
    [game.captured],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Reveal next card from the active pile. Its rank selects the next active pile.",
    );
  }

  function revealStep() {
    setGame((prev) => {
      if (prev.ended) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      const captured = prev.captured.map((pile) => [...pile]);

      const source = piles[prev.currentSource];
      const next = source.pop();
      if (!next) {
        return { ...prev, ended: true, won: false };
      }

      const target = rankToPileIndex(next);
      captured[target].push(next);

      const revealedCount = prev.revealedCount + 1;
      const kingsRevealed = captured[12].length;

      if (kingsRevealed >= 4 && revealedCount < 52) {
        return {
          ...prev,
          piles,
          captured,
          currentSource: target,
          lastRevealed: next,
          revealedCount,
          ended: true,
          won: false,
        };
      }

      if (revealedCount >= 52) {
        return {
          ...prev,
          piles,
          captured,
          currentSource: target,
          lastRevealed: next,
          revealedCount,
          ended: true,
          won: true,
        };
      }

      return {
        ...prev,
        piles,
        captured,
        currentSource: target,
        lastRevealed: next,
        revealedCount,
      };
    });

    setMessage("Revealed one card.");
  }

  return (
    <>
      {/* <GameMenus
        gameTitle="Clock Solitaire"
        ended={game.ended}
        won={game.won}
        reset={reset}
      /> */}

      <View style={layoutStyles.gameArea}>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <Text style={textStyles.default}>
            Revealed:
            <br />
            {game.revealedCount}/52
          </Text>
          <Text style={textStyles.default}>
            Kings revealed:
            <br />
            {kingsCaptured}/4
          </Text>
          <Text style={textStyles.default}>
            Active pile:
            <br />
            {pileLabel(game.currentSource)}
          </Text>
        </View>

        <Text style={textStyles.default}>Message: {message}</Text>

        <View style={styles.revealRow}>
          <Pressable
            style={[
              styles.revealButton,
              game.ended ? styles.revealDisabled : styles.revealEnabled,
            ]}
            onPress={revealStep}
            disabled={game.ended}
          >
            <Text style={styles.buttonText}>Reveal Next</Text>
          </Pressable>

          <View style={styles.lastCardWrap}>
            <Text style={styles.smallText}>Last revealed</Text>
            {game.lastRevealed ? (
              <Card
                suit={game.lastRevealed.suit}
                rank={game.lastRevealed.rank}
                cardsPerRow={5}
              />
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: 13 }).map((_, idx) => (
            <View
              key={`clock-pile-${idx}`}
              style={[
                styles.pileBox,
                idx === game.currentSource && !game.ended
                  ? styles.activePile
                  : null,
              ]}
            >
              <Text style={styles.smallText}>{pileLabel(idx)}</Text>
              <Text style={styles.smallText}>
                Hidden: {game.piles[idx].length}
              </Text>
              <Text style={styles.smallText}>
                Captured: {game.captured[idx].length}
              </Text>
            </View>
          ))}
        </View>

        {game.ended ? (
          <Text style={game.won ? styles.winText : styles.loseText}>
            {game.won
              ? "You revealed all 52 cards."
              : "The fourth king appeared before all cards were revealed."}
          </Text>
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
    color: "#1f2937",
    fontFamily: "Outfit_600SemiBold",
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  revealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  revealButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  revealEnabled: {
    backgroundColor: "#0f766e",
  },
  revealDisabled: {
    backgroundColor: "#94a3b8",
  },
  lastCardWrap: {
    alignItems: "center",
    gap: 4,
  },
  placeholder: {
    width: 90,
    height: 126,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pileBox: {
    width: "23%",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.2)",
    borderRadius: 8,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.35)",
    gap: 2,
  },
  activePile: {
    borderColor: "#0f766e",
    backgroundColor: "rgba(15,118,110,0.16)",
  },
  smallText: {
    fontSize: 11,
    color: "#334155",
  },
  winText: {
    color: "#065f46",
    fontFamily: "Outfit_600SemiBold",
  },
  loseText: {
    color: "#991b1b",
    fontFamily: "Outfit_600SemiBold",
  },
});
