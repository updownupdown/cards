import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
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

import { i18n } from "@/i18n";
export type NightVigilDifficulty = "street" | "kingpin" | "city";
export type NightVigilPlayMode = "standard" | "smoke" | "grapple";

export type NightVigilThreat = {
  card: PlayingCard;
  responses: PlayingCard[];
  smoked: boolean;
};

export type NightVigilGameState = {
  encounterDeck: PlayingCard[];
  playDeck: PlayingCard[];
  discard: PlayingCard[];
  trackers: PlayingCard[];
  currentEncounter: PlayingCard | null;
  threats: NightVigilThreat[];
  currentResponse: PlayingCard | null;
  responsesDrawn: number;
  smokeUsed: boolean;
  grapplePair: [number, number] | null;
  grappleResponses: PlayingCard[];
  grappleAnchor: number | null;
  armor: number;
  health: number;
  encounterNumber: number;
  difficulty: NightVigilDifficulty;
  ended: boolean;
  won: boolean;
  score?: number;
};

const MAX_TRACK = 10;

function createNightVigilDeck() {
  return createDeck({ includeJokers: true, faceUp: false });
}

function highestNumberThreat(threats: NightVigilThreat[]) {
  const values = threats
    .filter(({ card }) => !isAce(card) && !isJoker(card))
    .map(({ card }) => rankValue(card));
  return Math.max(1, ...values);
}

function lowestNumberThreat(threats: NightVigilThreat[]) {
  const values = threats
    .filter(({ card }) => !isAce(card) && !isJoker(card))
    .map(({ card }) => rankValue(card));
  return Math.min(10, ...values);
}

function threatValue(threat: NightVigilThreat, threats: NightVigilThreat[]) {
  if (isAce(threat.card) || isJoker(threat.card)) {
    return highestNumberThreat(threats);
  }
  return rankValue(threat.card);
}

function responseValue(card: PlayingCard, threats: NightVigilThreat[]) {
  return isAce(card) ? lowestNumberThreat(threats) : rankValue(card);
}

