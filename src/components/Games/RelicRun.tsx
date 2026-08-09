import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  isAce,
  isFace,
  isJoker,
  type PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

// ── Config ───────────────────────────────────────────────────────────────────
export type DungeonDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "bloodlust";

type Difficulty = DungeonDifficulty;

const START_STRENGTH: Record<Difficulty, number> = {
  beginner: 5,
  intermediate: 5,
  advanced: 3,
  bloodlust: 1,
};
const MAX_STRENGTH = 10;

const SUIT_GLYPH: Record<string, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
};

function cval(card: PlayingCard) {
  return rankValue(card); // A=1 .. K=13
}
function label(card: PlayingCard) {
  if (isJoker(card)) return "Merchant";
  return `${card.rank}${SUIT_GLYPH[card.suit] ?? ""}`;
}
function enemyBaseHP(rank: string, level: number) {
  const base = rank === "J" ? 5 : rank === "Q" ? 10 : 15;
  return level === 2 ? base * 2 : base;
}
function bountyPoints(rank: string) {
  return rank === "J" ? 10 : rank === "Q" ? 20 : 30;
}

// ── Types ──────────────────────────────────────────────────────────────────
type WeaponSlot = { card: PlayingCard; gem: PlayingCard | null };
type CavernKind = "combat" | "loot";
type Phase = "scout" | "play";

type GameState = {
  difficulty: Difficulty;
  strength: number;
  level: 1 | 2;
  deck: PlayingCard[];
  discard: PlayingCard[];
  cavern: PlayingCard[];
  cavernKind: CavernKind;
  scoutCards: PlayingCard[];
  weapons: WeaponSlot[];
  spells: PlayingCard[];
  gems: PlayingCard[];
  bounties: PlayingCard[];
  merchantOpen: boolean;
  phase: Phase;
  message: string;
  score: number;
  ended: boolean;
  won: boolean;
};

export type RelicRunGameState = GameState;
export type DungeonWeaponSlot = WeaponSlot;

const gameStateInitial: GameState = {
  difficulty: "beginner",
  strength: 5,
  level: 1,
  deck: [],
  discard: [],
  cavern: [],
  cavernKind: "loot",
  scoutCards: [],
  weapons: [],
  spells: [],
  gems: [],
  bounties: [],
  merchantOpen: false,
  phase: "scout",
  message: "",
  score: 0,
  ended: false,
  won: false,
};

// ── Score tiers (from the score-comparison chart) ─────────────────────────────
const TIER_LABELS = [
  "Penniless Peon",
  "Tavern Regular",
  "Foot Soldier",
  "Knight",
  "King's Champion",
  "Folk Hero",
  "Legend",
  "Saviour of the World",
];
const TIER_THRESHOLDS: Record<Difficulty, number[]> = {
  beginner: [0, 60, 120, 180, 240],
  intermediate: [0, 50, 100, 150, 195, 240],
  advanced: [0, 40, 80, 120, 160, 200, 240],
  bloodlust: [0, 35, 70, 105, 140, 175, 210, 240],
};
function scoreTier(score: number, difficulty: Difficulty) {
  const t = TIER_THRESHOLDS[difficulty];
  let idx = 0;
  for (let i = 0; i < t.length; i += 1) if (score >= t[i]) idx = i;
  return TIER_LABELS[idx];
}

// ── Attack computation (pure) ─────────────────────────────────────────────────
type AttackResult = {
  total: number;
  weaponDmg: number;
  spellDmg: number;
  isRelic: boolean;
  isCurse: boolean;
  overrides: boolean;
  hitsBoth: boolean;
  spendSpellIds: string[];
};

export type DungeonAttackResult = AttackResult;

