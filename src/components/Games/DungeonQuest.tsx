import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  CardRank,
  CardSuit,
  PlayingCard,
  RANKS,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const COLS = 7;
const ROWS = 3;
const START_INDEX = 10;
const MAX_HP = 5;

type Room = { card: PlayingCard; revealed: boolean; exhausted: boolean };
type ItemKind = "key" | "rope" | "retry" | "potion" | "gem" | "shield";
type RoomChoice =
  | "spike"
  | "pit"
  | "door"
  | "slime"
  | "skeleton"
  | "troll"
  | "dragon";
type FateEffect =
  | "spike"
  | "chest"
  | "fountain"
  | "slime"
  | "skeleton"
  | "troll"
  | "dragon";
type TargetMode =
  | "defeat"
  | "disable"
  | "foresight"
  | "passage"
  | "swap-first"
  | "swap-second";

type GameState = {
  rooms: (Room | null)[];
  position: number;
  previousPosition: number;
  character: PlayingCard;
  quests: PlayingCard[];
  fate: number[];
  items: ItemKind[];
  hp: number;
  events: string[];
  spellsUsed: string[];
  pendingChoice: RoomChoice | null;
  pendingFate: { effect: FateEffect; roomIndex: number; value: number } | null;
  pendingDamage: number;
  targetMode: TargetMode | null;
  firstSwapIndex: number | null;
  canSearch: boolean;
  message: string;
  ended: boolean;
  won: boolean;
};

const ROOM_CARDS: [CardSuit, CardRank][] = [
  ["spades", "A"],
  ["hearts", "A"],
  ["spades", "2"],
  ["hearts", "2"],
  ["spades", "3"],
  ["hearts", "3"],
  ["spades", "4"],
  ["hearts", "4"],
  ["spades", "5"],
  ["hearts", "5"],
  ["spades", "6"],
  ["spades", "7"],
  ["spades", "8"],
  ["hearts", "8"],
  ["diamonds", "9"],
  ["spades", "10"],
  ["spades", "J"],
  ["spades", "Q"],
  ["hearts", "K"],
  ["spades", "K"],
];

const ITEM_CARDS: Record<ItemKind, PlayingCard> = {
  key: card("item-key", "hearts", "J"),
  rope: card("item-rope", "hearts", "Q"),
  retry: card("item-retry", "hearts", "K"),
  potion: card("item-potion", "hearts", "Joker"),
  gem: card("item-gem", "diamonds", "9"),
  shield: card("item-shield", "hearts", "K"),
};

function card(
  id: string,
  suit: CardSuit,
  rank: CardRank,
  faceUp = true,
): PlayingCard {
  return { id, suit, rank, faceUp };
}

function roomName(room: Room | null) {
  if (!room) return "Empty room";
  const { card: roomCard } = room;
  if (roomCard.rank === "A")
    return roomCard.suit === "spades" ? "Dungeon Exit" : "The Wizard";
  if (roomCard.rank === "2") return "Spike Trap";
  if (roomCard.rank === "3") return "Pit Trap";
  if (roomCard.rank === "4") return "Treasure Chest";
  if (roomCard.rank === "5") return "Toxic Spore";
  if (roomCard.rank === "6") return "Locked Door";
  if (roomCard.rank === "7") return "Fickle Fountain";
  if (roomCard.rank === "8") return "Secret Passage";
  if (roomCard.rank === "9") return "Gem";
  if (roomCard.rank === "10") return "Slime";
  if (roomCard.rank === "J") return "Skeleton";
  if (roomCard.rank === "Q") return "Swamp Troll";
  return roomCard.suit === "hearts" ? "Shield" : "Undead Dragon";
}

