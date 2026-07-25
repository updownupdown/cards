import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Colors } from "@/styles/styles";

const maxDamage = 7;

// Row sizes (top to bottom) per dungeon level; each sums to 12.
const LAYOUT = {
  fixedCols: 6,
  fixedRows: 7,
  xScale: 1.5,
  rowGap: 0.4,
  dungeonTop: 1.5,
  bottomStart: 5,
  rows: {
    1: [4, 4, 4],
    2: [3, 3, 3, 3],
    3: [2, 3, 3, 4],
    4: [2, 2, 3, 2, 3],
    5: [1, 2, 3, 1, 2, 3],
  } as Record<number, number[]>,
};

type Placement = {
  card: PlayingCard;
  role: "attack" | "trigger";
  doubled?: boolean;
};
type Slot = {
  monster: PlayingCard;
  row: number;
  x: number;
  defeated: boolean;
  placed: Placement[];
};

type GameState = {
  slots: Slot[];
  deck: PlayingCard[];
  hand: PlayingCard[];
  reserve: PlayingCard[];
  damage: PlayingCard[];
  clear: PlayingCard[];
  kings: PlayingCard[];
  reserveSetup: boolean;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  slots: [],
  deck: [],
  hand: [],
  reserve: [],
  damage: [],
  clear: [],
  kings: [],
  reserveSetup: false,
  ended: false,
  won: false,
};

