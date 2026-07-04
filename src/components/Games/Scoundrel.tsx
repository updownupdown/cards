import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { useStateManager } from "@/hooks/useStateManager";
import { Icon, IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";

type ScoundrelCardType = "monster" | "weapon" | "potion";

const MaxHealth = 20;
const TotalRooms = 12;
const EmptyRoom: (PlayingCard | null)[] = [null, null, null, null];
const MinHealthAfterSafeStart = 2;
const MaxSafeShuffleAttempts = 20;

type RoomActionSpec = {
  key: string;
  text?: string;
  onPress: () => void;
  disabled: boolean;
  showDeathIndicator?: boolean;
  iconName: IconName;
  color: string;
};

type GameState = {
  draw: PlayingCard[];
  discard: PlayingCard[];
  roomCards: (PlayingCard | null)[];
  roomNum: number;
  weaponCard: PlayingCard | null;
  weaponUsedOn: PlayingCard[];
  health: number;
  lastRoomNumRanFrom: number | null;
  isRunning: boolean;
  score?: number;
  lastActionType?: ScoundrelCardType;
  lastPotionValue?: number;
  ended: boolean;
  won: boolean;
};

type RoomSolveState = {
  roomCards: PlayingCard[];
  resolvedCount: number;
  health: number;
  weaponCard: PlayingCard | null;
  lastWeaponTargetValue: number | null;
};

// ========== Game Setup ========== //
function createScoundrelDeck() {
  return createDeck().filter((card) => {
    if (card.suit === "clubs" || card.suit === "spades") return true;
    if (card.suit === "hearts" || card.suit === "diamonds") {
      const value = rankValue(card);
      return value >= 2 && value <= 10;
    }
    return false;
  });
}

const gameStateInitial: GameState = {
  draw: shuffle(createScoundrelDeck()),
  discard: [],
  roomCards: [...EmptyRoom],
  roomNum: 1,
  weaponCard: null,
  weaponUsedOn: [],
  health: MaxHealth,
  lastRoomNumRanFrom: null,
  isRunning: false,
  score: undefined,
  lastActionType: undefined,
  lastPotionValue: undefined,
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Bring all cards to draw deck, then delay, then distribute cards to room and draw deck, so that the animation looks like a shuffle and deal.
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.discard,
      ...draft.roomCards.filter((card): card is PlayingCard => card !== null),
      ...(draft.weaponCard ? [draft.weaponCard] : []),
      ...draft.weaponUsedOn,
    ];

    draft.draw = getSafeShuffledDeck(flipAllToBack(allCards));
    draft.discard = [];
    draft.roomCards = [...EmptyRoom];
    draft.roomNum = 0;
    draft.weaponCard = null;
    draft.weaponUsedOn = [];
    draft.health = MaxHealth;
    draft.lastRoomNumRanFrom = null;
    draft.isRunning = false;
    draft.score = undefined;
    draft.lastActionType = undefined;
    draft.lastPotionValue = undefined;
    draft.ended = false;
    draft.won = false;
  });

  // Delay for animation
  await delay();
}

// ========== Helper Functions ========== //
function cardType(card: PlayingCard): ScoundrelCardType {
  if (card.suit === "diamonds") return "weapon";
  if (card.suit === "hearts") return "potion";
  return "monster";
}

function scoundrelValue(card: PlayingCard) {
  if (card.rank === "A") return 14;
  return rankValue(card);
}

function roomSolveKey(state: RoomSolveState) {
  const roomKey = state.roomCards
    .map((card) => `${card.suit}-${card.rank}`)
    .sort()
    .join("|");

  return [
    roomKey,
    state.resolvedCount,
    state.health,
    state.weaponCard
      ? `${state.weaponCard.suit}-${state.weaponCard.rank}`
      : "none",
    state.lastWeaponTargetValue ?? "none",
  ].join("::");
}