function createInitialState(): GameState {
  const rooms = shuffle(
    ROOM_CARDS.map(([suit, rank], index) => ({
      card: card(`room-${index}-${suit}-${rank}`, suit, rank, false),
      revealed: false,
      exhausted: false,
    })),
  );
  const board: (Room | null)[] = [];
  for (let index = 0; index < COLS * ROWS; index += 1) {
    board.push(index === START_INDEX ? null : rooms.pop()!);
  }
  const questRanks = shuffle([...RANKS]).slice(0, 3);
  return {
    rooms: board,
    position: START_INDEX,
    previousPosition: START_INDEX,
    character: card("dungeon-character", "spades", "Joker"),
    quests: questRanks.map((rank) => card(`quest-${rank}`, "clubs", rank)),
    fate: shuffle([6, 7, 8, 9, 10]),
    items: [],
    hp: MAX_HP,
    events: [],
    spellsUsed: [],
    pendingChoice: null,
    pendingFate: null,
    pendingDamage: 0,
    targetMode: null,
    firstSwapIndex: null,
    canSearch: false,
    message: "Choose a highlighted room.",
    ended: false,
    won: false,
  };
}

function addEvent(state: GameState, event: string) {
  if (!state.events.includes(event)) state.events.push(event);
}

function addItem(state: GameState, item: ItemKind) {
  if (item === "gem" || !state.items.includes(item)) state.items.push(item);
}

function consumeItem(state: GameState, item: ItemKind) {
  const index = state.items.indexOf(item);
  if (index < 0) return false;
  state.items.splice(index, 1);
  return true;
}

function exhaustRoom(state: GameState, index: number, event?: string) {
  const room = state.rooms[index];
  if (room) room.exhausted = true;
  if (event) addEvent(state, event);
}

function takeDamage(state: GameState, amount: number) {
  if (amount <= 0) return;
  if (state.items.includes("shield")) state.pendingDamage += amount;
  else {
    state.hp -= amount;
    if (state.hp <= 0) {
      state.ended = true;
      state.won = false;
    }
  }
}

function nextFate(state: GameState) {
  const value = state.fate.shift()!;
  state.fate.push(value);
  return value;
}

function startFate(state: GameState, effect: FateEffect, roomIndex: number) {
  state.pendingChoice = null;
  state.pendingFate = { effect, roomIndex, value: nextFate(state) };
  state.message = `Fate reveals ${state.pendingFate.value}.`;
}

function resolveTreasure(state: GameState, value: number) {
  if (value === 6) addItem(state, "key");
  if (value === 7) addItem(state, "rope");
  if (value === 8) addItem(state, "retry");
  if (value === 9) takeDamage(state, 2);
  if (value === 10) addItem(state, "potion");
}

function resolveFate(state: GameState) {
  const pending = state.pendingFate;
  if (!pending) return;
  const { effect, roomIndex, value } = pending;
  state.pendingFate = null;
  if (effect === "spike") {
    exhaustRoom(state, roomIndex, "spike");
    if (value % 2 === 0) takeDamage(state, 2);
  } else if (effect === "chest") {
    resolveTreasure(state, value);
    exhaustRoom(state, roomIndex);
  } else if (effect === "fountain") {
    addEvent(state, "fountain");
    if (value % 2) state.hp = Math.min(MAX_HP, state.hp + 2);
    else takeDamage(state, 1);
  } else if (effect === "slime") {
    if (value === 7) takeDamage(state, 1);
    else exhaustRoom(state, roomIndex, "slime");
  } else if (effect === "skeleton") {
    if (value % 2 === 0) takeDamage(state, 1);
    else exhaustRoom(state, roomIndex, "skeleton");
  } else if (effect === "troll") {
    if (value % 2) takeDamage(state, 2);
    else {
      exhaustRoom(state, roomIndex, "troll");
      state.canSearch = true;
    }
  } else {
    const dragonValue =
      value === 10 && state.items.includes("shield") ? 9 : value;
    if (dragonValue === 9) {
      exhaustRoom(state, roomIndex, "dragon");
      state.hp = MAX_HP;
    } else takeDamage(state, 3);
  }
  state.message = `Fate ${value} resolved.`;
}

