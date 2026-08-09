import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isAce,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

export type MidnightVigilDifficulty = "street" | "kingpin" | "city";
export type MidnightVigilPlayMode = "standard" | "smoke" | "grapple";

export type MidnightVigilThreat = {
  card: PlayingCard;
  responses: PlayingCard[];
  smoked: boolean;
};

export type MidnightVigilGameState = {
  encounterDeck: PlayingCard[];
  playDeck: PlayingCard[];
  discard: PlayingCard[];
  trackers: PlayingCard[];
  currentEncounter: PlayingCard | null;
  threats: MidnightVigilThreat[];
  currentResponse: PlayingCard | null;
  responsesDrawn: number;
  smokeUsed: boolean;
  grapplePair: [number, number] | null;
  grappleResponses: PlayingCard[];
  grappleAnchor: number | null;
  armor: number;
  health: number;
  encounterNumber: number;
  difficulty: MidnightVigilDifficulty;
  ended: boolean;
  won: boolean;
  score?: number;
  message: string;
};

const MAX_TRACK = 10;
const TOTAL_ENCOUNTERS = 12;
const EMPTY_MESSAGE = "Draw a Response, then choose how to play it.";

function createMidnightVigilDeck() {
  return createDeck({ includeJokers: true, faceUp: false });
}

function encounterValue(card: PlayingCard) {
  if (card.rank === "J") return 11;
  if (card.rank === "Q") return 12;
  return 13;
}

function highestNumberThreat(threats: MidnightVigilThreat[]) {
  const values = threats
    .filter(({ card }) => !isAce(card) && !isJoker(card))
    .map(({ card }) => rankValue(card));
  return Math.max(1, ...values);
}

function lowestNumberThreat(threats: MidnightVigilThreat[]) {
  const values = threats
    .filter(({ card }) => !isAce(card) && !isJoker(card))
    .map(({ card }) => rankValue(card));
  return Math.min(10, ...values);
}

function threatValue(
  threat: MidnightVigilThreat,
  threats: MidnightVigilThreat[],
) {
  if (isAce(threat.card) || isJoker(threat.card)) {
    return highestNumberThreat(threats);
  }
  return rankValue(threat.card);
}

function responseValue(card: PlayingCard, threats: MidnightVigilThreat[]) {
  return isAce(card) ? lowestNumberThreat(threats) : rankValue(card);
}

function standardThreatCleared(
  threat: MidnightVigilThreat,
  threats: MidnightVigilThreat[],
) {
  if (threat.smoked) return true;
  if (threat.responses.length === 0) return false;
  const target = threatValue(threat, threats);
  const responseTotal = threat.responses.reduce(
    (sum, card) => sum + responseValue(card, threats),
    0,
  );
  return responseTotal >= target && responseTotal <= target + 3;
}

function grappleCleared(game: MidnightVigilGameState) {
  if (!game.grapplePair || game.grappleResponses.length === 0) return false;
  const target = game.grapplePair.reduce(
    (sum, index) => sum + threatValue(game.threats[index], game.threats),
    0,
  );
  const responseTotal = game.grappleResponses.reduce(
    (sum, card) => sum + responseValue(card, game.threats),
    0,
  );
  return responseTotal >= target && responseTotal <= target + 3;
}

function difficultyDamage(
  difficulty: MidnightVigilDifficulty,
  encounter: PlayingCard,
) {
  if (difficulty === "street") return encounter.rank === "K" ? 1 : 0;
  if (difficulty === "kingpin") {
    return encounter.rank === "Q" || encounter.rank === "K" ? 1 : 0;
  }
  if (encounter.rank === "Q") return 1;
  return encounter.rank === "K" ? 2 : 0;
}

function calculateRound(game: MidnightVigilGameState) {
  const grappleIndexes = new Set(game.grapplePair ?? []);
  const grappleSuccess = grappleCleared(game);
  let damage = 0;

  game.threats.forEach((threat, index) => {
    if (grappleIndexes.has(index)) return;
    if (!standardThreatCleared(threat, game.threats)) damage += 1;
  });

  if (game.grapplePair && !grappleSuccess) damage += 2;
  if (damage > 0 && game.currentEncounter) {
    damage += difficultyDamage(game.difficulty, game.currentEncounter);
  }

  const healing =
    !game.smokeUsed || game.responsesDrawn < game.threats.length ? 1 : 0;
  return { damage, healing, netDamage: damage - healing, grappleSuccess };
}

