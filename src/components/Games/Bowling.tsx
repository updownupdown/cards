import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  createNullArray,
  flipAllToBack,
  flipToBack,
  flipToFace,
  flipTopCardToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
const BACK_ROW = new Set([6, 7, 8, 9]);
const CENTER_PIN = 4;
const PINS_COUNT = 10;
const FRAMES_COUNT = 10;
// Simulated play: always taking the biggest hit scores ~94 on average
// (3% reach 120), while planning each ball well scores ~205.
const WIN_SCORE = 120;

// Pyramid indices are front-to-back rows: [0], [1,2], [3,4,5], [6,7,8,9]
const PIN_ADJACENCY: Record<number, number[]> = {
  0: [1, 2],
  1: [0, 2, 3, 4],
  2: [0, 1, 4, 5],
  3: [1, 4, 6, 7],
  4: [1, 2, 3, 5, 7, 8],
  5: [2, 4, 8, 9],
  6: [3, 7],
  7: [3, 4, 6, 8],
  8: [4, 5, 7, 9],
  9: [5, 8],
};

type Phase = "ballSelect" | "pinSelect" | "gameEnd";
type BallType = "regular" | "strike" | "spare" | null;

export type BowlingPhase = Phase;
export type BowlingBallType = BallType;

type Frame = {
  ball1Pins: number | null;
  ball1Type: BallType;
  ball2Pins: number | null;
  ball2Type: BallType;
  mark: "strike" | "split" | null;
  score: number | null;
};

export type BowlingFrame = Frame;

type GameState = {
  pins: (PlayingCard | null)[];
  ballPiles: PlayingCard[][];
  discard: PlayingCard[];
  frames: Frame[];
  currentFrame: number;
  currentBall: 1 | 2;
  phase: Phase;
  selectedBallPile: number | null;
  selectedPins: number[];
  ballStartKnockedCount: number;
  isFirstTurnOfFrame: boolean;
  bonusBallsRemaining: number;
  bonusRolls: number[];
  totalScore: number;
  winLoseMessage: string;
};

export type BowlingGameState = GameState;

function filteredDeck() {
  const cards = createDeck().filter(
    (card) =>
      (card.suit === "hearts" || card.suit === "diamonds") &&
      rankValue(card) >= 1 &&
      rankValue(card) <= 10,
  );
  return shuffle(cards);
}

const nonCardInitialState = {
  frames: Array.from({ length: FRAMES_COUNT }, () => ({
    ball1Pins: null,
    ball1Type: null,
    ball2Pins: null,
    ball2Type: null,
    mark: null,
    score: null,
  })),
  currentFrame: 0,
  currentBall: 1 as 1 | 2,
  phase: "ballSelect" as Phase,
  selectedBallPile: null,
  selectedPins: [],
  ballStartKnockedCount: 0,
  isFirstTurnOfFrame: true,
  bonusBallsRemaining: 0,
  bonusRolls: [],
  winLoseMessage: "",
  totalScore: 0,
};

const gameStateInitial: GameState = {
  discard: filteredDeck(),
  pins: createNullArray(PINS_COUNT),
  ballPiles: [],
  ...nonCardInitialState,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
  resetEntireGame = false,
) {
  setGame((draft) => {
    const allCards = flipAllToBack([
      ...draft.pins.filter((c): c is PlayingCard => c !== null),
      ...draft.ballPiles.flat(),
      ...draft.discard,
    ]);

    // Reset non-card state first, then assign new card state to avoid stale references.
    draft.discard = allCards;
    draft.pins = createNullArray(PINS_COUNT);
    draft.ballPiles = [];

    if (resetEntireGame) {
      // Reset entire game state
      Object.assign(draft, nonCardInitialState);
    } else {
      // Reset layout state only
      draft.selectedBallPile = null;
      draft.selectedPins = [];
      draft.ballStartKnockedCount = 0;
      draft.isFirstTurnOfFrame = true;
      draft.phase = "ballSelect";
    }
  });

  await delay();

  // Set up pins and ball piles
  setGame((draft) => {
    const shuffled = shuffle(draft.discard);
    draft.pins = shuffled.slice(0, 10).map((card) => flipToFace(card));
    draft.ballPiles = [
      flipTopCardToFace(shuffled.slice(10, 15)),
      flipTopCardToFace(shuffled.slice(15, 18)),
      flipTopCardToFace(shuffled.slice(18, 20)),
    ];
    draft.discard = [];
  });
}