function standardThreatCleared(
  threat: NightVigilThreat,
  threats: NightVigilThreat[],
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

function grappleCleared(game: NightVigilGameState) {
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
  difficulty: NightVigilDifficulty,
  encounter: PlayingCard,
) {
  if (difficulty === "street") return encounter.rank === "K" ? 1 : 0;
  if (difficulty === "kingpin") {
    return encounter.rank === "Q" || encounter.rank === "K" ? 1 : 0;
  }
  if (encounter.rank === "Q") return 1;
  return encounter.rank === "K" ? 2 : 0;
}

function calculateRound(game: NightVigilGameState) {
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

function applyTrackChange(game: NightVigilGameState, netDamage: number) {
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

function drawPlayCard(game: NightVigilGameState) {
  if (game.playDeck.length === 0 && game.discard.length > 0) {
    game.playDeck = shuffle(flipAllToBack(game.discard));
    game.discard = [];
  }
  return game.playDeck.pop();
}

function dealThreats(game: NightVigilGameState, finalEncounter: boolean) {
  const threats: NightVigilThreat[] = [];
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

function setupFromDiscard(game: NightVigilGameState) {
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
  dealThreats(game, false);
}

const gameStateInitial: NightVigilGameState = {
  encounterDeck: [],
  playDeck: [],
  discard: createNightVigilDeck(),
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
};

async function resetAndSetup(
  setGame: (updater: (draft: NightVigilGameState) => void) => void,
  difficulty: NightVigilDifficulty,
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
    draft.difficulty = difficulty;
    draft.ended = false;
    draft.won = false;
  });

  await delay();
  setGame((draft) => setupFromDiscard(draft));
}

function addResponseJoker(game: NightVigilGameState, joker: PlayingCard) {
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

function scoreFor(game: NightVigilGameState) {
  const difficultyBonus =
    game.difficulty === "city" ? 10 : game.difficulty === "kingpin" ? 5 : 0;
  return game.armor + game.health + difficultyBonus;
}

export const nightVigilRules = {
  createDeck: createNightVigilDeck,
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

const trackerHeight = 0.36;
const responseRow = 3.5;

export default function NightVigil() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const difficulty = useGameSettingValue(
    "nightVigilDifficulty",
  ) as NightVigilDifficulty;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const [playMode, setPlayMode] = useState<NightVigilPlayMode>("standard");
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
      await resetAndSetup(setGame, difficultyRef.current);
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
        return;
      }
      const faceCard = flipToFace(card);
      if (isJoker(faceCard)) {
        addResponseJoker(draft, faceCard);
      } else {
        draft.currentResponse = faceCard;
        draft.responsesDrawn += 1;
      }
    });
  }

  function canSmokeThreat(index: number) {
    const threat = game.threats[index];
    return (
      !isSettingUp &&
      !!game.currentResponse &&
      !game.ended &&
      !game.smokeUsed &&
      !!threat &&
      !isJoker(threat.card) &&
      threat.card.suit !== game.currentEncounter?.suit &&
      !game.grapplePair?.includes(index)
    );
  }

  function smokeThreat(index: number) {
    if (!canSmokeThreat(index)) return;
    saveUndoState(game);
    setGame((draft) => {
      const response = draft.currentResponse;
      const threat = draft.threats[index];
      if (!response || !threat) return;
      threat.responses.push(flipToBack(response));
      threat.smoked = true;
      draft.currentResponse = null;
      draft.smokeUsed = true;
    });
    setPlayMode("standard");
  }

  function canGrappleThreat(index: number) {
    const threat = game.threats[index];
    return !!threat && !threat.smoked && threat.responses.length === 0;
  }

  function canGrapplePair(index: number) {
    return (
      !isSettingUp &&
      !!game.currentResponse &&
      !game.ended &&
      !game.grapplePair &&
      index >= 0 &&
      index + 1 < game.threats.length &&
      canGrappleThreat(index) &&
      canGrappleThreat(index + 1)
    );
  }

  function grappleThreatPair(index: number) {
    if (!canGrapplePair(index)) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse || draft.grapplePair) return;
      draft.grapplePair = [index, index + 1];
      draft.grappleResponses.push(draft.currentResponse);
      draft.currentResponse = null;
      draft.grappleAnchor = null;
    });
    setPlayMode("standard");
  }

  function canAddGrappleResponse() {
    return (
      !isSettingUp &&
      !!game.currentResponse &&
      !game.ended &&
      !!game.grapplePair
    );
  }

  function addGrappleResponse() {
    if (!canAddGrappleResponse()) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse || !draft.grapplePair) return;
      draft.grappleResponses.push(draft.currentResponse);
      draft.currentResponse = null;
    });
  }

  function isThreatNeutralized(index: number) {
    if (game.grapplePair?.includes(index)) return grappleCleared(game);
    const threat = game.threats[index];
    return !!threat && standardThreatCleared(threat, game.threats);
  }

  function playOnThreat(index: number) {
    if (!game.currentResponse || game.ended) return;
    const threat = game.threats[index];
    if (!threat) return;

    if (playMode === "smoke") {
      smokeThreat(index);
      return;
    }

    if (playMode === "grapple") {
      if (game.grapplePair) {
        if (!game.grapplePair.includes(index)) return;
        addGrappleResponse();
        return;
      }

      if (game.grappleAnchor === null) {
        if (!canGrappleThreat(index)) return;
        setGame((draft) => {
          draft.grappleAnchor = index;
        });
        return;
      }

      if (Math.abs(game.grappleAnchor - index) !== 1) return;
      const pairStartIndex = Math.min(game.grappleAnchor, index);
      if (!canGrapplePair(pairStartIndex)) return;
      saveUndoState(game);
      setGame((draft) => {
        if (!draft.currentResponse || draft.grappleAnchor === null) return;
        draft.grapplePair = [draft.grappleAnchor, index].sort(
          (a, b) => a - b,
        ) as [number, number];
        draft.grappleResponses.push(draft.currentResponse);
        draft.currentResponse = null;
        draft.grappleAnchor = null;
      });
      return;
    }

    if (game.grapplePair?.includes(index) || threat.smoked) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse) return;
      draft.threats[index].responses.push(draft.currentResponse);
      draft.currentResponse = null;
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
        draft.currentEncounter = null;
        draft.threats = [];
        return;
      }

      if (draft.encounterDeck.length === 0) {
        draft.ended = true;
        draft.won = true;
        draft.score = scoreFor(draft);
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
      dealThreats(
        draft,
        draft.currentEncounter.rank === "K" &&
          draft.currentEncounter.suit === "diamonds",
      );
    });
    setPlayMode("standard");
  }

  const zones: MapZone[] = useMemo(() => {
    const threatStartCol =
      game.threats.length > 5 ? 0.5 : game.threats.length > 4 ? 0.75 : 1;

    const threatZones = game.threats.map(
      (threat, index): MapZone => ({
        id: `threat-${index}`,
        name: "threat",
        pileIndex: index,
        cards: [threat.card, ...threat.responses],
        col: index + threatStartCol,
        row: 1.5,
        fan: { direction: "down", offset: 0.22 },
        placeholder: {},
        baseZIndex: index,
      }),
    );

    const smokeZones = game.threats.map(
      (_, index): MapZone => ({
        id: `smoke-${index}`,
        col: index + threatStartCol,
        row: 1,
        baseZIndex: 50,
        height: 0.6,
      }),
    );
    const grappleHookZones = game.threats.slice(0, -1).map(
      (_, index): MapZone => ({
        id: `grapple-hook-${index}`,
        col: index + threatStartCol + 0.5,
        row: 2.4,
        width: 1,
        height: 0.6,
        baseZIndex: 50,
      }),
    );

    const grappleZones = game.grappleResponses.map(
      (card, index): MapZone => ({
        id: `grapple-${index}`,
        name: "grapple",
        cards: [card],
        col: threatStartCol + (game.grapplePair?.[0] ?? 0) + 0.52,
        row: 1.8 + index * 0.3,
        rotation: 90,
        baseZIndex: 50 + index,
      }),
    );

    return [
      {
        id: "bars",
        col: 3.2,
        row: 0,
        width: 2.8,
      },
      {
        id: "encounter-deck",
        name: "encounter-deck",
        cards: game.encounterDeck,
        col: 0,
        row: 0,
        fan: { maxVisible: 2 },
        placeholder: {
          text: i18n.t("games:nightVigil.city"),
          showCount: true,
          infoPos: "right",
        },
      },
      {
        id: "encounter",
        name: "encounter",
        cards: game.currentEncounter ? [game.currentEncounter] : [],
        col: 1.5,
        row: 0,
        placeholder: {
          text: i18n.t("games:nightVigil.villain"),
          showCount: false,
          infoPos: "right",
        },
        baseZIndex: 10,
      },
      {
        id: "play-deck",
        name: "play-deck",
        cards: game.playDeck,
        col: 0,
        row: responseRow,
        fan: { maxVisible: 2 },
        placeholder: {},
        baseZIndex: 10,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 5,
        row: responseRow,
        fan: { maxVisible: 2 },
        placeholder: {},
      },
      ...threatZones,
      ...smokeZones,
      ...grappleHookZones,
      ...grappleZones,
      {
        id: "current-response",
        name: "current-response",
        cards: game.currentResponse ? [game.currentResponse] : [],
        col: 1.5,
        row: responseRow,
        placeholder: { text: i18n.t("games:nightVigil.response") },
        baseZIndex: 1,
      },
      {
        id: "controls",
        col: 0,
        row: 4.5,
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
      const neutralized =
        mappedCard.cardIndex === 0 && isThreatNeutralized(threatIndex);
      return {
        onPress: () => playOnThreat(threatIndex),
        selectColor: neutralized
          ? "grey"
          : game.grappleAnchor === threatIndex
            ? Colors.buttonOrange
            : undefined,
        isSelected: game.grappleAnchor === threatIndex,
        forceOverlayColor: neutralized,
      };
    }
    if (mappedCard.zoneName === "grapple") {
      return {
        onPress: addGrappleResponse,
        isDisabled: !canAddGrappleResponse(),
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
    gap: 0.14,
  });

  const canDraw =
    !game.currentResponse &&
    !game.ended &&
    game.responsesDrawn < game.threats.length;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {game.threats.map((_, index) => (
        <View
          key={`smoke-${index}`}
          style={[getZoneStylesById(`smoke-${index}`), flexStyles.rowCentered]}
        >
          {canSmokeThreat(index) && (
            <Button
              iconName="smoke-bomb"
              iconSize={30}
              size="xs"
              theme="orange"
              onPress={() => smokeThreat(index)}
              style={{
                paddingHorizontal: 0,
                paddingVertical: 0,
                width: spacing(40),
                height: spacing(40),
                borderRadius: spacing(20),
              }}
            />
          )}
        </View>
      ))}

      {game.threats.slice(0, -1).map((_, index) => (
        <View
          key={`grapple-hook-${index}`}
          style={[
            getZoneStylesById(`grapple-hook-${index}`),
            flexStyles.rowCentered,
          ]}
        >
          {canGrapplePair(index) && (
            <Button
              iconName="grapple-hook"
              iconSize={30}
              size="sm"
              theme="purple"
              halfTaller
              onPress={() => grappleThreatPair(index)}
              style={{
                paddingHorizontal: 0,
                paddingVertical: 0,
                width: spacing(60),
                height: spacing(40),
                borderRadius: spacing(20),
              }}
            />
          )}
        </View>
      ))}

      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceAround,
          getZoneStylesById("bars"),
        ]}
      >
        <ProgressBar
          totalValue={MAX_TRACK}
          progressValue={game.armor}
          color="blue"
          autoTallyText
          scaledHeight={cardHeight * trackerHeight}
          iconName="shield"
        />
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
          getZoneStylesById("controls"),
          flexStyles.rowCentered,
          {
            gap: spacing(12),
          },
        ]}
      >
        {/* Resolve */}
        <View style={[flexStyles.colCentered, { gap: spacing(12), flex: 1 }]}>
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              flexStyles.spaceBetween,
              {
                height: spacing(30),
                gap: spacing(4),
                paddingHorizontal: spacing(20),
              },
            ]}
          >
            <Text>
              {i18n.t("games:nightVigil.damage")} {roundResult.damage}
            </Text>
            <Text>
              {i18n.t("games:nightVigil.heal")} {roundResult.healing}
            </Text>
          </View>

          <Button
            text={i18n.t("cards:resolve")}
            size="md"
            theme="green"
            disabled={!!game.currentResponse || game.ended}
            onPress={resolveEncounter}
            taller
            fullWidth
          />
        </View>

        {/* Draw */}
        <View style={[flexStyles.colCentered, { gap: spacing(12), flex: 1 }]}>
          <View
            style={[
              flexStyles.rowCentered,
              { gap: spacing(4), height: spacing(30) },
            ]}
          >
            {game.threats.map((_threat, index) => (
              <View
                key={`draw-dot-${index}`}
                style={{
                  width: spacing(10),
                  height: spacing(10),
                  borderRadius: spacing(5),
                  backgroundColor: rgba(
                    colorPale,
                    index < game.responsesDrawn ? 1 : 0.3,
                  ),
                }}
              />
            ))}
          </View>

          <Button
            text={i18n.t("cards:draw")}
            size="md"
            theme="blue"
            disabled={!canDraw}
            onPress={drawResponse}
            taller
            fullWidth
          />
        </View>
      </View>
    </GameWrapper>
  );
}