function applyTrackChange(game: MidnightVigilGameState, netDamage: number) {
  if (netDamage > 0) {
    const armorDamage = Math.min(game.armor, netDamage);
    game.armor -= armorDamage;
    game.health = Math.max(0, game.health - (netDamage - armorDamage));
    return;
  }

  if (netDamage < 0) {
    let healing = -netDamage;
    const healthHeal = Math.min(MAX_TRACK - game.health, healing);
    game.health += healthHeal;
    healing -= healthHeal;
    game.armor = Math.min(MAX_TRACK, game.armor + healing);
  }
}

function drawPlayCard(game: MidnightVigilGameState) {
  if (game.playDeck.length === 0 && game.discard.length > 0) {
    game.playDeck = shuffle(flipAllToBack(game.discard));
    game.discard = [];
  }
  return game.playDeck.pop();
}

function dealThreats(game: MidnightVigilGameState, finalEncounter: boolean) {
  const threats: MidnightVigilThreat[] = [];
  let targetCount = finalEncounter ? 6 : 4;

  while (threats.length < targetCount && threats.length < 6) {
    const card = drawPlayCard(game);
    if (!card) break;
    const faceCard = flipToFace(card);
    threats.push({ card: faceCard, responses: [], smoked: false });
    if (!finalEncounter && isJoker(faceCard)) {
      targetCount = Math.min(6, targetCount + 1);
    }
  }

  game.threats = threats;
}

function buildEncounterDeck(cards: PlayingCard[]) {
  const courts = cards.filter(isFace);
  const jesterKing = courts.find(
    (card) => card.rank === "K" && card.suit === "diamonds",
  );
  if (!jesterKing) return [];

  const jacks = shuffle(courts.filter((card) => card.rank === "J"));
  const queens = shuffle(courts.filter((card) => card.rank === "Q"));
  const kings = shuffle(
    courts.filter((card) => card.rank === "K" && card.id !== jesterKing.id),
  );
  return [
    flipToBack(jesterKing),
    ...flipAllToBack(kings),
    ...flipAllToBack(queens),
    ...flipAllToBack(jacks),
  ];
}

function setupFromDiscard(game: MidnightVigilGameState) {
  const cards = shuffle(flipAllToBack(game.discard));
  game.encounterDeck = buildEncounterDeck(cards);
  game.playDeck = shuffle(
    cards.filter(
      (card) =>
        !isFace(card) &&
        !(card.rank === "10" && ["hearts", "spades"].includes(card.suit)),
    ),
  );
  game.trackers = cards.filter(
    (card) => card.rank === "10" && ["hearts", "spades"].includes(card.suit),
  );
  game.discard = [];
  game.currentEncounter = flipToFace(game.encounterDeck.pop()!);
  game.encounterNumber = 1;
  game.armor = MAX_TRACK;
  game.health = MAX_TRACK;
  game.currentResponse = null;
  game.responsesDrawn = 0;
  game.smokeUsed = false;
  game.grapplePair = null;
  game.grappleResponses = [];
  game.grappleAnchor = null;
  game.ended = false;
  game.won = false;
  game.score = undefined;
  game.message = EMPTY_MESSAGE;
  dealThreats(game, false);
}

const gameStateInitial: MidnightVigilGameState = {
  encounterDeck: [],
  playDeck: [],
  discard: createMidnightVigilDeck(),
  trackers: [],
  currentEncounter: null,
  threats: [],
  currentResponse: null,
  responsesDrawn: 0,
  smokeUsed: false,
  grapplePair: null,
  grappleResponses: [],
  grappleAnchor: null,
  armor: MAX_TRACK,
  health: MAX_TRACK,
  encounterNumber: 0,
  difficulty: "kingpin",
  ended: false,
  won: false,
  message: "Shuffling the city deck...",
};

async function resetAndSetup(
  setGame: (updater: (draft: MidnightVigilGameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.encounterDeck,
      ...draft.playDeck,
      ...draft.discard,
      ...draft.trackers,
      ...(draft.currentEncounter ? [draft.currentEncounter] : []),
      ...(draft.currentResponse ? [draft.currentResponse] : []),
      ...draft.threats.flatMap((threat) => [threat.card, ...threat.responses]),
      ...draft.grappleResponses,
    ];
    draft.discard = shuffle(flipAllToBack(allCards));
    draft.encounterDeck = [];
    draft.playDeck = [];
    draft.trackers = [];
    draft.currentEncounter = null;
    draft.currentResponse = null;
    draft.threats = [];
    draft.grappleResponses = [];
    draft.grapplePair = null;
    draft.grappleAnchor = null;
    draft.encounterNumber = 0;
    draft.message = "Shuffling the city deck...";
    draft.ended = false;
    draft.won = false;
  });

  await delay();
  setGame((draft) => setupFromDiscard(draft));
}