function getCardValue(card: PlayingCard | null) {
  if (!card) return 0;
  return rankValue(card);
}

function countKnockedPins(pins: (PlayingCard | null)[]) {
  return pins.filter((pin) => pin === null).length;
}

function isSelectionConnected(indices: number[]) {
  if (indices.length <= 1) return true;

  const remaining = new Set(indices);
  const queue = [indices[0]];
  remaining.delete(indices[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of PIN_ADJACENCY[current]) {
      if (remaining.has(next)) {
        remaining.delete(next);
        queue.push(next);
      }
    }
  }

  return remaining.size === 0;
}

function isAdjacentToEmptyPin(pinIdx: number, pins: (PlayingCard | null)[]) {
  return PIN_ADJACENCY[pinIdx].some(
    (adjacentIdx) => pins[adjacentIdx] === null,
  );
}

function isValidPinCombo(args: {
  combo: number[];
  pins: (PlayingCard | null)[];
  isFirstTurnOfFrame: boolean;
}) {
  const { combo, pins, isFirstTurnOfFrame } = args;

  if (combo.length < 1 || combo.length > 3) return false;
  if (combo.some((idx) => !pins[idx])) return false;
  if (!isSelectionConnected(combo)) return false;

  if (isFirstTurnOfFrame) {
    if (combo.some((idx) => BACK_ROW.has(idx))) return false;
    if (combo.length === 1 && combo[0] === CENTER_PIN) return false;
  }

  const knockedPinsCount = countKnockedPins(pins);
  if (knockedPinsCount > 0) {
    const adjacentToEmpty = combo.some((idx) =>
      isAdjacentToEmptyPin(idx, pins),
    );
    if (!adjacentToEmpty) return false;
  }

  return true;
}

function canAddPinToSelection(args: {
  pinIdx: number;
  selectedPins: number[];
  pins: (PlayingCard | null)[];
  isFirstTurnOfFrame: boolean;
}) {
  const { pinIdx, selectedPins, pins, isFirstTurnOfFrame } = args;

  if (!pins[pinIdx]) return false;
  if (selectedPins.includes(pinIdx)) return true;
  if (selectedPins.length >= 3) return false;

  return isValidPinCombo({
    combo: [...selectedPins, pinIdx],
    pins,
    isFirstTurnOfFrame,
  });
}

function canPinBeSelectedThisTurn(args: {
  pinIdx: number;
  pins: (PlayingCard | null)[];
  isFirstTurnOfFrame: boolean;
}) {
  const { pinIdx, pins, isFirstTurnOfFrame } = args;

  if (!pins[pinIdx]) return false;

  if (
    isValidPinCombo({
      combo: [pinIdx],
      pins,
      isFirstTurnOfFrame,
    })
  ) {
    return true;
  }

  const availablePins = pins
    .map((card, idx) => (card ? idx : -1))
    .filter((idx) => idx >= 0);

  for (let i = 0; i < availablePins.length; i++) {
    const first = availablePins[i];

    if (first === pinIdx) continue;

    if (
      isValidPinCombo({
        combo: [first, pinIdx],
        pins,
        isFirstTurnOfFrame,
      })
    ) {
      return true;
    }

    for (let j = i + 1; j < availablePins.length; j++) {
      const second = availablePins[j];

      if (second === pinIdx) continue;

      if (
        isValidPinCombo({
          combo: [first, second, pinIdx],
          pins,
          isFirstTurnOfFrame,
        })
      ) {
        return true;
      }
    }
  }

  return isValidPinCombo({
    combo: [pinIdx],
    pins,
    isFirstTurnOfFrame,
  });
}

function discardTopCardFromPile(pile: PlayingCard[], discard: PlayingCard[]) {
  const removedCard = pile.pop();
  if (removedCard) {
    discard.push(flipToBack(removedCard));
  }

  if (pile.length > 0) {
    pile[pile.length - 1] = flipToFace(pile[pile.length - 1]);
  }
}

function discardTopCardsFromAllPiles(
  ballPiles: PlayingCard[][],
  discard: PlayingCard[],
) {
  for (const pile of ballPiles) {
    discardTopCardFromPile(pile, discard);
  }
}