function mandatoryChoice(room: Room | null): RoomChoice | null {
  if (!room || room.exhausted) return null;
  const rank = room.card.rank;
  if (rank === "2") return "spike";
  if (rank === "3") return "pit";
  if (rank === "6") return "door";
  if (rank === "10") return "slime";
  if (rank === "J") return "skeleton";
  if (rank === "Q") return "troll";
  if (rank === "K" && room.card.suit === "spades") return "dragon";
  return null;
}

function enterRoom(state: GameState, index: number) {
  state.previousPosition = state.position;
  state.position = index;
  const room = state.rooms[index];
  if (!room || room.exhausted) return;
  if (!room.revealed) {
    room.revealed = true;
    room.card.faceUp = true;
    if (room.card.rank === "5") {
      addEvent(state, "spore");
      takeDamage(state, 1);
    }
    if (
      room.card.rank === "8" &&
      state.rooms.filter((entry) => entry?.revealed && entry.card.rank === "8")
        .length === 2
    ) {
      addEvent(state, "passages");
    }
  }
  state.pendingChoice = mandatoryChoice(room);
  state.message = roomName(room);
}

function legalDestinations(state: GameState) {
  const result: number[] = [];
  const row = Math.floor(state.position / COLS);
  const col = state.position % COLS;
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [rowStep, colStep] of directions) {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;
    while (nextRow >= 0 && nextRow < ROWS && nextCol >= 0 && nextCol < COLS) {
      const index = nextRow * COLS + nextCol;
      const room = state.rooms[index];
      if (room && !room.exhausted) {
        result.push(index);
        break;
      }
      nextRow += rowStep;
      nextCol += colStep;
    }
  }
  return result;
}

function questEvent(rank: CardRank) {
  return (
    {
      A: "spell",
      "2": "spike",
      "3": "pit",
      "4": "item",
      "5": "spore",
      "6": "door",
      "7": "fountain",
      "8": "passages",
      "9": "gem",
      "10": "slime",
      J: "skeleton",
      Q: "troll",
      K: "dragon",
    } as Record<CardRank, string>
  )[rank];
}

function questComplete(state: GameState, quest: PlayingCard) {
  if (quest.rank === "4") return state.items.some((item) => item !== "gem");
  if (quest.rank === "9") return state.items.includes("gem");
  return state.events.includes(questEvent(quest.rank));
}

function questsComplete(state: GameState) {
  return state.quests.every((quest) => questComplete(state, quest));
}

export const dungeonQuestRules = {
  legalDestinations,
  questComplete,
  questEvent,
  questsComplete,
  roomName,
};
const gameStateInitial = createInitialState();