function addResponseJoker(game: MidnightVigilGameState, joker: PlayingCard) {
  if (game.threats.length < 6) {
    game.threats.push({ card: joker, responses: [], smoked: false });
    return;
  }

  const grappleIndexes = new Set(game.grapplePair ?? []);
  const candidates = game.threats
    .map((threat, index) => ({ threat, index }))
    .filter(
      ({ threat, index }) =>
        !grappleIndexes.has(index) &&
        !standardThreatCleared(threat, game.threats),
    )
    .sort(
      (a, b) =>
        threatValue(a.threat, game.threats) -
        threatValue(b.threat, game.threats),
    );
  const replaced = candidates[0];
  if (!replaced) {
    game.discard.push(flipToBack(joker));
    return;
  }
  game.discard.push(
    flipToBack(replaced.threat.card),
    ...flipAllToBack(replaced.threat.responses),
  );
  game.threats[replaced.index] = {
    card: joker,
    responses: [],
    smoked: false,
  };
}

function scoreFor(game: MidnightVigilGameState) {
  const difficultyBonus =
    game.difficulty === "city" ? 10 : game.difficulty === "kingpin" ? 5 : 0;
  return game.armor + game.health + difficultyBonus;
}

export const midnightVigilRules = {
  createDeck: createMidnightVigilDeck,
  buildEncounterDeck,
  setupFromDiscard,
  threatValue,
  responseValue,
  standardThreatCleared,
  grappleCleared,
  difficultyDamage,
  calculateRound,
  applyTrackChange,
  addResponseJoker,
};

const trackerHeight = 0.28;
const decksRow = 0.45;
const threatsRow = 1.65;
const responseRow = 3.35;
const controlsRow = 4.42;