function getNextBallValues(
  frames: Frame[],
  frameIndex: number,
  count: number,
  bonusRolls: number[],
) {
  const values: number[] = [];

  for (
    let i = frameIndex + 1;
    i < frames.length && values.length < count;
    i++
  ) {
    const frame = frames[i];

    if (frame.ball1Pins !== null) {
      values.push(frame.ball1Pins);
    }

    if (
      frame.ball1Type !== "strike" &&
      frame.ball2Pins !== null &&
      values.length < count
    ) {
      values.push(frame.ball2Pins);
    }
  }

  for (const roll of bonusRolls) {
    if (values.length >= count) break;
    values.push(roll);
  }

  return values.length >= count ? values : null;
}

function recalculateScores(frames: Frame[], bonusRolls: number[]) {
  let running = 0;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    if (frame.ball1Pins === null) {
      frame.score = null;
      continue;
    }

    if (frame.ball1Type === "strike") {
      const nextValues = getNextBallValues(frames, i, 2, bonusRolls);
      if (!nextValues) {
        frame.score = null;
        continue;
      }

      const [b1, b2] = nextValues;
      running += 10 + b1 + b2;
      frame.score = running;
      continue;
    }

    if (frame.ball2Pins === null) {
      frame.score = null;
      continue;
    }

    if (frame.ball2Type === "spare") {
      const nextValues = getNextBallValues(frames, i, 1, bonusRolls);
      if (!nextValues) {
        frame.score = null;
        continue;
      }

      const [b1] = nextValues;
      running += 10 + b1;
      frame.score = running;
      continue;
    }

    running += frame.ball1Pins + frame.ball2Pins;
    frame.score = running;
  }

  return running;
}

export const bowlingRules = {
  getCardValue,
  countKnockedPins,
  isSelectionConnected,
  isAdjacentToEmptyPin,
  isValidPinCombo,
  canAddPinToSelection,
  canPinBeSelectedThisTurn,
  getNextBallValues,
  recalculateScores,
};

