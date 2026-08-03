import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardLabel,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  sortCardsBySuit,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";
import { rotatedText } from "@/styles/textStyles";
import { Text } from "../common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";

const maxDamage = 7;

// Row sizes (top to bottom) per dungeon level; each sums to 12.
const LAYOUT = {
  fixedCols: 6,
  fixedRows: 7,
  xScale: 1.4,
  rowGap: 0.4,
  dungeonTop: 1.2,
  bottomStart: 4.9,
  rows: {
    1: [4, 4, 4],
    2: [3, 3, 3, 3],
    3: [2, 3, 3, 4],
    4: [2, 2, 3, 2, 3],
    5: [1, 2, 3, 1, 2, 3],
  } as Record<number, number[]>,
};

export type ClearDungeonPlacement = {
  card: PlayingCard;
  role: "attack" | "trigger";
  doubled?: boolean;
};
export type ClearDungeonSlot = {
  monster: PlayingCard;
  row: number;
  x: number;
  defeated: boolean;
  placed: ClearDungeonPlacement[];
};

export type ClearDungeonGameState = {
  slots: ClearDungeonSlot[];
  deck: PlayingCard[];
  hand: PlayingCard[];
  reserve: PlayingCard[];
  damage: number;
  discard: PlayingCard[];
  kings: PlayingCard[];
  reserveSetup: boolean;
  ended: boolean;
  won: boolean;
};

type GameState = ClearDungeonGameState;

const gameStateInitial: GameState = {
  slots: [],
  deck: [],
  hand: [],
  reserve: [],
  damage: 0,
  discard: [],
  kings: [],
  reserveSetup: false,
  ended: false,
  won: false,
};

const kingHint = (
  suit: CardSuit | "hearts-action" | "spades-action" | "diamonds-action",
) => {
  switch (suit) {
    case "hearts":
      return "Bury a hand card";
    case "hearts-action":
      return "Select hand card";
    case "spades":
      return "Double an attack";
    case "spades-action":
      return "Choose an attack";
    case "diamonds-action":
      return "Choose whether to move card";
    case "diamonds":
      return "Move bottom card to top";
    case "clubs":
      return "Draw a card";
  }
};

function fanOffset(count: number, widthUnits: number) {
  if (count <= 1) return 0.4;
  return Math.max(0.1, Math.min(0.8, (widthUnits - 1) / (count - 1)));
}

// ── Rules helpers ─────────────────────────────────────────────────────────────
function attackValue(card: PlayingCard, boomer: boolean) {
  if (isJoker(card)) return 10;
  if (card.rank === "A") return boomer ? 11 : 1;
  return rankValue(card);
}
function monsterPower(monster: PlayingCard) {
  return rankValue(monster); // J=11, Q=12, K=13
}
function attackerSum(slot: ClearDungeonSlot, boomer: boolean) {
  return slot.placed
    .filter((p) => p.role === "attack")
    .reduce(
      (sum, p) => sum + attackValue(p.card, boomer) * (p.doubled ? 2 : 1),
      0,
    );
}
function isAttackable(slots: ClearDungeonSlot[], idx: number) {
  const s = slots[idx];
  if (s.defeated) return false;
  return !slots.some(
    (o) => o.row > s.row && Math.abs(o.x - s.x) < 0.9 && !o.defeated,
  );
}
function canPlace(
  slots: ClearDungeonSlot[],
  idx: number,
  card: PlayingCard,
  boomer: boolean,
  doubleAttack = false,
) {
  const s = slots[idx];
  if (!isAttackable(slots, idx)) return false;
  if (s.placed.length === 0) return true; // first attacker
  if (s.placed.length === 1) {
    return (
      attackerSum(s, boomer) +
        attackValue(card, boomer) * (doubleAttack ? 2 : 1) >=
      monsterPower(s.monster)
    );
  }
  if (s.placed.length === 2) {
    if (attackerSum(s, boomer) < monsterPower(s.monster)) return false;
    return card.suit === s.monster.suit || isJoker(card);
  }
  return false;
}