function bestHealthAfterRoom(
  roomCards: PlayingCard[],
  startingHealth = MaxHealth,
): number {
  const memo = new Map<string, number>();

  function solve(state: RoomSolveState): number {
    if (state.health <= 0) return Number.NEGATIVE_INFINITY;
    if (state.resolvedCount === 3) return state.health;

    const key = roomSolveKey(state);
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let bestHealth = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < state.roomCards.length; index += 1) {
      const card = state.roomCards[index];
      const nextRoomCards = state.roomCards.filter((_, i) => i !== index);
      const nextResolvedCount = state.resolvedCount + 1;

      if (cardType(card) === "potion") {
        bestHealth = Math.max(
          bestHealth,
          solve({
            roomCards: nextRoomCards,
            resolvedCount: nextResolvedCount,
            health: Math.min(MaxHealth, state.health + scoundrelValue(card)),
            weaponCard: state.weaponCard,
            lastWeaponTargetValue: state.lastWeaponTargetValue,
          }),
        );
        continue;
      }

      if (cardType(card) === "weapon") {
        bestHealth = Math.max(
          bestHealth,
          solve({
            roomCards: nextRoomCards,
            resolvedCount: nextResolvedCount,
            health: state.health,
            weaponCard: card,
            lastWeaponTargetValue: null,
          }),
        );
        continue;
      }

      bestHealth = Math.max(
        bestHealth,
        solve({
          roomCards: nextRoomCards,
          resolvedCount: nextResolvedCount,
          health: state.health - scoundrelValue(card),
          weaponCard: state.weaponCard,
          lastWeaponTargetValue: state.lastWeaponTargetValue,
        }),
      );

      if (
        state.weaponCard &&
        (state.lastWeaponTargetValue === null ||
          scoundrelValue(card) <= state.lastWeaponTargetValue)
      ) {
        bestHealth = Math.max(
          bestHealth,
          solve({
            roomCards: nextRoomCards,
            resolvedCount: nextResolvedCount,
            health:
              state.health -
              Math.max(
                0,
                scoundrelValue(card) - scoundrelValue(state.weaponCard),
              ),
            weaponCard: state.weaponCard,
            lastWeaponTargetValue: scoundrelValue(card),
          }),
        );
      }
    }

    memo.set(key, bestHealth);
    return bestHealth;
  }

  return solve({
    roomCards,
    resolvedCount: 0,
    health: startingHealth,
    weaponCard: null,
    lastWeaponTargetValue: null,
  });
}

function dungeonHasFalseStart(cards: PlayingCard[]) {
  const openingRoom = cards.slice(0, 4);
  const roomAfterRunning = cards.slice(4, 8);

  if (openingRoom.length < 4 || roomAfterRunning.length < 4) return false;

  const openingRoomHealth = bestHealthAfterRoom(openingRoom);
  const roomAfterRunningHealth = bestHealthAfterRoom(roomAfterRunning);

  return (
    openingRoomHealth <= MinHealthAfterSafeStart &&
    roomAfterRunningHealth <= MinHealthAfterSafeStart
  );
}

function getSafeShuffledDeck(cards: PlayingCard[]) {
  let deck = shuffle(cards);
  let shuffleCount = 1;

  while (dungeonHasFalseStart(deck) && shuffleCount < MaxSafeShuffleAttempts) {
    shuffleCount += 1;
    deck = shuffle(cards);
  }

  return deck;
}

function validRoomCards(roomCards: (PlayingCard | null)[]) {
  return roomCards.filter((card): card is PlayingCard => card !== null);
}

function canFightWithWeapon(game: GameState, monster: PlayingCard) {
  if (!game.weaponCard) return false;

  const lastWeaponTarget = game.weaponUsedOn[game.weaponUsedOn.length - 1];
  if (!lastWeaponTarget) return true;

  return scoundrelValue(monster) <= scoundrelValue(lastWeaponTarget);
}

function damageWithWeapon(weapon: PlayingCard | null, monster: PlayingCard) {
  if (!weapon) return scoundrelValue(monster);

  return Math.max(0, scoundrelValue(monster) - scoundrelValue(weapon));
}

function removeRoomCard(
  roomCards: (PlayingCard | null)[],
  roomIndex: number,
): (PlayingCard | null)[] {
  return roomCards.map((card, index) => (index === roomIndex ? null : card));
}

function faceCard(card: PlayingCard) {
  return flipAllToFace([card])[0];
}

function backCard(card: PlayingCard) {
  return flipAllToBack([card])[0];
}

function countRemainingMonsterValue(game: GameState) {
  const deckMonsters = game.draw.filter((card) => cardType(card) === "monster");
  const roomMonsters = validRoomCards(game.roomCards).filter(
    (card) => cardType(card) === "monster",
  );

  return [...deckMonsters, ...roomMonsters].reduce(
    (sum, card) => sum + scoundrelValue(card),
    0,
  );
}