function computeAttack(
  selWeapons: WeaponSlot[],
  selSpells: PlayingCard[],
  selGems: PlayingCard[],
  enemy: PlayingCard | null,
  difficulty: Difficulty,
): AttackResult {
  const powersOn = difficulty !== "beginner";

  // Volatile Relic: one weapon + one spell + one gem, all equal value.
  if (
    selWeapons.length === 1 &&
    selSpells.length === 1 &&
    selGems.length === 1 &&
    cval(selWeapons[0].card) === cval(selSpells[0]) &&
    cval(selWeapons[0].card) === cval(selGems[0])
  ) {
    const v = cval(selWeapons[0].card);
    const total = (v + v + v) * 2;
    return {
      total,
      weaponDmg: total,
      spellDmg: 0,
      isRelic: true,
      isCurse: false,
      overrides: true,
      hitsBoth: true,
      spendSpellIds: [selSpells[0].id],
    };
  }

  let weaponDmg = 0;
  let isCurse = false;
  const spellUsed = new Set<string>();

  for (const w of selWeapons) {
    const base = cval(w.card);
    // Curse: consume a selected spell of equal value for a bonus.
    const curse = selSpells.find(
      (s) => !spellUsed.has(s.id) && cval(s) === base,
    );
    if (curse) {
      weaponDmg += 2 * base + cval(curse);
      spellUsed.add(curse.id);
      isCurse = true;
    } else {
      weaponDmg += base * (w.gem ? 2 : 1);
    }
  }

  let spellDmg = 0;
  for (const s of selSpells) if (!spellUsed.has(s.id)) spellDmg += cval(s);

  if (powersOn && enemy) {
    if (enemy.suit === "clubs") weaponDmg = Math.ceil(weaponDmg / 2);
    if (enemy.suit === "spades") spellDmg = Math.ceil(spellDmg / 2);
  }

  return {
    total: weaponDmg + spellDmg,
    weaponDmg,
    spellDmg,
    isRelic: false,
    isCurse,
    overrides: false,
    hitsBoth: false,
    spendSpellIds: selSpells.map((s) => s.id),
  };
}

// ── Component ────────────────────────────────────────────────────────────────
function buildDungeonDeck(): PlayingCard[] {
  // 52 + 2 jokers, minus hearts A-10 (strength pile) = 44 cards.
  const all = createDeck({ includeJokers: true, faceUp: false });
  return all.filter((c) => !(c.suit === "hearts" && !isFace(c) && !isJoker(c)));
}

export const relicRunRules = {
  cardValue: cval,
  label,
  enemyBaseHP,
  bountyPoints,
  scoreTier,
  computeAttack,
  buildDungeonDeck,
  startStrength: START_STRENGTH,
  maxStrength: MAX_STRENGTH,
};