export const clearTheDungeonRules = {
  attackValue,
  monsterPower,
  attackerSum,
  isAttackable,
  canPlace,
  maxDamage,
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ClearTheDungeon() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameZoneBackground();
  const level = useGameSettingValue("dungeonLevel") as number;
  const boomer = useGameSettingValue("boomerAce") as boolean;
  const powerReserveOn = useGameSettingValue("powerReserve") as boolean;
  const abilitiesOn = useGameSettingValue("specialAbilities") as boolean;

  const settingsRef = useRef({ level, powerReserveOn });
  settingsRef.current = { level, powerReserveOn };

  const showToast = useToast();

  const [selected, setSelected] = useState<{
    zone: "hand" | "reserve";
    index: number;
  } | null>(null);
  const [reservePick, setReservePick] = useState<string[]>([]);
  const [selectedKing, setSelectedKing] = useState<PlayingCard | null>(null);
  const [kingMode, setKingMode] = useState<{
    type: "return" | "double" | "move";
    kingId: string;
  } | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        setReservePick([]);
        setSelectedKing(null);
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
            ...draft.discard,
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
          draft.damage = 0;
          draft.discard = flipAllToBack(full);
          draft.kings = [];
          draft.reserveSetup = false;
          draft.ended = false;
          draft.won = false;
        });

        await delay();

        setGame((draft) => {
          const shuffled = shuffle(draft.discard);
          const monsters = shuffle(shuffled.filter((c) => isFace(c)));
          const power = shuffle(shuffled.filter((c) => !isFace(c)));

          const layout =
            LAYOUT.rows[settingsRef.current.level] ?? LAYOUT.rows[1];
          const slots: ClearDungeonSlot[] = [];
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
          draft.discard = [];
          draft.deck = power.map(flipToBack);
          draft.hand = sortCardsBySuit(hand);
          draft.reserveSetup = settingsRef.current.powerReserveOn;
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

  // ── Shared mutation helpers (operate on immer draft) ─────────────────────────
  function removeKing(draft: GameState, id: string) {
    const king = draft.kings.find((k) => k.id === id);
    draft.kings = draft.kings.filter((k) => k.id !== id);
    if (king) draft.discard.push(king);
  }

  function defeatMonster(draft: GameState, idx: number) {
    const s = draft.slots[idx];
    for (const p of s.placed) {
      if (p.role === "trigger" && boomer && p.card.rank === "A") {
        draft.hand.push(p.card);
        draft.hand = sortCardsBySuit(draft.hand);
      } else {
        draft.discard.push(p.card);
      }
    }
    s.placed = [];
    s.defeated = true;
    if (abilitiesOn && s.monster.rank === "K") {
      draft.kings.push(flipToFace(s.monster));
    } else {
      draft.discard.push(s.monster);
    }
  }

  function postAction(draft: GameState) {
    if (draft.slots.every((s) => s.defeated)) {
      draft.ended = true;
      draft.won = true;
      return;
    }
    if (draft.damage >= maxDamage) {
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

    draft.hand = sortCardsBySuit(draft.hand);
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function placeOnMonster(idx: number) {
    if (game.ended || game.reserveSetup || !selected || !selectedCard) return;
    const doubling = kingMode?.type === "double";
    if (!canPlace(game.slots, idx, selectedCard, boomer, doubling)) {
      showToast("Not a valid placement");
      return;
    }

    const role = game.slots[idx].placed.length < 2 ? "attack" : "trigger";
    const doubledAttack = doubling && role === "attack";
    const src = selected;
    const doubleKingId = doubledAttack ? kingMode!.kingId : null;

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
        doubled: doubledAttack || undefined,
      });
      if (doubleKingId) removeKing(draft, doubleKingId);
      if (role === "trigger") defeatMonster(draft, idx);
      postAction(draft);
    });

    setSelected(null);
    if (doubledAttack) setKingMode(null);
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
      if (card) {
        draft.damage++;
        draft.discard.push(flipToBack(card));
      }
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

    saveUndoState(structuredClone(game));

    if (suit === "hearts") {
      setKingMode({ type: "return", kingId: king.id });
      setSelectedKing(null);
      setSelected(null);
      return;
    }
    if (suit === "spades") {
      setKingMode({ type: "double", kingId: king.id });
      setSelectedKing(null);
      return;
    }

    if (suit === "diamonds") {
      setGame((draft) => {
        removeKing(draft, king.id);
        postAction(draft);
      });
      setKingMode({ type: "move", kingId: king.id });
      setSelectedKing(null);
      return;
    }

    setGame((draft) => {
      if (suit === "clubs") {
        if (draft.deck.length > 0) {
          const c = draft.deck.pop();
          if (c) draft.hand.push(flipToFace(c));
        }
      }

      draft.hand = sortCardsBySuit(draft.hand);

      removeKing(draft, king.id);
      postAction(draft);
    });
    setSelectedKing(null);
  }

  function resolveMoveKing(moveCard: boolean) {
    if (!kingMode || kingMode.type !== "move") return;
    if (moveCard) {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        if (draft.deck.length > 1) {
          const bottom = draft.deck.shift();
          if (bottom) draft.deck.push(bottom);
        }
        postAction(draft);
      });
    }
    setKingMode(null);
  }

  function selectKing(king: PlayingCard) {
    if (game.ended || game.reserveSetup || kingMode) return;
    setSelectedKing((current) => (current?.id === king.id ? null : king));
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
      setSelectedKing(null);
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
      setSelectedKing(null);
      returnHandCard(index);
      return;
    }
    setSelectedKing(null);
    setSelected((s) =>
      s && s.zone === "hand" && s.index === index
        ? null
        : { zone: "hand", index },
    );
  }

  function onReservePress(index: number) {
    if (game.ended || game.reserveSetup) return;
    setSelectedKing(null);
    setSelected((s) =>
      s && s.zone === "reserve" && s.index === index
        ? null
        : { zone: "reserve", index },
    );
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  const shiftX = (LAYOUT.fixedCols - 1) / 2;

  const zones: MapZone[] = useMemo(() => {
    const extraCardsZone = powerReserveOn || abilitiesOn;

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

    result.push(
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Draw", infoPos: "right" },
      },
      {
        id: "hud",
        name: "hud",
        col: 1.75,
        row: 0,
        width: 2.5,
      },
      {
        id: "clear",
        name: "clear",
        cards: game.discard,
        col: 5,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Dscrd", infoPos: "left" },
      },
    );

    result.push({
      id: "controls",
      col: 0,
      row: LAYOUT.bottomStart,
      width: "full",
      height: 0.9,
    });

    if (extraCardsZone) {
      const reserveCards = [
        ...(powerReserveOn ? game.reserve : []),
        ...(abilitiesOn ? game.kings : []),
      ];
      result.push({
        id: "reserve",
        name: "reserve",
        cards: reserveCards,
        col: 0,
        row: 5.8,
        width: 2.9,
        height: 1.2,
        baseZIndex: 30,
        fan: {
          direction: "right",
          offset: fanOffset(reserveCards.length, 2.9),
        },
        placeholder: {},
      });
    }

    result.push({
      id: "hand",
      name: "hand",
      cards: game.hand,
      col: extraCardsZone ? 3 : 0,
      row: 5.8,
      width: extraCardsZone ? 3 : 6,
      height: 1.2,
      baseZIndex: 60,
      fan: {
        direction: "right",
        offset: fanOffset(game.hand.length, extraCardsZone ? 3 : 6),
      },
      placeholder: {},
    });

    return result;
  }, [game, abilitiesOn, powerReserveOn, level]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "slot" && mappedCard.pileIndex !== undefined) {
      // ----- Slots ----- //
      const idx = mappedCard.pileIndex;
      const attackable = isAttackable(game.slots, idx);
      const canDrop =
        !!selectedCard &&
        canPlace(
          game.slots,
          idx,
          selectedCard,
          boomer,
          kingMode?.type === "double",
        );
      return {
        isDisabled: game.ended || game.reserveSetup || !attackable,
        selectColor: canDrop ? "green" : "none",
        onPress: () => placeOnMonster(idx),
      };
    } else if (mappedCard.zoneName === "hand") {
      // ----- Hand ----- //
      const index = mappedCard.cardIndex;
      const isSelected = game.reserveSetup
        ? reservePick.includes(mappedCard.card.id)
        : selected?.zone === "hand" && selected.index === index;

      return {
        isSelected,
        selectColor: game.reserveSetup ? "purple" : "blue",
        isDisabled: game.ended,
        onPress: () => onHandPress(index),
      };
    } else if (mappedCard.zoneName === "reserve") {
      // ----- Reserve ----- //
      const index = mappedCard.cardIndex;
      const isKing = index >= game.reserve.length;
      if (isKing) {
        const king = mappedCard.card;
        const armed =
          selectedKing?.id === king.id || kingMode?.kingId === king.id;

        return {
          isSelected: armed,
          selectColor: kingMode?.kingId === king.id ? "red" : "green",
          isDisabled: game.ended || game.reserveSetup,
          onPress: () => selectKing(king),
        };
      } else {
        return {
          isSelected: selected?.zone === "reserve" && selected.index === index,
          selectColor: "purple",
          isDisabled: game.ended || game.reserveSetup,
          onPress: () => onReservePress(index),
        };
      }
    } else if (
      mappedCard.zoneName === "placed" &&
      mappedCard.pileIndex !== undefined
    ) {
      // ----- Placed ----- //
      const idx = mappedCard.pileIndex;
      const attackable = isAttackable(game.slots, idx);
      const canDrop =
        !!selectedCard &&
        canPlace(
          game.slots,
          idx,
          selectedCard,
          boomer,
          kingMode?.type === "double",
        );
      const doubled = game.slots[idx].placed.some(
        (placement) =>
          placement.card.id === mappedCard.card.id && placement.doubled,
      );
      return {
        isDisabled: game.ended || game.reserveSetup || !attackable,
        forceOverlayColor: doubled,
        selectColor: doubled ? "red" : canDrop ? "green" : "none",
        onPress: () => placeOnMonster(idx),
      };
    }
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
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

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `Dungeon cleared! Score ${score}.`
          : game.damage >= maxDamage
            ? "Your ran out of health."
            : "You ran out of attacks."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <ProgressBar
          progressValue={maxDamage - game.damage}
          totalValue={maxDamage}
          color={game.damage > 5 ? "red" : game.damage > 3 ? "orange" : "green"}
          iconName="heart"
          autoTallyText
          scaledHeight={cardHeight * 0.5}
        />
      </View>

      {[
        {
          id: "reserve",
          label: "Special",
        },
        {
          id: "hand",
          label: "Hand",
        },
      ].map((label) => {
        if (label.id === "reserve" && !powerReserveOn && !abilitiesOn)
          return null;

        return (
          <View
            key={label.id}
            style={[flexStyles.rowStart, getZoneStylesById(label.id)]}
          >
            <Text
              textTransform="uppercase"
              weight={400}
              style={[
                rotatedText,
                {
                  left: 0,
                  fontSize: cardWidth * 0.16,
                  color: rgba(colorPale, 0.6),
                },
              ]}
            >
              {label.label}
            </Text>
          </View>
        );
      })}

      <View
        style={[
          getZoneStylesById("controls"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        {game.reserveSetup ? (
          <Button
            text={`Set Reserve (${reservePick.length}/2)`}
            size="md"
            onPress={confirmReserve}
            taller
            disabled={reservePick.length !== 2}
            theme="purple"
            style={{ flex: 1 }}
          />
        ) : (
          <>
            <View style={[flexStyles.colCentered, flexStyles.flex1]}>
              {abilitiesOn &&
                (kingMode ? (
                  kingMode.type === "move" ? (
                    <View
                      style={[
                        flexStyles.rowCentered,
                        flexStyles.fullWidth,
                        { gap: spacing(10) },
                      ]}
                    >
                      <Button
                        text={`Move ${cardLabel(game.deck[0])} to top`}
                        size="sm"
                        onPress={() => resolveMoveKing(true)}
                        theme="green"
                        taller
                      />
                      <Button
                        text="Do nothing"
                        size="sm"
                        onPress={() => resolveMoveKing(false)}
                        theme="red"
                        taller
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        flexStyles.rowCentered,
                        flexStyles.fullWidth,
                        { gap: spacing(14) },
                      ]}
                    >
                      <Button
                        text="Cancel"
                        size="sm"
                        onPress={() => {
                          setKingMode(null);
                          setSelectedKing(null);
                        }}
                        theme="red"
                      />
                      <Text style={{ flex: 1, textAlign: "center" }}>
                        {kingHint(
                          kingMode.type === "return"
                            ? "hearts-action"
                            : "spades-action",
                        )}
                      </Text>
                    </View>
                  )
                ) : (
                  <Button
                    text={
                      selectedKing
                        ? kingHint(selectedKing.suit)
                        : "No King selected"
                    }
                    size="md"
                    onPress={() => {
                      if (kingMode) {
                        setKingMode(null);
                      } else if (selectedKing) {
                        activateKing(selectedKing);
                      }
                    }}
                    taller
                    theme={selectedKing || kingMode ? "green" : "none"}
                    fullWidth
                    disabled={!selectedKing && !kingMode}
                  />
                ))}
            </View>

            <Button
              text="Discard"
              size="md"
              onPress={discardSelected}
              taller
              disabled={!selected || selected.zone !== "hand" || game.ended}
              theme="orange"
            />
          </>
        )}
      </View>
    </GameWrapper>
  );
}