function refillRoom(game: GameState) {
  const currentRoomCards = validRoomCards(game.roomCards);

  if (game.draw.length === 0 || currentRoomCards.length > 1) return game;

  const cardToKeep = currentRoomCards[0];
  const neededCards = cardToKeep ? 3 : 4;
  const roomDraw = game.draw
    .slice(0, neededCards)
    .map((card) => faceCard(card));
  const nextRoom: (PlayingCard | null)[] = [...EmptyRoom];

  if (cardToKeep) {
    const keepIndex = game.roomCards.findIndex(
      (card) => card?.id === cardToKeep.id,
    );
    if (keepIndex >= 0) {
      nextRoom[keepIndex] = cardToKeep;
    }
  }

  let cursor = 0;
  for (let i = 0; i < nextRoom.length; i += 1) {
    if (nextRoom[i] === null && cursor < roomDraw.length) {
      nextRoom[i] = roomDraw[cursor];
      cursor += 1;
    }
  }

  return {
    ...game,
    draw: game.draw.slice(neededCards),
    roomCards: nextRoom,
    roomNum: game.roomNum + (game.isRunning ? 0 : 1),
    isRunning: false,
  };
}

// Layout constants
const healthBarHeight = 0.46;
const drawRow = healthBarHeight + 0.17;
const weaponsRow = drawRow + 1.05;
const weaponsZoneInset = 0.12;
const weaponsZoneHeight = 1 + weaponsZoneInset * 2;
const roomCardsRow = weaponsRow + weaponsZoneHeight + 0.06;
const roomActionsRow = roomCardsRow + 0.95;