export default function MidnightVigil() {
  const { spacing, font } = useResponsiveMetrics();
  const { colorDark, colorPale } = useGameColors();
  const [playMode, setPlayMode] = useState<MidnightVigilPlayMode>("standard");
  const {
    game,
    setGame,
    reset,
    isLoaded,
    isSettingUp,
    canUndo,
    undo,
    saveUndoState,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    resetNonGameStates: async () => setPlayMode("standard"),
  });

  const roundResult = useMemo(() => calculateRound(game), [game]);

  function drawResponse() {
    if (
      isSettingUp ||
      game.ended ||
      game.currentResponse ||
      game.responsesDrawn >= game.threats.length
    ) {
      return;
    }
    saveUndoState(game);
    setGame((draft) => {
      const card = drawPlayCard(draft);
      if (!card) {
        draft.message = "No cards remain to draw.";
        return;
      }
      const faceCard = flipToFace(card);
      if (isJoker(faceCard)) {
        addResponseJoker(draft, faceCard);
        draft.message = "Chaos! The Joker becomes another Threat.";
      } else {
        draft.currentResponse = faceCard;
        draft.responsesDrawn += 1;
        draft.message = "Choose a Threat for this Response.";
      }
    });
  }

  function playOnThreat(index: number) {
    if (!game.currentResponse || game.ended) return;
    const threat = game.threats[index];
    if (!threat) return;

    if (playMode === "smoke") {
      if (
        game.smokeUsed ||
        isJoker(threat.card) ||
        threat.card.suit === game.currentEncounter?.suit ||
        game.grapplePair?.includes(index)
      ) {
        return;
      }
      saveUndoState(game);
      setGame((draft) => {
        const response = draft.currentResponse;
        if (!response) return;
        draft.threats[index].responses.push(flipToBack(response));
        draft.threats[index].smoked = true;
        draft.currentResponse = null;
        draft.smokeUsed = true;
        draft.message = "Smoke Bomb deployed.";
      });
      setPlayMode("standard");
      return;
    }

    if (playMode === "grapple") {
      if (game.grapplePair) {
        if (!game.grapplePair.includes(index)) return;
        saveUndoState(game);
        setGame((draft) => {
          if (!draft.currentResponse) return;
          draft.grappleResponses.push(draft.currentResponse);
          draft.currentResponse = null;
          draft.message = "Response added to the Grapple Line.";
        });
        return;
      }

      if (game.grappleAnchor === null) {
        setGame((draft) => {
          draft.grappleAnchor = index;
          draft.message = "Tap an adjacent Threat to connect the line.";
        });
        return;
      }

      if (Math.abs(game.grappleAnchor - index) !== 1) return;
      saveUndoState(game);
      setGame((draft) => {
        if (!draft.currentResponse || draft.grappleAnchor === null) return;
        draft.grapplePair = [draft.grappleAnchor, index].sort(
          (a, b) => a - b,
        ) as [number, number];
        draft.grappleResponses.push(draft.currentResponse);
        draft.currentResponse = null;
        draft.grappleAnchor = null;
        draft.message = "Grapple Line connected.";
      });
      return;
    }

    if (game.grapplePair?.includes(index) || threat.smoked) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse) return;
      draft.threats[index].responses.push(draft.currentResponse);
      draft.currentResponse = null;
      draft.message = "Response placed. Draw again or resolve.";
    });
  }

  function resolveEncounter() {
    if (game.ended || game.currentResponse || !game.currentEncounter) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentEncounter) return;
      const result = calculateRound(draft);
      applyTrackChange(draft, result.netDamage);
      const completedEncounter = draft.currentEncounter;
      draft.discard.push(
        flipToBack(completedEncounter),
        ...draft.threats.flatMap((threat) => [
          flipToBack(threat.card),
          ...flipAllToBack(threat.responses),
        ]),
        ...flipAllToBack(draft.grappleResponses),
      );

      if (draft.health <= 0) {
        draft.ended = true;
        draft.won = false;
        draft.message = "The city is lost.";
        draft.currentEncounter = null;
        draft.threats = [];
        return;
      }

      if (draft.encounterDeck.length === 0) {
        draft.ended = true;
        draft.won = true;
        draft.score = scoreFor(draft);
        draft.message = "The Jester King is defeated.";
        draft.currentEncounter = null;
        draft.threats = [];
        return;
      }

      draft.currentEncounter = flipToFace(draft.encounterDeck.pop()!);
      draft.encounterNumber += 1;
      draft.currentResponse = null;
      draft.responsesDrawn = 0;
      draft.smokeUsed = false;
      draft.grapplePair = null;
      draft.grappleResponses = [];
      draft.grappleAnchor = null;
      draft.message = EMPTY_MESSAGE;
      dealThreats(
        draft,
        draft.currentEncounter.rank === "K" &&
          draft.currentEncounter.suit === "diamonds",
      );
    });
    setPlayMode("standard");
  }

  const zones: MapZone[] = useMemo(() => {
    const threatZones = game.threats.map(
      (threat, index): MapZone => ({
        id: `threat-${index}`,
        name: "threat",
        pileIndex: index,
        cards: [threat.card, ...threat.responses],
        col: index,
        row: threatsRow,
        fan: { direction: "down", offset: 0.22 },
        placeholder: { text: `${index + 1}` },
        baseZIndex: 20 + index * 10,
      }),
    );
    const grappleZones = game.grappleResponses.map(
      (card, index): MapZone => ({
        id: `grapple-${index}`,
        name: "grapple",
        cards: [card],
        col: (game.grapplePair?.[0] ?? 0) + 0.52 + index * 0.28,
        row: threatsRow + 0.46,
        rotation: 90,
        baseZIndex: 100 + index,
      }),
    );

    return [
      {
        id: "armor-track",
        col: 0,
        row: 0,
        width: 2.8,
        height: trackerHeight,
      },
      {
        id: "health-track",
        col: 3.2,
        row: 0,
        width: 2.8,
        height: trackerHeight,
      },
      {
        id: "encounter",
        name: "encounter",
        cards: game.currentEncounter ? [game.currentEncounter] : [],
        col: 2.5,
        row: decksRow,
        placeholder: { text: "Villain", showCount: true },
        baseZIndex: 10,
      },
      {
        id: "encounter-deck",
        name: "encounter-deck",
        cards: game.encounterDeck,
        col: 3.7,
        row: decksRow,
        fan: { maxVisible: 2 },
        placeholder: { text: "City", showCount: true },
      },
      {
        id: "play-deck",
        name: "play-deck",
        cards: game.playDeck,
        col: 0,
        row: decksRow,
        fan: { maxVisible: 2 },
        placeholder: { text: "Play", showCount: true },
        baseZIndex: 10,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4.9,
        row: decksRow,
        fan: { maxVisible: 2 },
        placeholder: { text: "Discard", showCount: true },
      },
      ...threatZones,
      ...grappleZones,
      {
        id: "current-response",
        name: "current-response",
        cards: game.currentResponse ? [game.currentResponse] : [],
        col: 2.5,
        row: responseRow,
        placeholder: { text: "Response" },
        baseZIndex: 150,
      },
      {
        id: "message",
        col: 0,
        row: controlsRow - 0.36,
        width: "full",
        height: 0.28,
      },
      {
        id: "controls",
        col: 0,
        row: controlsRow,
        width: "full",
        height: 1.28,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "threat") {
      const threatIndex = mappedCard.pileIndex ?? -1;
      return {
        onPress: () => playOnThreat(threatIndex),
        selectColor:
          game.grappleAnchor === threatIndex ? Colors.buttonOrange : undefined,
        isSelected: game.grappleAnchor === threatIndex,
      };
    }
    if (mappedCard.zoneName === "play-deck") {
      return { clickThroughCards: true };
    }
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.id.startsWith("threat-")) {
        const index = zone.pileIndex ?? -1;
        return { onPress: () => playOnThreat(index) };
      }
      if (zone.id === "play-deck") {
        return { onPress: drawResponse, isDisabled: !!game.currentResponse };
      }
    },
    cardSize: "small",
    fixedCols: 6,
    fixedRows: 5.85,
    paddingTop: 0.12,
    paddingBottom: 0.12,
    paddingLeft: 0.16,
    paddingRight: 0.16,
  });

  const encounterName = game.currentEncounter
    ? `${game.currentEncounter.rank} of ${game.currentEncounter.suit}`
    : "City cleared";
  const canDraw =
    !game.currentResponse &&
    !game.ended &&
    game.responsesDrawn < game.threats.length;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      winLoseMessage={game.message}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={getZoneStylesById("armor-track")}>
        <ProgressBar
          totalValue={MAX_TRACK}
          progressValue={game.armor}
          color="blue"
          autoTallyText
          scaledHeight={cardHeight * trackerHeight}
          iconName="spades"
        />
      </View>
      <View style={getZoneStylesById("health-track")}>
        <ProgressBar
          totalValue={MAX_TRACK}
          progressValue={game.health}
          color="red"
          autoTallyText
          scaledHeight={cardHeight * trackerHeight}
          iconName="heart"
        />
      </View>

      <View
        style={[
          getZoneStylesById("message"),
          flexStyles.rowCentered,
          { paddingHorizontal: spacing(4) },
        ]}
      >
        <Text
          style={{ color: colorPale, fontSize: font(11), textAlign: "center" }}
          numberOfLines={2}
        >
          {`#${game.encounterNumber} ${encounterName} · ${game.message}`}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("controls"),
          flexStyles.colCentered,
          {
            gap: spacing(5),
            padding: spacing(5),
            backgroundColor: rgba(colorDark, 0.72),
            borderRadius: spacing(6),
          },
        ]}
      >
        <View style={[flexStyles.rowCentered, { gap: spacing(5) }]}>
          {(["standard", "smoke", "grapple"] as MidnightVigilPlayMode[]).map(
            (mode) => (
              <Button
                key={mode}
                text={
                  mode === "standard"
                    ? "Play"
                    : mode === "smoke"
                      ? "Smoke"
                      : "Grapple"
                }
                size="xs"
                theme={playMode === mode ? "orange" : colorDark}
                disabled={
                  !game.currentResponse ||
                  (mode === "smoke" && game.smokeUsed) ||
                  (mode === "grapple" &&
                    !!game.grapplePair &&
                    !game.currentResponse)
                }
                onPress={() => {
                  setPlayMode(mode);
                  if (mode !== "grapple") {
                    setGame((draft) => {
                      draft.grappleAnchor = null;
                    });
                  }
                }}
              />
            ),
          )}
        </View>
        <View style={[flexStyles.rowCentered, { gap: spacing(5) }]}>
          <Button
            text={`Draw ${game.responsesDrawn}/${game.threats.length}`}
            size="xs"
            theme="blue"
            disabled={!canDraw}
            onPress={drawResponse}
          />
          <Button
            text={`Resolve ${roundResult.damage}-${roundResult.healing}`}
            size="xs"
            theme="green"
            disabled={!!game.currentResponse || game.ended}
            onPress={resolveEncounter}
          />
        </View>
        <View style={[flexStyles.rowCentered, { gap: spacing(4) }]}>
          {(["street", "kingpin", "city"] as MidnightVigilDifficulty[]).map(
            (difficulty) => (
              <Button
                key={difficulty}
                text={
                  difficulty === "street"
                    ? "Street"
                    : difficulty === "kingpin"
                      ? "Kingpin"
                      : "City"
                }
                size="xs"
                textOnly
                theme={game.difficulty === difficulty ? "orange" : colorPale}
                onPress={() =>
                  setGame((draft) => {
                    draft.difficulty = difficulty;
                  })
                }
              />
            ),
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