// ========== Main Component ========== //
export default function Bowling() {
  const { colorZone } = useGameColors();
  const { spacing, font } = useResponsiveMetrics();

  const { game, setGame, reset, isLoaded, canUndo, undo, saveUndoState } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        await resetAndSetup(setGame, true);
      },
    });

  // const isBonusMode = game.bonusBallsRemaining > 0;

  const selectedBallCard =
    game.selectedBallPile !== null
      ? game.ballPiles[game.selectedBallPile]?.[
          game.ballPiles[game.selectedBallPile].length - 1
        ]
      : null;

  const selectedPinSum = useMemo(() => {
    if (game.selectedPins.length === 0) return undefined;

    return game.selectedPins.reduce((sum, pinIdx) => {
      return sum + getCardValue(game.pins[pinIdx]);
    }, 0);
  }, [game.pins, game.selectedPins]);

  const canKnockSelectedPins = useMemo(() => {
    if (!selectedBallCard) return false;
    if (game.selectedPins.length < 1 || game.selectedPins.length > 3)
      return false;

    if (
      !isValidPinCombo({
        combo: game.selectedPins,
        pins: game.pins,
        isFirstTurnOfFrame: game.isFirstTurnOfFrame,
      })
    ) {
      return false;
    }

    return selectedPinSum !== undefined && selectedBallCard
      ? selectedPinSum % 10 === getCardValue(selectedBallCard) % 10
      : false;
  }, [
    game.isFirstTurnOfFrame,
    game.pins,
    game.selectedPins,
    selectedBallCard,
    selectedPinSum,
  ]);

  const updateTotalScore = (draft: GameState) => {
    draft.totalScore = recalculateScores(draft.frames, draft.bonusRolls);
  };

  const startFreshBallLayout = async () => {
    await resetAndSetup(setGame, false);
  };

  const endGame = (draft: GameState, message?: string) => {
    updateTotalScore(draft);
    draft.phase = "gameEnd";
    draft.winLoseMessage = i18n.t("games:bowling.finalScore", {
      score: draft.totalScore,
      target: WIN_SCORE,
    });
  };

  const finishBonusBall = (draft: GameState, ballPins: number) => {
    draft.bonusRolls.push(ballPins);
    draft.bonusBallsRemaining -= 1;
    updateTotalScore(draft);

    if (draft.bonusBallsRemaining > 0) {
      startFreshBallLayout();
      // draft.message = `Bonus ball: ${draft.bonusBallsRemaining} remaining.`;
      return;
    }

    endGame(draft);
  };

  const finishFrame = (draft: GameState) => {
    const nextFrame = draft.currentFrame + 1;

    if (nextFrame < 10) {
      draft.currentFrame = nextFrame;
      draft.currentBall = 1;
      startFreshBallLayout();
      updateTotalScore(draft);
      // draft.message = `Frame ${nextFrame + 1}, Ball 1: keep hitting until no moves remain.`;
      return;
    }

    const finalFrame = draft.frames[9];

    if (finalFrame.ball1Type === "strike") {
      finalFrame.mark = "strike";
      draft.bonusBallsRemaining = 2;
      draft.bonusRolls = [];
      startFreshBallLayout();
      updateTotalScore(draft);
      // draft.message = "Final frame strike! Bowl 2 bonus balls.";
      return;
    }

    if (finalFrame.ball2Type === "spare") {
      finalFrame.mark = "split";
      draft.bonusBallsRemaining = 1;
      draft.bonusRolls = [];
      startFreshBallLayout();
      updateTotalScore(draft);
      // draft.message = "Final frame spare! Bowl 1 bonus ball.";
      return;
    }

    endGame(draft);
  };

  const endBallForNoMoves = (draft: GameState) => {
    const knocked = countKnockedPins(draft.pins);
    const ballPins = knocked - draft.ballStartKnockedCount;

    if (draft.bonusBallsRemaining > 0) {
      finishBonusBall(draft, ballPins);
      return;
    }

    const frame = draft.frames[draft.currentFrame];

    if (draft.currentBall === 1) {
      frame.ball1Pins = ballPins;
      frame.ball1Type = ballPins === 10 ? "strike" : "regular";

      if (ballPins === 10) {
        frame.mark = "strike";
        finishFrame(draft);
        return;
      }

      frame.mark = null;
      draft.currentBall = 2;
      draft.selectedBallPile = null;
      discardTopCardsFromAllPiles(draft.ballPiles, draft.discard);
      draft.ballStartKnockedCount = knocked;
      draft.phase = "ballSelect";
      draft.isFirstTurnOfFrame = false;
      // draft.message = `Ball 1 ends with ${ballPins}. Ball 2 started.`;
      return;
    }

    frame.ball2Pins = ballPins;
    frame.ball2Type = knocked === 10 ? "spare" : "regular";
    finishFrame(draft);
  };

  const togglePin = (pinIdx: number) => {
    if (game.phase === "gameEnd") return;

    setGame((draft) => {
      if (!draft.pins[pinIdx]) return;

      const canSelectAlone = isValidPinCombo({
        combo: [pinIdx],
        pins: draft.pins,
        isFirstTurnOfFrame: draft.isFirstTurnOfFrame,
      });

      if (
        !canAddPinToSelection({
          pinIdx,
          selectedPins: draft.selectedPins,
          pins: draft.pins,
          isFirstTurnOfFrame: draft.isFirstTurnOfFrame,
        })
      ) {
        if (draft.selectedPins.length > 0 && canSelectAlone) {
          draft.selectedPins = [pinIdx];
        }
        return;
      }

      if (draft.selectedPins.includes(pinIdx)) {
        const remainingPins = draft.selectedPins.filter(
          (idx) => idx !== pinIdx,
        );

        if (
          remainingPins.length > 0 &&
          !isValidPinCombo({
            combo: remainingPins,
            pins: draft.pins,
            isFirstTurnOfFrame: draft.isFirstTurnOfFrame,
          })
        ) {
          draft.selectedPins = [];
          return;
        }

        draft.selectedPins = remainingPins;
        return;
      }

      draft.selectedPins = [...draft.selectedPins, pinIdx];
    });
  };

  const selectBallPile = (pileIdx: number) => {
    const pile = game.ballPiles[pileIdx];
    if (!pile || pile.length === 0) return;

    setGame((draft) => {
      if (draft.selectedBallPile === pileIdx) {
        draft.selectedBallPile = null;
        draft.phase = "ballSelect";
        return;
      }

      draft.selectedBallPile = pileIdx;
      draft.phase = "pinSelect";
    });
  };

  const knockSelectedPins = () => {
    if (game.phase !== "pinSelect" || game.selectedBallPile === null) return;
    if (!canKnockSelectedPins) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const selectedPile = draft.selectedBallPile;
      if (selectedPile === null) return;

      for (const pinIdx of draft.selectedPins) {
        const knockedCard = draft.pins[pinIdx];
        if (knockedCard) {
          draft.discard.push(flipToBack(knockedCard));
        }
        draft.pins[pinIdx] = null;
      }

      discardTopCardFromPile(draft.ballPiles[selectedPile], draft.discard);
      draft.selectedPins = [];
      draft.selectedBallPile = null;

      if (draft.isFirstTurnOfFrame) {
        draft.isFirstTurnOfFrame = false;
      }

      const knocked = countKnockedPins(draft.pins);
      const ballPins = knocked - draft.ballStartKnockedCount;

      if (draft.bonusBallsRemaining > 0 && knocked === 10) {
        finishBonusBall(draft, 10);
        return;
      }

      if (draft.bonusBallsRemaining === 0) {
        const frame = draft.frames[draft.currentFrame];

        if (draft.currentBall === 1 && knocked === 10) {
          frame.ball1Pins = 10;
          frame.ball1Type = "strike";
          frame.mark = "strike";
          finishFrame(draft);
          return;
        }

        if (draft.currentBall === 2 && knocked === 10) {
          frame.ball2Pins = ballPins;
          frame.ball2Type = "spare";
          frame.mark = "split";
          finishFrame(draft);
          return;
        }
      }

      // draft.message = `Hit successful (${ballPins} this ball). Keep playing until no moves remain.`;
    });
  };

  const endBallNow = () => {
    if (game.phase === "gameEnd") return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.selectedBallPile = null;
      endBallForNoMoves(draft);
    });
  };

  const zones: MapZone[] = useMemo(() => {
    // Layout order is visually back-to-front: 4 / 3 / 2 / 1
    // while indices remain logically front-to-back for rule checks.
    const pinLayout = [
      // idx 0 (front row of 1)
      { c: 3, r: 3.6 },
      // idx 1-2 (row of 2)
      { c: 2.5, r: 2.8 },
      { c: 3.5, r: 2.8 },
      // idx 3-5 (row of 3)
      { c: 2, r: 2 },
      { c: 3, r: 2 },
      { c: 4, r: 2 },
      // idx 6-9 (back row of 4)
      { c: 1.5, r: 1.2 },
      { c: 2.5, r: 1.2 },
      { c: 3.5, r: 1.2 },
      { c: 4.5, r: 1.2 },
    ];

    const pinZones: MapZone[] = pinLayout.map((pos, idx) => ({
      id: `pin-${idx}`,
      name: "pin",
      pileIndex: idx,
      cards: game.pins[idx] ? [game.pins[idx]!] : [],
      col: pos.c,
      row: pos.r,
      baseZIndex: 30 - idx,
      placeholder: {},
    }));

    const ballZones: MapZone[] = game.ballPiles.map((pile, idx) => ({
      id: `ball-${idx}`,
      name: "ball",
      pileIndex: idx,
      cards: pile,
      col: 2 + idx,
      row: 4.8,
      baseZIndex: 40 + idx,
      fan: {
        direction: "down",
        offset: 0.15,
        center: false,
      },
      placeholder: {},
    }));
    return [
      {
        id: "frames",
        col: 0,
        row: 0,
        width: "full",
        height: 1.1,
        baseZIndex: 90,
      },
      {
        id: "discard",
        cards: game.discard,
        col: 0,
        row: 1.2,
        baseZIndex: 20,
        placeholder: {},
      },
      ...pinZones,
      ...ballZones,
      {
        id: "actions",
        col: 0,
        row: 3,
        width: 1.9,
        height: 3.25,
        baseZIndex: 5,
      },
    ];
  }, [game.ballPiles, game.pins]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "pin" && zone.pileIndex !== undefined) {
      const pinCard = game.pins[zone.pileIndex];

      return {
        zIndexOffset: pinCard === null ? -10 : 0,
      };
    }
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "ball" && mappedCard.pileIndex !== undefined) {
      const pileIdx = mappedCard.pileIndex;
      const isTopCard = mappedCard.topOfZone;
      const canSelect = isTopCard && game.ballPiles[pileIdx]?.length > 0;
      const isSelected = game.selectedBallPile === pileIdx && isTopCard;

      return {
        isSelected,
        selectColor: isSelected
          ? canKnockSelectedPins
            ? "green"
            : "blue"
          : "none",
        forceOverlayColor: canSelect,
        isDisabled: !canSelect,
        onPress: () => {
          if (canSelect) selectBallPile(pileIdx);
        },
      };
    }

    if (mappedCard.zoneName === "pin" && mappedCard.pileIndex !== undefined) {
      const pinIdx = mappedCard.pileIndex;
      const canSelect = game.phase !== "gameEnd";
      const canSelectNow = canAddPinToSelection({
        pinIdx,
        selectedPins: game.selectedPins,
        pins: game.pins,
        isFirstTurnOfFrame: game.isFirstTurnOfFrame,
      });
      const canBeSelectedThisTurn = canPinBeSelectedThisTurn({
        pinIdx,
        pins: game.pins,
        isFirstTurnOfFrame: game.isFirstTurnOfFrame,
      });
      const isSelected = game.selectedPins.includes(pinIdx);
      const selectColor = !canBeSelectedThisTurn
        ? "grey"
        : isSelected
          ? canKnockSelectedPins
            ? "green"
            : "blue"
          : canSelectNow
            ? "none"
            : "orange";

      return {
        isSelected,
        selectColor,
        forceOverlayColor: true,
        isDisabled: !canSelect,
        onPress: () => {
          if (canSelect) togglePin(pinIdx);
        },
      };
    }

    return undefined;
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardSize: "small",
    cardMapper,
    zoneMapper,
    paddingTop: 0,
  });

  const CountText = ({
    count,
    label,
  }: {
    count: number | undefined;
    label: string;
  }) => {
    const digit1 =
      count === undefined
        ? undefined
        : count.toString().length > 1
          ? count.toString()[0]
          : undefined;
    const digit2 =
      count === undefined
        ? "-"
        : count.toString().length > 1
          ? count.toString()[1]
          : count.toString()[0];

    return (
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.flex1,

          {
            paddingVertical: spacing(12),
            backgroundColor: colorZone,
            borderRadius: spacing(8),
            gap: spacing(5),
          },
        ]}
      >
        <Text
          weight={300}
          textTransform="uppercase"
          color={rgba(Colors.white, 0.7)}
          style={{
            fontSize: font(12),
            lineHeight: font(12),
          }}
        >
          {label}
        </Text>

        <View style={[flexStyles.rowCentered]}>
          {digit1 && (
            <Text
              weight={300}
              color={rgba(Colors.white, 0.6)}
              style={{
                fontSize: font(24),
                lineHeight: font(24),
                width: spacing(14),
                textAlign: "center",
              }}
            >
              {digit1}
            </Text>
          )}
          <Text
            weight={600}
            color={
              digit2 === "-"
                ? rgba(Colors.white, 0.2)
                : canKnockSelectedPins
                  ? Colors.accentGreen
                  : Colors.accentBlue
            }
            style={{
              fontSize: font(24),
              lineHeight: font(24),
              width: spacing(18),
              textAlign: "center",
            }}
          >
            {digit2}
          </Text>
        </View>
      </View>
    );
  };

  const FrameMark = ({
    markText,
    ballNum,
    currentFrame,
  }: {
    markText: string;
    ballNum: number;
    currentFrame: boolean;
  }) => {
    return (
      <Text
        style={[
          flexStyles.colCentered,
          {
            fontSize: font(12),
            lineHeight: font(12),
            width: "50%",
            height: "100%",
            aspectRatio: 1,
            borderBottomWidth: 1,
            borderLeftWidth: ballNum === 2 ? 1 : 0,
            borderColor: currentFrame ? Colors.accentBlue : Colors.K700,
          },
        ]}
      >
        {markText}
      </Text>
    );
  };

  return (
    <GameWrapper
      outcome={
        game.phase !== "gameEnd"
          ? "playing"
          : game.totalScore >= WIN_SCORE
            ? "won"
            : "lost"
      }
      winLoseMessage={game.winLoseMessage}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={String(game.totalScore)}
      hideScore
    >
      {cardMap}

      {/* Frames */}
      <View
        style={[
          getZoneStylesById("frames"),
          flexStyles.rowCentered,
          {
            backgroundColor: colorZone,
            paddingHorizontal: spacing(8),
            borderRadius: spacing(8),
          },
        ]}
      >
        {game.frames.map((frame, frameIdx) => {
          const ball1Mark =
            frame.ball1Type === "strike"
              ? "X"
              : (frame.ball1Pins?.toString() ?? "");
          const ball2Mark =
            frame.ball2Type === "spare"
              ? "/"
              : (frame.ball2Pins?.toString() ?? "");

          const currentFrame = game.currentFrame === frameIdx;

          return (
            <View
              key={`frame-${frameIdx}`}
              style={{
                flex: 1,
                alignItems: "center",
                gap: spacing(3),
              }}
            >
              <Text
                size="xs"
                weight={currentFrame ? 600 : 300}
                color={
                  currentFrame ? Colors.accentBlue : rgba(Colors.white, 0.4)
                }
              >
                {frameIdx + 1}
              </Text>
              <View
                style={[
                  flexStyles.colCentered,
                  flexStyles.fullWidth,
                  {
                    position: "relative",
                    aspectRatio: 0.7,
                    borderWidth: 1,
                    borderLeftWidth: frameIdx === 0 ? 1 : 0,
                    borderColor: Colors.K700,
                    backgroundColor: currentFrame
                      ? rgba(Colors.accentBlue, 0.1)
                      : "transparent",
                  },
                ]}
              >
                {currentFrame && (
                  <View
                    style={{
                      ...StyleSheet.absoluteFill,
                      boxShadow: `0 0 0 1px ${Colors.accentBlue}`,
                      zIndex: 10,
                    }}
                  />
                )}

                <View
                  style={[
                    flexStyles.rowCentered,
                    flexStyles.fullWidth,
                    { position: "relative", zIndex: 1, height: "40%" },
                  ]}
                >
                  <FrameMark
                    markText={ball1Mark}
                    ballNum={1}
                    currentFrame={currentFrame}
                  />
                  <FrameMark
                    markText={ball2Mark}
                    ballNum={2}
                    currentFrame={currentFrame}
                  />
                </View>

                <Text
                  size="md"
                  style={[
                    flexStyles.colCentered,
                    { position: "relative", zIndex: 1, height: "60%" },
                  ]}
                >
                  {frame.score ?? ""}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          flexStyles.spaceAround,
        ]}
      >
        {/* End Ball */}
        <Button
          size="sm"
          taller
          // flat
          onPress={endBallNow}
          text={i18n.t("games:bowling.endBall")}
          theme="blue"
          fullWidth
          disabled={game.phase === "gameEnd"}
        />

        {/* Pins/Ball Count */}
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: spacing(8) },
          ]}
        >
          <CountText
            count={selectedPinSum}
            label={i18n.t("games:bowling.pins")}
          />
          <CountText
            count={
              selectedBallCard ? getCardValue(selectedBallCard) % 10 : undefined
            }
            label={i18n.t("games:bowling.ball")}
          />
        </View>

        {/* Knock Pins */}
        <Button
          size="md"
          taller
          onPress={knockSelectedPins}
          text={i18n.t("games:bowling.throw")}
          theme="green"
          fullWidth
          disabled={!canKnockSelectedPins}
          style={[
            {
              width: cardWidth * 1.9,
              height: cardWidth * 1.9,
              borderRadius: (cardWidth * 1.9) / 2,
            },
          ]}
        />
      </View>

      {/* Ball Num */}
      {/* <View
        style={[
          getZoneStylesById("ball-num"),
          flexStyles.colCentered,
          {
            borderRadius: spacing(8),
            gap: spacing(4),
          },
        ]}
      >
        <Text size="xs" weight={300} lineHeight={1} textTransform="uppercase">
          {isBonusMode ? "Bonus Ball" : "Ball"}
        </Text>
        <Text size="xxl" weight={700} lineHeight={1}>
          {isBonusMode
            ? game.bonusBallsRemaining === 2
              ? "1"
              : "2"
            : game.currentBall}
        </Text>
      </View> */}
    </GameWrapper>
  );
}