// ========== Game Component ========== //
export default function Scoundrel() {
  const scale = useResponsiveScale();

  const {
    isLoaded,
    showIntro,
    setShowIntro,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
    isSettingUp,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
  });

  const canRun =
    validRoomCards(game.roomCards).length === 4 &&
    game.lastRoomNumRanFrom !== game.roomNum &&
    !game.ended;

  function runFromRoom() {
    if (!canRun) return;

    saveUndoState(game);

    setGame((draft) => {
      const room = validRoomCards(draft.roomCards);

      draft.draw = [...draft.draw, ...flipAllToBack(room)];
      draft.roomCards = [...EmptyRoom];
      draft.lastRoomNumRanFrom = draft.roomNum;
      draft.isRunning = true;
      draft.lastActionType = undefined;
      draft.lastPotionValue = undefined;
    });
  }

  function heal(roomIndex: number, potion: PlayingCard) {
    if (game.ended) return;

    saveUndoState(game);

    setGame((draft) => {
      const healAmount = Math.min(
        MaxHealth - draft.health,
        scoundrelValue(potion),
      );

      draft.health += healAmount;
      draft.discard.push(backCard(potion));
      draft.roomCards = removeRoomCard(draft.roomCards, roomIndex);
      draft.lastActionType = "potion";
      draft.lastPotionValue = scoundrelValue(potion);
    });
  }

  function equip(roomIndex: number, weapon: PlayingCard) {
    if (game.ended) return;

    saveUndoState(game);

    setGame((draft) => {
      if (draft.weaponCard) {
        draft.discard.push(backCard(draft.weaponCard));
      }

      if (draft.weaponUsedOn.length > 0) {
        draft.discard.push(...flipAllToBack(draft.weaponUsedOn));
      }

      draft.weaponCard = faceCard(weapon);
      draft.weaponUsedOn = [];
      draft.roomCards = removeRoomCard(draft.roomCards, roomIndex);
      draft.lastActionType = "weapon";
      draft.lastPotionValue = undefined;
    });
  }

  function fightBare(roomIndex: number, monster: PlayingCard) {
    if (game.ended) return;

    saveUndoState(game);

    setGame((draft) => {
      draft.health = Math.max(0, draft.health - scoundrelValue(monster));
      draft.discard.push(backCard(monster));
      draft.roomCards = removeRoomCard(draft.roomCards, roomIndex);
      draft.lastActionType = "monster";
      draft.lastPotionValue = undefined;
    });
  }

  function fightWithWeapon(roomIndex: number, monster: PlayingCard) {
    if (game.ended || !canFightWithWeapon(game, monster)) return;

    saveUndoState(game);

    setGame((draft) => {
      const damage = damageWithWeapon(draft.weaponCard, monster);

      draft.health = Math.max(0, draft.health - damage);
      draft.weaponUsedOn.push(faceCard(monster));
      draft.roomCards = removeRoomCard(draft.roomCards, roomIndex);
      draft.lastActionType = "monster";
      draft.lastPotionValue = undefined;
    });
  }

  const healthRatio = Math.max(0, Math.min(1, game.health / MaxHealth));

  function getRoomActionSpecs(
    roomCard: PlayingCard,
    roomIndex: number,
  ): RoomActionSpec[] {
    const type = cardType(roomCard);

    if (type === "potion") {
      return [
        {
          key: "heal",
          text: `+${scoundrelValue(roomCard)}`,
          onPress: () => heal(roomIndex, roomCard),
          disabled: game.ended,
          iconName: "potion",
          color: "green",
        },
      ];
    }

    if (type === "weapon") {
      return [
        {
          key: "equip",
          onPress: () => equip(roomIndex, roomCard),
          disabled: game.ended,
          iconName: "equip",
          color: "blue",
        },
      ];
    }

    const bareDamage = scoundrelValue(roomCard);
    const weaponDamage = damageWithWeapon(game.weaponCard, roomCard);
    const canUseWeapon = canFightWithWeapon(game, roomCard);
    const canPressBare = !game.ended;
    const canPressWeapon = !game.ended && canUseWeapon;

    return [
      {
        key: "fight-weapon",
        text: `-${weaponDamage}`,
        onPress: () => fightWithWeapon(roomIndex, roomCard),
        disabled: !canPressWeapon,
        showDeathIndicator: canPressWeapon && game.health - weaponDamage <= 0,
        iconName: "sword",
        color: "purple",
      },
      {
        key: "fight-bare",
        text: `-${bareDamage}`,
        onPress: () => fightBare(roomIndex, roomCard),
        disabled: !canPressBare,
        showDeathIndicator: canPressBare && game.health - bareDamage <= 0,
        iconName: "fist",
        color: "red",
      },
    ];
  }

  // Core game progression: refill rooms, then resolve win/lose.
  useEffect(() => {
    if (isSettingUp || game.ended) return;

    const refilled = refillRoom(game);
    if (refilled !== game) {
      setGame(refilled);
      return;
    }

    if (game.health <= 0) {
      const remainingMonsterValue = countRemainingMonsterValue(game);
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.score = -remainingMonsterValue;
      });
      return;
    }

    if (game.draw.length === 0 && validRoomCards(game.roomCards).length === 0) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = true;
        if (
          draft.health === MaxHealth &&
          draft.lastActionType === "potion" &&
          draft.lastPotionValue !== undefined
        ) {
          draft.score = draft.health + draft.lastPotionValue;
        } else {
          draft.score = draft.health;
        }
      });
    }
  }, [game, isSettingUp, setGame]);

  // ========== Card Mapping ========== //

  const zones: MapZone[] = useMemo(() => {
    const roomZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 1,
      rowOffset: roomCardsRow,
    }).map((pos, i) => ({
      id: `roomCards-${i}`,
      name: "roomCards",
      pileIndex: i,
      cards: game.roomCards[i] ? [game.roomCards[i]] : undefined,
      col: pos.c,
      row: pos.r,
      baseZIndex: i + 20,
      placeholder: {},
    }));

    const roomActionZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 1,
      rowOffset: roomActionsRow,
    }).map((pos, i) => ({
      id: `roomCardActions-${i}`,
      name: "roomCardActions",
      pileIndex: i,
      col: pos.c,
      row: pos.r,
      height: 0.94,
      baseZIndex: i + 10,
      placeholder: {
        hideBackground: true,
      },
    }));

    return [
      {
        id: "health-bar",
        name: "health-bar",
        col: 0,
        row: 0,
        width: "full",
        height: healthBarHeight,
        baseZIndex: 1,
      },
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 0,
        row: drawRow,
        fan: { maxVisible: 3 },
        placeholder: {
          infoPos: "right",
          text: "Draw",
        },
        baseZIndex: 50,
      },
      {
        id: "room-info",
        name: "room-info",
        col: 2.75,
        row: drawRow,
        width: 1.25,
        height: 1,
        baseZIndex: 1,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 1.35,
        row: drawRow,
        fan: { maxVisible: 3 },
        placeholder: {
          infoPos: "right",
          text: "Dscrd",
        },
        baseZIndex: 50,
      },
      {
        id: "weapon-zone",
        name: "weapon-zone",
        col: 0,
        row: weaponsRow,
        height: weaponsZoneHeight,
        width: "full",
        placeholder: {},
        baseZIndex: 1,
      },
      {
        id: "weaponCard",
        name: "weaponCard",
        cards: game.weaponCard ? [game.weaponCard] : undefined,
        col: weaponsZoneInset + 0.05,
        row: weaponsRow + weaponsZoneInset,
        baseZIndex: 1,
      },
      {
        id: "weaponUsedOn",
        name: "weaponUsedOn",
        cards: game.weaponUsedOn,
        col: 1.1,
        row: weaponsRow + weaponsZoneInset,
        width: 2.75,
        fan: { direction: "right", offset: 0.32 },
        baseZIndex: 1,
      },
      ...roomZones,
      ...roomActionZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "draw") {
      return {
        clickThroughCards: true,
      };
    }
  };

  const [showDeckPreview, setShowDeckPreview] = useState(false);

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.id !== "draw") return;

      return {
        onPress: () => setShowDeckPreview(true),
        isDisabled: game.draw.length === 0,
      };
    },
    cardSize: "regular",
    paddingTop: 0.2,
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      score={game.score}
      winLoseMessage={game.won ? "You made it through the dungeon." : undefined}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      <DeckPreviewModal
        visible={showDeckPreview}
        cards={game.draw}
        onClose={() => setShowDeckPreview(false)}
        title="Deck Preview"
        sortCards
      />

      {cardMap}

      {/* Health Bar */}
      <View style={[getZoneStylesById("health-bar")]}>
        <ProgressBar
          totalValue={MaxHealth}
          progressValue={game.health}
          color={
            healthRatio <= 0.25
              ? "red"
              : healthRatio <= 0.5
                ? "orange"
                : "green"
          }
          tallyText={`${game.health} / ${MaxHealth}`}
          scaledHeight={cardHeight * healthBarHeight}
          iconName="heart"
        />
      </View>

      {/* Room Bar and Run Button */}
      <View
        style={[
          getZoneStylesById("room-info"),
          flexStyles.colCentered,
          {
            gap: 12 * scale,
            justifyContent: "space-between",
          },
        ]}
      >
        {/* Room Bar */}
        <ProgressBar
          iconName="door"
          totalValue={TotalRooms}
          progressValue={game.roomNum}
          color="blue"
          tallyText={game.roomNum}
          scaledHeight={cardHeight * 0.3}
        />

        <Button
          text="Run"
          size="sm"
          onPress={runFromRoom}
          disabled={!canRun}
          theme={"orange"}
          fullWidth
          taller
        />
      </View>

      {game.roomCards.map((roomCard, roomIndex) => {
        const zoneId = `roomCardActions-${roomIndex}`;
        const actions = roomCard ? getRoomActionSpecs(roomCard, roomIndex) : [];

        return (
          <View
            key={zoneId}
            style={[
              getZoneStylesById(zoneId),
              flexStyles.colCentered,
              {
                gap: "10%",
              },
            ]}
          >
            {actions.map((action) => (
              <View
                key={`${zoneId}-${action.key}`}
                style={[
                  flexStyles.colCentered,
                  {
                    position: "relative",
                    width: "100%",
                    height: "45%",
                  },
                ]}
              >
                {action.showDeathIndicator && (
                  <View
                    style={[
                      flexStyles.colCentered,
                      {
                        position: "absolute",
                        top: -4 * scale,
                        left: -6 * scale,
                        zIndex: 2,
                        width: 24 * scale,
                        height: 24 * scale,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 2 * scale,

                        backgroundColor: Colors.white,
                        boxShadow: `1px 2px 4px ${rgba(Colors.K900, 0.5)}`,
                      },
                    ]}
                  >
                    <Icon name="skull" color={Colors.K950} size={20 * scale} />
                  </View>
                )}

                <Button
                  text={action.text}
                  size="xs"
                  uppercase={false}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  fullWidth
                  theme={action.color}
                  iconName={action.iconName}
                  iconColor={Colors.white}
                  iconSize={24 * scale}
                  taller
                  style={{
                    gap: 4 * scale,
                    paddingHorizontal: 0,
                  }}
                  textStyle={{
                    fontSize: 16 * scale,
                    lineHeight: 16 * scale,
                    fontFamily: FontWeight[600],
                    color: Colors.white,
                    paddingRight: 4 * scale,
                  }}
                />
              </View>
            ))}
          </View>
        );
      })}
    </GameWrapper>
  );
}