export default function RelicRun() {
  const { colorDark, colorPale } = useGameColors();
  const difficulty = useGameSettingValue("dungeonDifficulty") as Difficulty;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [giveUpOpen, setGiveUpOpen] = useState(false);
  const [failPick, setFailPick] = useState(false);

  const powersOn = difficulty !== "beginner";

  // ── Draft mutators (operate on immer draft) ────────────────────────────────
  function liveScore(g: GameState) {
    const bounty = g.bounties.reduce((s, c) => s + bountyPoints(c.rank), 0);
    const gems = g.gems.reduce((s, c) => s + cval(c), 0);
    return bounty + gems;
  }

  function finishGame(draft: GameState, survived: boolean) {
    draft.score = liveScore(draft);
    draft.ended = true;
    draft.won = survived && draft.strength > 0;
    draft.merchantOpen = false;
    draft.message = survived
      ? "You cleared the dungeon!"
      : "Your strength gave out in the caverns.";
  }

  function equipOrDiscard(draft: GameState, club: PlayingCard) {
    const val = cval(club);
    if (val > draft.strength) {
      draft.discard.push(club);
      return;
    }
    if (draft.weapons.length < 2) {
      draft.weapons.push({ card: club, gem: null });
      return;
    }
    let weakestIdx = 0;
    for (let i = 1; i < draft.weapons.length; i += 1) {
      if (cval(draft.weapons[i].card) < cval(draft.weapons[weakestIdx].card))
        weakestIdx = i;
    }
    const weakest = draft.weapons[weakestIdx];
    if (val > cval(weakest.card)) {
      draft.discard.push(weakest.card);
      if (weakest.gem) draft.discard.push(weakest.gem);
      draft.weapons[weakestIdx] = { card: club, gem: null };
    } else {
      draft.discard.push(club);
    }
  }

  function routeCard(draft: GameState, card: PlayingCard) {
    if (card.suit === "diamonds") draft.gems.push(card);
    else if (card.suit === "spades") draft.spells.push(card);
    else if (card.suit === "clubs") equipOrDiscard(draft, card);
    else draft.discard.push(card);
  }

  function applyStrengthLoss(draft: GameState, amount: number) {
    draft.strength = Math.max(0, draft.strength - amount);
    // Weapons that now exceed strength are looted away.
    const kept: WeaponSlot[] = [];
    for (const w of draft.weapons) {
      if (cval(w.card) > draft.strength) {
        draft.discard.push(w.card);
        if (w.gem) draft.discard.push(w.gem);
      } else kept.push(w);
    }
    draft.weapons = kept;
    if (draft.strength <= 0) finishGame(draft, false);
  }

  function drawCavern(draft: GameState) {
    if (draft.ended) return;
    if (draft.deck.length === 0) {
      if (draft.level === 1) {
        draft.level = 2;
        draft.deck = shuffle(draft.discard).map(flipToBack);
        draft.discard = [];
        draft.message = "Level 2 — enemy health is doubled!";
        if (draft.deck.length === 0) {
          finishGame(draft, true);
          return;
        }
      } else {
        finishGame(draft, true);
        return;
      }
    }
    const n = Math.min(2, draft.deck.length);
    draft.cavern = draft.deck.splice(0, n).map(flipToFace);
    draft.cavernKind = draft.cavern.some(isFace) ? "combat" : "loot";

    // A merchant among non-combat loot: auto-claim the item, then open the shop.
    if (draft.cavernKind === "loot" && draft.cavern.some(isJoker)) {
      const items = draft.cavern.filter((c) => !isJoker(c));
      for (const it of items) routeCard(draft, it);
      draft.cavern = draft.cavern.filter(isJoker);
      draft.merchantOpen = true;
      draft.message = "A merchant! Trade gems for goods, then leave.";
    }
  }

  function advance(draft: GameState) {
    if (draft.ended || draft.merchantOpen) return;
    if (draft.cavern.length === 0) drawCavern(draft);
  }

  function claimRemaining(draft: GameState) {
    const jokers = draft.cavern.filter(isJoker);
    const items = draft.cavern.filter((c) => !isJoker(c) && !isFace(c));
    for (const it of items) routeCard(draft, it);
    if (jokers.length > 0) {
      draft.cavern = jokers;
      draft.merchantOpen = true;
      draft.message = "A merchant! Trade gems for goods, then leave.";
    } else {
      draft.cavern = [];
    }
  }

  // ── State manager ──────────────────────────────────────────────────────────
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected([]);
        setTarget(null);
        setGiveUpOpen(false);
        setFailPick(false);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          const diff = difficultyRef.current;
          draft.difficulty = diff;
          draft.strength = START_STRENGTH[diff];
          draft.level = 1;
          draft.deck = shuffle(buildDungeonDeck());
          draft.discard = [];
          draft.cavern = [];
          draft.cavernKind = "loot";
          draft.weapons = [];
          draft.spells = [];
          draft.gems = [];
          draft.bounties = [];
          draft.merchantOpen = false;
          draft.score = 0;
          draft.ended = false;
          draft.won = false;
          draft.phase = "scout";
          draft.scoutCards = draft.deck.splice(0, 5).map(flipToFace);
          draft.message = "Scout: choose one card to equip or claim.";
        });
        await delay();
      },
    });

  // ── Derived combat data ─────────────────────────────────────────────────────
  const enemies = useMemo(() => game.cavern.filter(isFace), [game.cavern]);
  const cavernHasAce = game.cavern.some(isAce);

  const enemyHP = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of enemies) {
      let hp = enemyBaseHP(e.rank, game.level) + game.bounties.length;
      if (powersOn && e.suit === "diamonds") hp += game.gems.length;
      map[e.id] = hp;
    }
    return map;
  }, [enemies, game.level, game.bounties.length, game.gems.length, powersOn]);

  const currentTarget =
    target && enemies.some((e) => e.id === target)
      ? target
      : (enemies[0]?.id ?? null);
  const targetEnemy = enemies.find((e) => e.id === currentTarget) ?? null;

  const selWeapons = game.weapons.filter((w) => selected.includes(w.card.id));
  const selSpells = game.spells.filter((s) => selected.includes(s.id));
  const selGems = game.gems.filter((g) => selected.includes(g.id));

  const attack = useMemo(
    () =>
      computeAttack(selWeapons, selSpells, selGems, targetEnemy, difficulty),
    [selWeapons, selSpells, selGems, targetEnemy, difficulty],
  );

  const canEnchant =
    selWeapons.length === 1 &&
    selGems.length === 1 &&
    selSpells.length === 0 &&
    !selWeapons[0].gem &&
    cval(selWeapons[0].card) === cval(selGems[0]);

  const liveScoreValue = game.bounties.reduce(
    (s, c) => s + bountyPoints(c.rank),
    0,
  );
  const gemValue = game.gems.reduce((s, c) => s + cval(c), 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  function keepScout(id: string) {
    const card = game.scoutCards.find((c) => c.id === id);
    if (!card || isFace(card) || isJoker(card)) return;
    if (card.suit === "clubs" && cval(card) > game.strength) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const chosen = draft.scoutCards.find((c) => c.id === id)!;
      routeCard(draft, chosen);
      const rest = draft.scoutCards.filter((c) => c.id !== id);
      draft.deck.push(...rest.map(flipToBack));
      draft.scoutCards = [];
      draft.phase = "play";
      draft.message = "Enter the dungeon.";
      drawCavern(draft);
    });
    setSelected([]);
  }

  function skipScout() {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.deck.push(...draft.scoutCards.map(flipToBack));
      draft.scoutCards = [];
      draft.phase = "play";
      draft.message = "Enter the dungeon.";
      drawCavern(draft);
    });
    setSelected([]);
  }

  function doAttack() {
    if (!targetEnemy || game.ended) return;
    if (attack.total <= 0) {
      setGame((draft) => {
        draft.message = "Select weapons or spells to attack.";
      });
      return;
    }
    const targetId = targetEnemy.id;
    const spendIds = new Set(attack.spendSpellIds);
    const relicGemIds = attack.isRelic ? selGems.map((g) => g.id) : [];
    const relicWeaponIds = attack.isRelic
      ? selWeapons.map((w) => w.card.id)
      : [];
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const diff = draft.difficulty;
      const hpOf = (e: PlayingCard) => {
        let hp = enemyBaseHP(e.rank, draft.level) + draft.bounties.length;
        if (diff !== "beginner" && e.suit === "diamonds")
          hp += draft.gems.length;
        return hp;
      };

      const targets = attack.hitsBoth
        ? draft.cavern.filter(isFace)
        : draft.cavern.filter((e) => e.id === targetId);

      // Determine which targeted enemies are defeated by this attack.
      const defeatedIds = new Set<string>();
      for (const e of targets) {
        if (attack.total >= hpOf(e)) defeatedIds.add(e.id);
      }

      const primaryDefeated = attack.hitsBoth
        ? defeatedIds.size > 0
        : defeatedIds.has(targetId);
      if (!primaryDefeated) {
        draft.message = `Attack ${attack.total} isn't enough (needs ${hpOf(
          targetEnemy,
        )}).`;
        return;
      }

      // Consume spent spells.
      draft.spells = draft.spells.filter((s) => !spendIds.has(s.id));
      // Consume relic cards (weapon + gem destroyed).
      if (attack.isRelic) {
        draft.weapons = draft.weapons.filter(
          (w) => !relicWeaponIds.includes(w.card.id),
        );
        draft.gems = draft.gems.filter((g) => !relicGemIds.includes(g.id));
      }

      // Move defeated enemies to bounties; raise strength for each.
      const defeated = draft.cavern.filter((e) => defeatedIds.has(e.id));
      for (const e of defeated) {
        draft.bounties.push(e);
        draft.strength = Math.min(MAX_STRENGTH, draft.strength + 1);
      }
      draft.cavern = draft.cavern.filter((c) => !defeatedIds.has(c.id));

      const remainEnemies = draft.cavern.filter(isFace);
      if (remainEnemies.length === 0) {
        claimRemaining(draft);
        advance(draft);
        draft.message = "Enemy slain! Loot claimed.";
      } else {
        draft.message = "Enemy slain! One foe still stands.";
      }
    });
    setSelected([]);
    setGiveUpOpen(false);
  }

  function takeDamage() {
    if (!targetEnemy || game.ended) return;
    const heartPower = powersOn && targetEnemy.suit === "hearts";
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      applyStrengthLoss(draft, heartPower ? 2 : 1);
      if (draft.ended) return;
      // Enemies flee; remaining cavern cards go to the discard pile.
      draft.discard.push(...draft.cavern);
      draft.cavern = [];
      draft.message = "You retreat, wounded.";
      advance(draft);
    });
    setSelected([]);
    setGiveUpOpen(false);
    setFailPick(false);
  }

  function surrenderItem(id: string) {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      // Remove the surrendered item from possessions to the discard pile.
      const wIdx = draft.weapons.findIndex((w) => w.card.id === id);
      if (wIdx >= 0) {
        draft.discard.push(draft.weapons[wIdx].card);
        const gem = draft.weapons[wIdx].gem;
        if (gem) draft.discard.push(gem);
        draft.weapons.splice(wIdx, 1);
      } else {
        const sIdx = draft.spells.findIndex((s) => s.id === id);
        if (sIdx >= 0) draft.discard.push(...draft.spells.splice(sIdx, 1));
        else {
          const gIdx = draft.gems.findIndex((g) => g.id === id);
          if (gIdx >= 0) draft.discard.push(...draft.gems.splice(gIdx, 1));
          else return;
        }
      }
      draft.discard.push(...draft.cavern);
      draft.cavern = [];
      draft.message = "The beast flees with your goods.";
      advance(draft);
    });
    setSelected([]);
    setGiveUpOpen(false);
    setFailPick(false);
  }

  function enchant() {
    if (!canEnchant) return;
    const weaponId = selWeapons[0].card.id;
    const gemId = selGems[0].id;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const w = draft.weapons.find((x) => x.card.id === weaponId);
      const gIdx = draft.gems.findIndex((x) => x.id === gemId);
      if (!w || w.gem || gIdx < 0) return;
      w.gem = draft.gems.splice(gIdx, 1)[0];
      draft.message = "Weapon enchanted — double power!";
    });
    setSelected([]);
  }

  function lootCard(id: string) {
    if (game.ended || game.cavernKind !== "loot" || enemies.length > 0) return;
    const card = game.cavern.find((c) => c.id === id);
    if (!card || isJoker(card)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const chosen = draft.cavern.find((c) => c.id === id)!;
      routeCard(draft, chosen);
      draft.discard.push(...draft.cavern.filter((c) => c.id !== id));
      draft.cavern = [];
      draft.message = "Looted.";
      advance(draft);
    });
    setSelected([]);
  }

  function useAceClear() {
    if (game.ended || !cavernHasAce) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const aces = draft.cavern.filter(isAce);
      const others = draft.cavern.filter((c) => !isAce(c));
      draft.deck.push(...others.map(flipToBack)); // to the bottom of the deck
      draft.discard.push(...aces);
      draft.cavern = [];
      draft.message = "Hidden magic clears the cavern.";
      advance(draft);
    });
    setSelected([]);
    setGiveUpOpen(false);
  }

  function buyFromDiscard(id: string) {
    if (game.ended || !game.merchantOpen) return;
    const card = game.discard.find((c) => c.id === id);
    if (!card) return;
    const cost = cval(card);
    if (gemValue < cost) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const sorted = [...draft.gems].sort((a, b) => cval(a) - cval(b));
      let paid = 0;
      const spent = new Set<string>();
      for (const g of sorted) {
        if (paid >= cost) break;
        paid += cval(g);
        spent.add(g.id);
      }
      const spentCards = draft.gems.filter((g) => spent.has(g.id));
      draft.gems = draft.gems.filter((g) => !spent.has(g.id));
      draft.discard.push(...spentCards);
      const bought = draft.discard.find((c) => c.id === id);
      if (!bought) return;
      draft.discard = draft.discard.filter((c) => c.id !== id);
      routeCard(draft, bought);
      draft.message = "Purchased from the merchant.";
    });
    setSelected([]);
  }

  function leaveMerchant() {
    if (!game.merchantOpen) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.discard.push(...draft.cavern);
      draft.cavern = [];
      draft.merchantOpen = false;
      draft.message = "You leave the merchant.";
      advance(draft);
    });
    setSelected([]);
  }

  function toggleSelect(id: string) {
    if (game.ended) return;
    if (failPick) {
      surrenderItem(id);
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────
  const scoutCards = game.scoutCards;
  const merchantItems = useMemo(() => {
    if (!game.merchantOpen) return [];
    return game.discard
      .filter((c) => !isFace(c) && !isJoker(c))
      .filter((c) => cval(c) <= gemValue)
      .slice(0, 10);
  }, [game.merchantOpen, game.discard, gemValue]);

  function fanOffset(count: number, widthUnits: number) {
    if (count <= 1) return 0.4;
    return Math.max(0.16, Math.min(0.5, (widthUnits - 1) / (count - 1)));
  }

  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      { id: "hud", col: 0, row: 0, width: "full", height: 1.2 },
    ];

    if (game.phase === "scout") {
      scoutCards.forEach((card, i) => {
        result.push({
          id: `scout-${i}`,
          name: "scout",
          cards: [card],
          col: 0.4 + i * 1.25,
          row: 1.6,
          baseZIndex: 10,
        });
      });
      result.push({
        id: "controls",
        col: 0,
        row: 4.0,
        width: "full",
        height: 2.2,
      });
      return result;
    }

    // Dungeon row: discard | cavern x2 | deck
    result.push({
      id: "discardPile",
      name: "discardPile",
      cards:
        game.discard.length > 0
          ? [flipToFace(game.discard[game.discard.length - 1])]
          : [],
      col: 0.2,
      row: 1.5,
      placeholder: { text: "Discard" },
    });
    game.cavern.forEach((card, i) => {
      result.push({
        id: `cavern-${i}`,
        name: "cavern",
        cards: [card],
        col: 2.0 + i * 1.3,
        row: 1.5,
        baseZIndex: 10,
      });
    });
    if (game.cavern.length === 0) {
      result.push({
        id: "cavernEmpty",
        col: 2.0,
        row: 1.5,
        placeholder: { text: "Cavern" },
      });
    }
    result.push({
      id: "deckPile",
      name: "deckPile",
      cards: game.deck.length > 0 ? [game.deck[game.deck.length - 1]] : [],
      col: 5.4,
      row: 1.5,
      placeholder: { text: "Stock" },
    });

    result.push({
      id: "enemyInfo",
      col: 0,
      row: 3.0,
      width: "full",
      height: 0.7,
    });

    // Hero row: weapons + bounties
    result.push({
      id: "heroLabel",
      col: 0,
      row: 3.7,
      width: "full",
      height: 0.4,
    });
    for (let i = 0; i < 2; i += 1) {
      const w = game.weapons[i];
      result.push({
        id: `weapon-${i}`,
        name: "weapon",
        cards: w ? (w.gem ? [w.gem, w.card] : [w.card]) : [],
        col: 0.3 + i * 1.35,
        row: 4.1,
        fan: { direction: "right", offset: 0.22, center: false },
        placeholder: { text: `Wpn ${i === 0 ? "I" : "II"}` },
      });
    }
    result.push({
      id: "bounties",
      name: "bounties",
      cards: game.bounties,
      col: 3.2,
      row: 4.1,
      width: 3.5,
      fan: {
        direction: "right",
        offset: fanOffset(game.bounties.length, 3.5),
        center: true,
      },
      placeholder: { text: "Bounties" },
    });

    // Spells + gems row
    result.push({
      id: "spells",
      name: "spells",
      cards: game.spells,
      col: 0.3,
      row: 5.7,
      width: 3.1,
      fan: {
        direction: "right",
        offset: fanOffset(game.spells.length, 3.1),
        center: true,
      },
      placeholder: { text: "Spells" },
    });
    result.push({
      id: "gems",
      name: "gems",
      cards: game.gems,
      col: 3.6,
      row: 5.7,
      width: 3.1,
      fan: {
        direction: "right",
        offset: fanOffset(game.gems.length, 3.1),
        center: true,
      },
      placeholder: { text: "Gems" },
    });

    result.push({
      id: "controls",
      col: 0,
      row: 7.2,
      width: "full",
      height: 2.6,
    });
    return result;
  }, [game, scoutCards]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const zone = mappedCard.zoneName;
    const id = mappedCard.card.id;

    if (zone === "scout") {
      const card = mappedCard.card;
      const claimable = !isFace(card) && !isJoker(card);
      return {
        isDisabled: !claimable || game.ended,
        selectColor: "green",
        onPress: () => keepScout(id),
      };
    }
    if (zone === "cavern") {
      const card = mappedCard.card;
      const isEnemy = isFace(card);
      if (isEnemy) {
        return {
          isSelected: id === currentTarget,
          selectColor: "red",
          forceSelectColor: id === currentTarget,
          isDisabled: game.ended,
          onPress: () => setTarget(id),
        };
      }
      if (
        game.cavernKind === "loot" &&
        enemies.length === 0 &&
        !game.merchantOpen
      ) {
        return { selectColor: "green", onPress: () => lootCard(id) };
      }
      return { isDisabled: true };
    }
    if (zone === "weapon" || zone === "spells" || zone === "gems") {
      return {
        isSelected: selected.includes(id),
        selectColor: failPick ? "orange" : "blue",
        isDisabled: game.ended,
        onPress: () => toggleSelect(id),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.08,
    cardSize: "small",
    fixedRows: 9.8,
  });

  const winLoseMessage = game.won
    ? `You survived! ${scoreTier(game.score, game.difficulty)} (${game.score} pts).`
    : `Defeated. ${scoreTier(game.score, game.difficulty)} (${game.score} pts).`;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[getZoneStylesById("hud"), { justifyContent: "center", gap: 2 }]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="sm" weight={700} color={colorPale}>
            {SUIT_GLYPH.hearts} Strength {game.strength}/{MAX_STRENGTH}
          </Text>
          <Text size="xs" weight={600} color={colorPale}>
            Level {game.level} · {game.difficulty}
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="xs" weight={500} color={colorPale}>
            Deck {game.deck.length} · Discard {game.discard.length}
          </Text>
          <Text size="xs" weight={500} color={colorPale}>
            Slain {game.bounties.length} · Score {liveScoreValue + gemValue}
          </Text>
        </View>
      </View>

      {game.phase === "play" ? (
        <View
          style={[
            getZoneStylesById("enemyInfo"),
            { justifyContent: "center", gap: 1 },
          ]}
        >
          {enemies.length > 0 ? (
            <Text size="xs" weight={600} color={colorPale}>
              {enemies
                .map(
                  (e) =>
                    `${label(e)} HP ${enemyHP[e.id]}${
                      e.id === currentTarget ? " ◄" : ""
                    }${powersOn ? ` [${e.suit}]` : ""}`,
                )
                .join("   ")}
            </Text>
          ) : (
            <Text size="xs" weight={500} color={colorPale}>
              {game.cavernKind === "loot" && game.cavern.length > 0
                ? "Tap a cavern card to loot it."
                : ""}
            </Text>
          )}
        </View>
      ) : null}

      {game.phase === "play" ? (
        <View
          style={[getZoneStylesById("heroLabel"), { justifyContent: "center" }]}
        >
          <Text size="xs" weight={600} color={colorPale}>
            Hero — tap your cards to build an attack
          </Text>
        </View>
      ) : null}

      {/* Controls */}
      <View style={[getZoneStylesById("controls"), { gap: 6 }]}>
        <Text size="xs" weight={400} color={colorPale}>
          {game.message}
        </Text>

        {game.phase === "scout" ? (
          <View style={{ gap: 6 }}>
            <Text size="xs" weight={400} color={colorPale}>
              Tap a club (weapon ≤ strength), spade (spell) or diamond (gem) to
              keep. The rest go to the bottom of the deck.
            </Text>
            <Button
              text="Skip (keep nothing)"
              size="sm"
              onPress={skipScout}
              theme={colorDark}
            />
          </View>
        ) : null}

        {game.phase === "play" && game.merchantOpen ? (
          <View style={{ gap: 6 }}>
            <Text size="xs" weight={500} color={colorPale}>
              Merchant — you have {gemValue} gem value to spend.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ maxHeight: 44 }}
            >
              <View style={{ flexDirection: "row", gap: 6 }}>
                {merchantItems.length === 0 ? (
                  <Text size="xs" weight={400} color={colorPale}>
                    Nothing affordable.
                  </Text>
                ) : (
                  merchantItems.map((c) => (
                    <Button
                      key={c.id}
                      text={`${label(c)} (${cval(c)})`}
                      size="sm"
                      onPress={() => buyFromDiscard(c.id)}
                      theme={colorDark}
                    />
                  ))
                )}
              </View>
            </ScrollView>
            <Button
              text="Leave Shop"
              size="md"
              onPress={leaveMerchant}
              theme="red"
            />
          </View>
        ) : null}

        {game.phase === "play" && !game.merchantOpen && enemies.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Text size="xs" weight={600} color={colorPale}>
              Attack {attack.total}
              {attack.isRelic
                ? " (Volatile Relic — ignores powers, hits all!)"
                : attack.isCurse
                  ? " (Cursed!)"
                  : ""}
            </Text>
            {failPick ? (
              <View style={{ gap: 6 }}>
                <Text size="xs" weight={500} color={colorPale}>
                  Tap one of your items to surrender to the beast.
                </Text>
                <Button
                  text="Cancel"
                  size="sm"
                  onPress={() => {
                    setFailPick(false);
                    setGiveUpOpen(true);
                  }}
                  theme={colorDark}
                />
              </View>
            ) : giveUpOpen ? (
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Button
                  text={`Take Damage (-${
                    powersOn && targetEnemy?.suit === "hearts" ? 2 : 1
                  })`}
                  size="sm"
                  onPress={takeDamage}
                  theme="red"
                />
                <Button
                  text="Surrender Item"
                  size="sm"
                  onPress={() => setFailPick(true)}
                  theme={colorDark}
                />
                <Button
                  text="Back"
                  size="sm"
                  onPress={() => setGiveUpOpen(false)}
                  theme={colorDark}
                />
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Button
                  text="Attack"
                  size="md"
                  onPress={doAttack}
                  disabled={attack.total <= 0}
                  theme={colorDark}
                />
                {canEnchant ? (
                  <Button
                    text="Enchant"
                    size="sm"
                    onPress={enchant}
                    theme={colorDark}
                  />
                ) : null}
                <Button
                  text="Give Up"
                  size="sm"
                  onPress={() => setGiveUpOpen(true)}
                  theme={colorDark}
                />
                {cavernHasAce ? (
                  <Button
                    text="Ace: Clear"
                    size="sm"
                    onPress={useAceClear}
                    theme={colorDark}
                  />
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {game.phase === "play" &&
        !game.merchantOpen &&
        enemies.length === 0 &&
        game.cavern.length > 0 ? (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {canEnchant ? (
              <Button
                text="Enchant"
                size="sm"
                onPress={enchant}
                theme={colorDark}
              />
            ) : null}
            {cavernHasAce ? (
              <Button
                text="Ace: Clear (to deck bottom)"
                size="sm"
                onPress={useAceClear}
                theme={colorDark}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </GameWrapper>
  );
}