// ── Rules helpers ─────────────────────────────────────────────────────────────
function attackValue(card: PlayingCard, boomer: boolean) {
  if (isJoker(card)) return 10;
  if (card.rank === "A") return boomer ? 11 : 1;
  return rankValue(card);
}
function monsterPower(monster: PlayingCard) {
  return rankValue(monster); // J=11, Q=12, K=13
}
function attackerSum(slot: Slot, boomer: boolean) {
  return slot.placed
    .filter((p) => p.role === "attack")
    .reduce(
      (sum, p) => sum + attackValue(p.card, boomer) * (p.doubled ? 2 : 1),
      0,
    );
}
function isAttackable(slots: Slot[], idx: number) {
  const s = slots[idx];
  if (s.defeated) return false;
  return !slots.some(
    (o) => o.row === s.row + 1 && Math.abs(o.x - s.x) < 0.9 && !o.defeated,
  );
}
function canPlace(
  slots: Slot[],
  idx: number,
  card: PlayingCard,
  boomer: boolean,
) {
  const s = slots[idx];
  if (!isAttackable(slots, idx)) return false;
  if (s.placed.length < 2) return true; // attacker
  if (s.placed.length === 2) {
    if (attackerSum(s, boomer) < monsterPower(s.monster)) return false;
    return card.suit === s.monster.suit || isJoker(card);
  }
  return false;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ClearTheDungeon() {
  const { cardBg, cardText } = useGameZoneBackground();
  const level = useGameSettingValue("dungeonLevel") as number;
  const boomer = useGameSettingValue("boomerAce") as boolean;
  const powerReserveOn = useGameSettingValue("powerReserve") as boolean;
  const abilitiesOn = useGameSettingValue("specialAbilities") as boolean;

  const settingsRef = useRef({ level, powerReserveOn });
  settingsRef.current = { level, powerReserveOn };

  const [selected, setSelected] = useState<{
    zone: "hand" | "reserve";
    index: number;
  } | null>(null);
  const [reservePick, setReservePick] = useState<string[]>([]);
  const [kingMode, setKingMode] = useState<{
    type: "return" | "double";
    kingId: string;
  } | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setReservePick([]);
        setKingMode(null);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          const allCards = new Map<string, PlayingCard>();
          const collect = (card: PlayingCard) => {
            allCards.set(card.id, card);
          };

          draft.slots.forEach((slot) => {
            collect(slot.monster);
            slot.placed.forEach((placement) => collect(placement.card));
          });
          [
            ...draft.deck,
            ...draft.hand,
            ...draft.reserve,
            ...draft.damage,
            ...draft.clear,
            ...draft.kings,
          ].forEach(collect);

          const full =
            allCards.size > 0
              ? Array.from(allCards.values())
              : createDeck({ includeJokers: true });

          draft.slots = [];
          draft.deck = [];
          draft.hand = [];
          draft.reserve = [];
          draft.damage = [];
          draft.clear = flipAllToBack(full);
          draft.kings = [];
          draft.reserveSetup = false;
          draft.ended = false;
          draft.won = false;
        });

        await delay();

        setGame((draft) => {
          const shuffled = shuffle(draft.clear);
          const monsters = shuffle(shuffled.filter((c) => isFace(c)));
          const power = shuffle(shuffled.filter((c) => !isFace(c)));

          const layout =
            LAYOUT.rows[settingsRef.current.level] ?? LAYOUT.rows[1];
          const slots: Slot[] = [];
          let k = 0;
          for (let r = 0; r < layout.length; r += 1) {
            const size = layout[r];
            for (let i = 0; i < size; i += 1) {
              slots.push({
                monster: monsters[k],
                row: r,
                x: i - (size - 1) / 2,
                defeated: false,
                placed: [],
              });
              k += 1;
            }
          }

          const handSize = settingsRef.current.powerReserveOn ? 5 : 3;
          const hand: PlayingCard[] = [];
          for (let i = 0; i < handSize; i += 1) {
            const c = power.pop();
            if (c) hand.push(flipToFace(c));
          }

          draft.slots = slots;
          draft.deck = power.map(flipToBack);
          draft.hand = hand;
          draft.reserve = [];
          draft.damage = [];
          draft.clear = [];
          draft.kings = [];
          draft.reserveSetup = settingsRef.current.powerReserveOn;
          draft.ended = false;
          draft.won = false;
        });
        await delay();
      },
    });

  // Keep a stale selection from pointing at a missing card.
  useEffect(() => {
    if (!selected) return;
    const arr = selected.zone === "hand" ? game.hand : game.reserve;
    if (!arr[selected.index]) setSelected(null);
  }, [game.hand, game.reserve, selected]);

  const selectedCard =
    selected &&
    (selected.zone === "hand"
      ? game.hand[selected.index]
      : game.reserve[selected.index]);

  const monstersLeft = game.slots.filter((s) => !s.defeated).length;

  // ── Shared mutation helpers (operate on immer draft) ─────────────────────────
  function removeKing(draft: GameState, id: string) {
    const king = draft.kings.find((k) => k.id === id);
    draft.kings = draft.kings.filter((k) => k.id !== id);
    if (king) draft.clear.push(king);
  }

  function defeatMonster(draft: GameState, idx: number) {
    const s = draft.slots[idx];
    for (const p of s.placed) {
      if (p.role === "trigger" && boomer && p.card.rank === "A") {
        draft.hand.push(p.card);
      } else {
        draft.clear.push(p.card);
      }
    }
    s.placed = [];
    s.defeated = true;
    if (abilitiesOn && s.monster.rank === "K") {
      draft.kings.push(flipToFace(s.monster));
    } else {
      draft.clear.push(s.monster);
    }
  }

  function postAction(draft: GameState) {
    if (draft.slots.every((s) => s.defeated)) {
      draft.ended = true;
      draft.won = true;
      return;
    }
    if (draft.damage.length >= maxDamage) {
      draft.ended = true;
      draft.won = false;
      return;
    }
    if (!draft.reserveSetup && draft.hand.length === 0) {
      for (let i = 0; i < 3 && draft.deck.length > 0; i += 1) {
        const c = draft.deck.pop();
        if (c) draft.hand.push(flipToFace(c));
      }
    }
    if (draft.deck.length === 0 && draft.hand.length === 0) {
      const anyReserveMove = draft.reserve.some((card) =>
        draft.slots.some((_, i) => canPlace(draft.slots, i, card, boomer)),
      );
      if (!anyReserveMove) {
        draft.ended = true;
        draft.won = false;
      }
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function placeOnMonster(idx: number) {
    if (game.ended || game.reserveSetup || !selected || !selectedCard) return;
    if (!canPlace(game.slots, idx, selectedCard, boomer)) return;

    const role = game.slots[idx].placed.length < 2 ? "attack" : "trigger";
    const doubling = kingMode?.type === "double" && role === "attack";
    const src = selected;
    const doubleKingId = doubling ? kingMode!.kingId : null;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card =
        src.zone === "hand"
          ? draft.hand.splice(src.index, 1)[0]
          : draft.reserve.splice(src.index, 1)[0];
      if (!card) return;

      draft.slots[idx].placed.push({
        card,
        role,
        doubled: doubling || undefined,
      });
      if (doubleKingId) removeKing(draft, doubleKingId);
      if (role === "trigger") defeatMonster(draft, idx);
      postAction(draft);
    });

    setSelected(null);
    if (doubling) setKingMode(null);
  }

  function discardSelected() {
    if (
      game.ended ||
      game.reserveSetup ||
      !selected ||
      selected.zone !== "hand"
    )
      return;
    const index = selected.index;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.hand.splice(index, 1)[0];
      if (card) draft.damage.push(flipToBack(card));
      postAction(draft);
    });
    setSelected(null);
  }

  function confirmReserve() {
    if (reservePick.length !== 2) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.reserve = draft.hand.filter((c) => reservePick.includes(c.id));
      draft.hand = draft.hand.filter((c) => !reservePick.includes(c.id));
      draft.reserveSetup = false;
    });
    setReservePick([]);
  }

  function activateKing(king: PlayingCard) {
    if (game.ended || game.reserveSetup) return;
    const suit = king.suit;
    if (suit === "hearts") {
      setKingMode({ type: "return", kingId: king.id });
      setSelected(null);
      return;
    }
    if (suit === "spades") {
      setKingMode({ type: "double", kingId: king.id });
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (suit === "clubs") {
        if (draft.deck.length > 0) {
          const c = draft.deck.pop();
          if (c) draft.hand.push(flipToFace(c));
        }
      } else if (suit === "diamonds") {
        if (draft.deck.length > 1) {
          const bottom = draft.deck.shift();
          if (bottom) draft.deck.push(bottom);
        }
      }
      removeKing(draft, king.id);
      postAction(draft);
    });
  }

  function returnHandCard(index: number) {
    if (!kingMode || kingMode.type !== "return") return;
    const kingId = kingMode.kingId;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.hand.splice(index, 1)[0];
      if (card) draft.deck.unshift(flipToBack(card));
      removeKing(draft, kingId);
      postAction(draft);
    });
    setKingMode(null);
  }

  function onHandPress(index: number) {
    if (game.ended) return;
    if (game.reserveSetup) {
      const id = game.hand[index]?.id;
      if (!id) return;
      setReservePick((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length < 2
            ? [...prev, id]
            : prev,
      );
      return;
    }
    if (kingMode?.type === "return") {
      returnHandCard(index);
      return;
    }
    setSelected((s) =>
      s && s.zone === "hand" && s.index === index
        ? null
        : { zone: "hand", index },
    );
  }

  function onReservePress(index: number) {
    if (game.ended || game.reserveSetup) return;
    setSelected((s) =>
      s && s.zone === "reserve" && s.index === index
        ? null
        : { zone: "reserve", index },
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const shiftX = (LAYOUT.fixedCols - 1) / 2;

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [];

    game.slots.forEach((slot, idx) => {
      if (slot.defeated) return;
      const attackable = isAttackable(game.slots, idx);
      const col = slot.x * LAYOUT.xScale + shiftX;
      const row = LAYOUT.dungeonTop + slot.row * LAYOUT.rowGap;
      result.push({
        id: `slot-${idx}`,
        name: "slot",
        pileIndex: idx,
        cards: [
          attackable ? flipToFace(slot.monster) : flipToBack(slot.monster),
        ],
        col,
        row,
        baseZIndex: 5 + slot.row,
      });
      slot.placed.forEach((p, k) => {
        result.push({
          id: `placed-${idx}-${k}`,
          name: "placed",
          pileIndex: idx,
          cards: [p.card],
          col: col - 0.2 + k * 0.4,
          row: row + 0.65,
          baseZIndex: 40 + k,
        });
      });
    });

    if (abilitiesOn) {
      game.kings.forEach((king, i) => {
        result.push({
          id: `king-${king.id}`,
          name: "king",
          pileIndex: i,
          cards: [king],
          col: 3.7 + i * 0.9,
          row: LAYOUT.bottomStart,
          baseZIndex: 30,
        });
      });
    }

    result.push(
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "below" },
      },
      {
        id: "damage",
        name: "damage",
        cards: game.damage,
        col: 1.2,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Damage", infoPos: "below" },
      },
      {
        id: "clear",
        name: "clear",
        cards: game.clear,
        col: 2.4,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Clear", infoPos: "below" },
      },
    );

    if (powerReserveOn) {
      game.reserve.forEach((card, i) => {
        result.push({
          id: `reserve-${i}`,
          name: "reserve",
          pileIndex: i,
          cards: [card],
          col: 4 + i * 0.4,
          row: 0,
          baseZIndex: 30,
        });
      });
    }

    game.hand.forEach((card, i) => {
      result.push({
        id: `hand-${i}`,
        name: "hand",
        pileIndex: i,
        cards: [card],
        col: i * 1.1,
        row: LAYOUT.bottomStart,
        baseZIndex: 60,
      });
    });

    result.push({
      id: "controls",
      col: 0,
      row: 6,
      width: "full",
      height: 0.9,
    });

    return result;
  }, [game, abilitiesOn, powerReserveOn, level]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "slot" && mappedCard.pileIndex !== undefined) {
      const idx = mappedCard.pileIndex;
      const attackable = isAttackable(game.slots, idx);
      const canDrop =
        !!selectedCard && canPlace(game.slots, idx, selectedCard, boomer);
      return {
        isDisabled: game.ended || game.reserveSetup || !attackable,
        selectColor: canDrop ? "green" : "none",
        onPress: () => placeOnMonster(idx),
      };
    }
    if (mappedCard.zoneName === "hand" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      const picked = game.reserveSetup
        ? reservePick.includes(mappedCard.card.id)
        : selected?.zone === "hand" && selected.index === index;
      return {
        isSelected: picked,
        selectColor: game.reserveSetup ? "purple" : "blue",
        isDisabled: game.ended,
        onPress: () => onHandPress(index),
      };
    }
    if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      return {
        isSelected: selected?.zone === "reserve" && selected.index === index,
        selectColor: "orange",
        isDisabled: game.ended || game.reserveSetup,
        onPress: () => onReservePress(index),
      };
    }
    if (mappedCard.zoneName === "king") {
      const king = mappedCard.card;
      const armed =
        (king.suit === "hearts" && kingMode?.kingId === king.id) ||
        (king.suit === "spades" && kingMode?.kingId === king.id);
      return {
        isSelected: armed,
        selectColor: "green",
        isDisabled: game.ended || game.reserveSetup,
        onPress: () => activateKing(king),
      };
    }
    if (
      mappedCard.zoneName === "placed" &&
      mappedCard.pileIndex !== undefined
    ) {
      const idx = mappedCard.pileIndex;
      const attackable = isAttackable(game.slots, idx);
      const canDrop =
        !!selectedCard && canPlace(game.slots, idx, selectedCard, boomer);
      return {
        isDisabled: game.ended || game.reserveSetup || !attackable,
        selectColor: canDrop ? "green" : "none",
        onPress: () => placeOnMonster(idx),
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.2,
    fixedCols: LAYOUT.fixedCols,
    fixedRows: LAYOUT.fixedRows,
    cardSize: "small",
  });

  const score =
    game.deck.length + (powerReserveOn && game.won ? game.reserve.length : 0);

  const kingHint = (suit: CardSuit) => {
    switch (suit) {
      case "hearts":
        return "K\u2665: bury a hand card";
      case "diamonds":
        return "K\u2666: bottom card to top";
      case "spades":
        return "K\u2660: double an attacker";
      default:
        return "K\u2663: draw a card";
    }
  };

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      score={score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `Dungeon cleared! Score ${score}.`
          : game.damage.length >= maxDamage
            ? "Your damage bar is full."
            : "You ran out of power."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* <View
        style={[
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <Text size="sm" weight={600} color={cardText}>
          Power {game.deck.length}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Damage {game.damage.length}/{maxDamage}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Monsters {monstersLeft}
        </Text>
      </View> */}

      <View
        style={[
          getZoneStylesById("controls"),
          { flexDirection: "row", gap: 10, alignItems: "center" },
        ]}
      >
        {game.reserveSetup ? (
          <Button
            text={`Set Reserve (${reservePick.length}/2)`}
            size="md"
            onPress={confirmReserve}
            fullWidth
            taller
            disabled={reservePick.length !== 2}
            theme={cardBg}
          />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text size="xs" weight={400} color={Colors.white}>
                {kingMode?.type === "return"
                  ? "Pick a hand card to bury"
                  : kingMode?.type === "double"
                    ? "Place an attacker to double"
                    : selectedCard
                      ? "Tap a monster, or Discard"
                      : "Tap a card to use it"}
              </Text>
              {abilitiesOn && game.kings.length > 0 ? (
                <Text size="xs" weight={400} color={cardText}>
                  {game.kings.map((k) => kingHint(k.suit)).join("   ")}
                </Text>
              ) : null}
            </View>

            <View style={{ flex: 1 }}>
              <Button
                text="Discard"
                size="md"
                onPress={discardSelected}
                fullWidth
                taller
                disabled={!selected || selected.zone !== "hand" || game.ended}
                theme="red"
              />
            </View>
          </>
        )}
      </View>
    </GameWrapper>
  );
}