export default function DungeonQuest() {
  const { colorPale } = useGameColors();
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        const next = createInitialState();
        setGame((draft) => void Object.assign(draft, next));
      },
    });
  const blocked =
    !!game.pendingChoice ||
    !!game.pendingFate ||
    game.pendingDamage > 0 ||
    !!game.targetMode;
  const destinations = useMemo(
    () => (blocked || game.ended ? [] : legalDestinations(game)),
    [blocked, game],
  );

  function mutate(action: (draft: GameState) => void) {
    saveUndoState(structuredClone(game));
    setGame(action);
  }

  function selectRoom(index: number) {
    if (game.targetMode) {
      mutate((draft) => {
        const room = draft.rooms[index];
        if (draft.targetMode === "foresight" && room && !room.revealed) {
          room.revealed = true;
          room.card.faceUp = true;
          if (room.card.rank === "5") addEvent(draft, "spore");
          if (
            room.card.rank === "8" &&
            draft.rooms.filter(
              (entry) => entry?.revealed && entry.card.rank === "8",
            ).length === 2
          )
            addEvent(draft, "passages");
          draft.targetMode = null;
        } else if (
          draft.targetMode === "passage" &&
          room?.revealed &&
          room.card.rank === "8" &&
          index !== draft.position
        ) {
          draft.previousPosition = draft.position;
          draft.position = index;
          draft.targetMode = null;
        } else if (
          draft.targetMode === "disable" &&
          room?.revealed &&
          room.card.rank === "2"
        ) {
          exhaustRoom(draft, index, "spike");
          draft.targetMode = null;
        } else if (
          draft.targetMode === "defeat" &&
          room?.revealed &&
          ["10", "J", "Q"].includes(room.card.rank)
        ) {
          exhaustRoom(draft, index, questEvent(room.card.rank));
          draft.targetMode = null;
        } else if (draft.targetMode === "swap-first" && room) {
          draft.firstSwapIndex = index;
          draft.targetMode = "swap-second";
        } else if (
          draft.targetMode === "swap-second" &&
          draft.firstSwapIndex !== null &&
          room &&
          index !== draft.firstSwapIndex
        ) {
          [draft.rooms[index], draft.rooms[draft.firstSwapIndex]] = [
            draft.rooms[draft.firstSwapIndex],
            draft.rooms[index],
          ];
          draft.targetMode = null;
          draft.firstSwapIndex = null;
        }
      });
      return;
    }
    if (!destinations.includes(index)) return;
    mutate((draft) => enterRoom(draft, index));
  }

  function goBack() {
    mutate((draft) => {
      const destination = draft.previousPosition;
      draft.pendingChoice = null;
      enterRoom(draft, destination);
    });
  }

  function resolveChoice(option: "face" | "rope" | "key") {
    mutate((draft) => {
      const choice = draft.pendingChoice;
      const roomIndex = draft.position;
      draft.pendingChoice = null;
      if (choice === "spike") startFate(draft, "spike", roomIndex);
      if (choice === "pit") {
        if (option === "rope" && consumeItem(draft, "rope"))
          exhaustRoom(draft, roomIndex, "pit");
        else {
          takeDamage(draft, 2);
          exhaustRoom(draft, roomIndex, "pit");
        }
      }
      if (choice === "door" && option === "key" && consumeItem(draft, "key"))
        exhaustRoom(draft, roomIndex, "door");
      if (["slime", "skeleton", "troll", "dragon"].includes(choice ?? ""))
        startFate(draft, choice as FateEffect, roomIndex);
    });
  }

  function roomAction() {
    mutate((draft) => {
      const room = draft.rooms[draft.position];
      if (!room || room.exhausted) return;
      const rank = room.card.rank;
      if (rank === "A" && room.card.suit === "spades") {
        if (questsComplete(draft)) {
          draft.ended = true;
          draft.won = true;
        } else draft.message = "Complete all three quests before escaping.";
      } else if (rank === "4") startFate(draft, "chest", draft.position);
      else if (rank === "7") startFate(draft, "fountain", draft.position);
      else if (rank === "8") draft.targetMode = "passage";
      else if (rank === "9") {
        addItem(draft, "gem");
        addEvent(draft, "gem");
        draft.rooms[draft.position] = null;
      } else if (rank === "K" && room.card.suit === "hearts") {
        addItem(draft, "shield");
        addEvent(draft, "item");
        draft.rooms[draft.position] = null;
      }
    });
  }

  function castSpell(spell: string) {
    mutate((draft) => {
      if (!consumeItem(draft, "gem") || draft.spellsUsed.includes(spell))
        return;
      draft.spellsUsed.push(spell);
      addEvent(draft, "spell");
      if (spell === "health") draft.hp = Math.min(MAX_HP, draft.hp + 2);
      else
        draft.targetMode =
          spell === "swap" ? "swap-first" : (spell as TargetMode);
    });
  }

  const zones = useMemo<MapZone[]>(
    () => [
      ...game.rooms.map((room, index) => ({
        id: `room-${index}`,
        name: "room",
        pileIndex: index,
        cards: room ? [{ ...room.card, faceUp: room.revealed }] : [],
        col: index % COLS,
        row: Math.floor(index / COLS),
        rotation: room?.exhausted ? 90 : 0,
        baseZIndex: 5,
        placeholder: { showCount: false },
      })),
      {
        id: "character",
        name: "character",
        cards: [game.character],
        col: game.position % COLS,
        row: Math.floor(game.position / COLS),
        baseZIndex: 30,
        clickThroughCards: true,
      },
      ...game.quests.map((quest, index) => ({
        id: `quest-${index}`,
        name: "quest",
        pileIndex: index,
        cards: [quest],
        col: index + 2,
        row: 5,
        baseZIndex: 5,
      })),
      {
        id: "hud",
        name: "hud",
        col: 0,
        row: 3,
        width: 7,
        height: 2,
        baseZIndex: 1,
      },
    ],
    [game],
  );

  const validTargets = (index: number) => {
    const room = game.rooms[index];
    if (!game.targetMode) return destinations.includes(index);
    if (game.targetMode === "foresight") return !!room && !room.revealed;
    if (game.targetMode === "passage")
      return (
        !!room?.revealed && room.card.rank === "8" && index !== game.position
      );
    if (game.targetMode === "disable")
      return !!room?.revealed && room.card.rank === "2";
    if (game.targetMode === "defeat")
      return !!room?.revealed && ["10", "J", "Q"].includes(room.card.rank);
    return (
      !!room &&
      (game.targetMode === "swap-first" || index !== game.firstSwapIndex)
    );
  };
  const cardMapper = (mapped: MappedCard): AnimatedCardMapping => {
    if (mapped.zoneName === "quest") {
      const quest = game.quests[mapped.pileIndex ?? -1];
      const complete = !!quest && questComplete(game, quest);
      return {
        isDisabled: true,
        isSelected: complete,
        selectColor: complete ? "green" : "none",
      };
    }
    if (mapped.zoneName !== "room")
      return {
        isDisabled: true,
        clickThroughCards: mapped.zoneName === "character",
      };
    const index = mapped.pileIndex ?? -1;
    const valid = validTargets(index);
    return {
      onPress: () => selectRoom(index),
      isDisabled: !valid,
      isSelected: valid,
      selectColor: valid ? "green" : "none",
    };
  };
  const zoneMapper = (zone: MapZone) =>
    zone.name === "room" && zone.pileIndex !== undefined
      ? {
          onPress: () => selectRoom(zone.pileIndex!),
          isDisabled: !validTargets(zone.pileIndex),
          isSelected: validTargets(zone.pileIndex),
          selectColor: validTargets(zone.pileIndex) ? "green" : "none",
        }
      : {};
  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: 7,
    fixedRows: 6,
    gap: 0.05,
  });
  const current = game.rooms[game.position];
  const isWizard =
    current?.revealed &&
    !current.exhausted &&
    current.card.rank === "A" &&
    current.card.suit === "hearts";
  const hasAction =
    current?.revealed &&
    !current.exhausted &&
    (["4", "7", "8", "9"].includes(current.card.rank) ||
      (current.card.rank === "A" && current.card.suit === "spades") ||
      (current.card.rank === "K" && current.card.suit === "hearts"));
  const completed = game.quests.filter((quest) =>
    questComplete(game, quest),
  ).length;

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={completed}
      winLoseMessage="You escaped with every quest complete."
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
      <View
        style={[getZoneStylesById("hud"), { flexDirection: "column", gap: 5 }]}
      >
        <Text color={colorPale} size="sm" style={{ textAlign: "center" }}>
          HP {Math.max(0, game.hp)}/{MAX_HP} | Quests {completed}/3 | Items{" "}
          {game.items.map((item) => item[0].toUpperCase()).join(" ") || "None"}
        </Text>
        <Text color={colorPale} size="xs" style={{ textAlign: "center" }}>
          {game.message}
        </Text>
        <View style={[flexStyles.rowCentered, { gap: 5, flexWrap: "wrap" }]}>
          {game.pendingDamage > 0 && (
            <>
              <Button
                text={`Take ${game.pendingDamage}`}
                size="xs"
                theme="red"
                onPress={() =>
                  mutate((draft) => {
                    draft.hp -= draft.pendingDamage;
                    draft.pendingDamage = 0;
                    if (draft.hp <= 0) draft.ended = true;
                  })
                }
              />
              <Button
                text="Use Shield"
                size="xs"
                theme="green"
                onPress={() =>
                  mutate((draft) => {
                    consumeItem(draft, "shield");
                    draft.pendingDamage = 0;
                  })
                }
              />
            </>
          )}
          {game.pendingFate && (
            <>
              <Button
                text={`Accept Fate ${game.pendingFate.value}`}
                size="xs"
                onPress={() => mutate(resolveFate)}
              />
              <Button
                text="Retry"
                size="xs"
                theme="orange"
                disabled={!game.items.includes("retry")}
                onPress={() =>
                  mutate((draft) => {
                    if (consumeItem(draft, "retry") && draft.pendingFate)
                      draft.pendingFate.value = nextFate(draft);
                  })
                }
              />
            </>
          )}
          {game.pendingChoice && (
            <>
              <Button text="Go Back" size="xs" onPress={goBack} />
              <Button
                text={
                  game.pendingChoice === "door"
                    ? "Use Key"
                    : game.pendingChoice === "pit"
                      ? "Take 2 HP"
                      : "Face It"
                }
                size="xs"
                theme="orange"
                disabled={
                  game.pendingChoice === "door" && !game.items.includes("key")
                }
                onPress={() =>
                  resolveChoice(game.pendingChoice === "door" ? "key" : "face")
                }
              />
              {game.pendingChoice === "pit" && (
                <Button
                  text="Use Rope"
                  size="xs"
                  theme="green"
                  disabled={!game.items.includes("rope")}
                  onPress={() => resolveChoice("rope")}
                />
              )}
            </>
          )}
          {!blocked && hasAction && (
            <Button
              text={`Use ${roomName(current)}`}
              size="xs"
              onPress={roomAction}
            />
          )}
          {!blocked && current?.card.rank === "5" && (
            <Button
              text="Trade Item for Key"
              size="xs"
              disabled={!game.items.length}
              onPress={() =>
                mutate((draft) => {
                  draft.items.pop();
                  addItem(draft, "key");
                })
              }
            />
          )}
          {!blocked && game.canSearch && (
            <Button
              text="Search"
              size="xs"
              onPress={() =>
                mutate((draft) => {
                  draft.canSearch = false;
                  startFate(draft, "chest", draft.position);
                })
              }
            />
          )}
          {!blocked && game.items.includes("potion") && (
            <Button
              text="Drink Potion"
              size="xs"
              theme="green"
              onPress={() =>
                mutate((draft) => {
                  consumeItem(draft, "potion");
                  draft.hp = Math.min(MAX_HP, draft.hp + 2);
                })
              }
            />
          )}
          {!blocked &&
            isWizard &&
            ["defeat", "disable", "foresight", "health", "swap"].map(
              (spell) => (
                <Button
                  key={spell}
                  text={spell}
                  size="xs"
                  disabled={
                    !game.items.includes("gem") ||
                    game.spellsUsed.includes(spell)
                  }
                  onPress={() => castSpell(spell)}
                />
              ),
            )}
          {game.targetMode && (
            <Button
              text="Cancel"
              size="xs"
              theme="red"
              onPress={() =>
                mutate((draft) => {
                  draft.targetMode = null;
                  draft.firstSwapIndex = null;
                })
              }
            />
          )}
        </View>
      </View>
    </GameWrapper>
  );
}
