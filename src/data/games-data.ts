import React from "react";
import { GameThumbnailName } from "./game-thumbnails";

export enum GameCategory {
  Misc = "Misc",
  Isaludo = "Isaludo",
  ClassicSolitaire = "ClassicSolitaire",
  Beta = "Beta",
}

export const GameCategoryNames: Record<GameCategory, string> = {
  [GameCategory.Misc]: "Misc",
  [GameCategory.Isaludo]: "Isaludo Collection",
  [GameCategory.ClassicSolitaire]: "Classic Solitaire",
  [GameCategory.Beta]: "Beta",
};

export type HexColor = `#${string}`;

export type GameStats = {
  complexity: number;
  difficulty: number;
  luck: number;
};

const DEFAULT_GAME_THUMBNAIL: GameThumbnailName = "DefaultThumbnail.jpg";

export type GameMenuInfo = {
  title: string;
  thumbnail: GameThumbnailName;
  cardBack?: string;
  cardColorBg: HexColor;
  cardColorText: HexColor;
  cardDescription: string;
  stats: GameStats;
  enabled?: boolean;
  about?: string[];
  briefRules: string[];
  howToPlay?: string[];
  byLine?: string;
  category: GameCategory;
};

export const GAMES_DATA: Record<string, GameMenuInfo> = {
  // ============================== //
  // ========== Scoundrel ========== //
  // ============================== //
  // Scoundrel
  "/scoundrel": {
    title: "Scoundrel",
    thumbnail: "Scoundrel.jpg",
    cardBack: "Scoundrel.png",
    cardColorBg: "#1d2a2e",
    cardColorText: "#ced19c",
    cardDescription:
      "A dungeon crawl where you manage weapon strength and potion usage.",
    stats: {
      complexity: 70,
      difficulty: 70,
      luck: 30,
    },
    category: GameCategory.Misc,
    briefRules: [
      "Build each room to 4 face-up cards; resolve 3 cards and carry 1 forward.",
      "Fight monsters barehanded or with a weapon, but weapon kills must be non-increasing in value.",
      "You may run from a full room, but never two rooms in a row.",
      "Reach the end of the dungeon before your health hits 0.",
    ],
    byLine: "by Zach Gage and Kurt Bieg",
    about: [
      "Scoundrel is a compact dungeon-crawling solitaire game played with a reduced standard deck.",
      "Every decision matters: when to equip, when to tank damage, when to retreat, and when to push for a clean finish.",
    ],
    howToPlay: [
      "Start with 20 health. The dungeon contains black-suit monsters (A counts as 14), diamond weapons (2-10), and heart potions (2-10).",
      "At the start of a room, reveal cards from the dungeon until 4 room cards are face up.",
      "On each room, resolve exactly 3 cards. The 4th card remains and carries into the next room.",
      "Weapon cards are binding: equipping a new weapon discards your old weapon and any monsters stacked on it.",
      "Monster damage is reduced by your equipped weapon value. After a weapon kills a monster, it can only be used on monsters of equal or lower value than the last one it killed.",
      "You can run from a full room by placing all 4 room cards at the bottom of the dungeon, but you cannot run two rooms in a row.",
      "You lose at 0 health. You win by emptying the dungeon and room; your score is based on remaining health (with bonus conditions on a perfect potion finish).",
    ],
  },

  // The Bogey
  "/the-bogey": {
    enabled: false,
    title: "The Bogey",
    thumbnail: "Calculation.jpg",
    cardColorBg: "#1a2332",
    cardColorText: "#f0e8d8",
    cardDescription:
      "Build columns of cards in decreasing suit-matched sequences while playing against the mysterious Bogey.",
    stats: {
      complexity: 60,
      difficulty: 65,
      luck: 35,
    },
    category: GameCategory.Misc,
    briefRules: [
      "Build columns with same-suit cards in decreasing value (K to A).",
      "Start with 5 cards in hand; draw to maintain 5 cards each turn.",
      "Alternate turns between you and the Bogey; the Bogey plays from the deck.",
      "Win by building columns efficiently: novice=12, normal=11, advanced=10, legendary=9, epic=8.",
    ],
    byLine: "Designer: Katharine Turner, 2016",
    about: [
      "Play against the Bogey in a tactical card game of columns and choices.",
      "Each decision to play, discard, or hold cards directly impacts your path to victory.",
      "The challenge lies in building enough columns to win while managing the Bogey's plays.",
    ],
    howToPlay: [
      "Start with an empty board and a hand of 5 cards dealt from a standard deck (no jokers).",
      "On your turn, draw cards to bring your hand back to 5. Then, for each card decide whether to play it, discard it, or hold it.",
      "Play a card by adding it to the bottom of an existing column (if same suit and lower value) or starting a new column (limited to 12 total).",
      "Cards in a column must be the same suit and decrease in value (K,Q,J,10,9,8,7,6,5,4,3,2,A), but may skip values.",
      "After your turn, the Bogey plays the next card from the deck. You choose which column it goes to.",
      "If the Bogey's card cannot be played legally, you lose immediately.",
      "When the deck runs out, shuffle the discards to create a new deck.",
      "You win by building columns efficiently. Fewer columns is better: aim for 12 (novice), 11 (normal), 10 (advanced), 9 (legendary), or 8 (epic).",
      "For a harder variant, start with a hand of 4 instead of 5, letting the Bogey play more often.",
    ],
  },

  // Regicide
  "/regicide": {
    title: "Regicide",
    cardBack: "Regicide.png",
    thumbnail: "Regicide.jpg",
    cardColorBg: "#1a1a2e",
    cardColorText: "#e8d5b7",
    cardDescription:
      "Defeat 12 royal enemies using card combos and suit powers.",
    stats: {
      complexity: 85,
      difficulty: 80,
      luck: 25,
    },
    category: GameCategory.Misc,
    briefRules: [
      "Play cards to deal damage to enemies: Jack (20 HP), Queen (30 HP), King (40 HP).",
      "Use suit powers: Hearts heal, Diamonds draw, Clubs double damage, Spades block enemy attacks.",
      "Discard cards to block enemy damage each turn.",
      "Defeat all 12 enemies to win: Gold (no Jesters), Silver (1 Jester), Bronze (2 Jesters).",
    ],
    byLine: "Designer: Lawrence Beveridge",
    about: [
      "Regicide is a challenging solo cooperative card game where you battle corrupted royalty.",
      "Combine cards strategically to defeat Jacks, Queens, and Kings using their suit powers.",
      "Each enemy becomes harder—manage your hand and resources carefully to achieve victory.",
    ],
    howToPlay: [
      "Arrange Castle deck: Jacks (bottom), Queens, Kings (top). Start with Jack as first enemy.",
      "Deal 8 cards from Tavern deck (cards 2-10, Animal Companions, Jesters). Max hand: 8 cards.",
      "Each turn: Play a card (deal damage), activate its suit power, check if enemy defeated, take enemy damage.",
      "Card values count as attack damage (A=1 or 20, 2-10=face value, J/Q/K=11/12/13).",
      "Suit powers: Hearts shuffle discard to heal, Diamonds draw cards, Clubs double damage, Spades reduce enemy attack.",
      "After playing, discard cards from hand (equal to enemy's reduced attack value) to block damage.",
      "Defeat the 12 enemies by dealing enough cumulative damage. Victory type: Gold (0 Jesters), Silver (1), Bronze (2).",
      "Jester power: Discard entire hand and refill to 8—restores options but limits victory level.",
    ],
  },

  // Card Capture
  "/card-capture": {
    enabled: false,
    title: "Card Capture",
    thumbnail: "HideAndSeek.jpg",
    cardColorBg: "#2b2d42",
    cardColorText: "#d4cdc3",
    cardDescription:
      "Capture enemy combatants using strategic card plays and careful hand management.",
    stats: {
      complexity: 75,
      difficulty: 70,
      luck: 40,
    },
    category: GameCategory.Misc,
    briefRules: [
      "Capture face cards (J,Q,K,A) from the Enemy Row using same-suit cards from your hand.",
      "Spend cards equal to or greater than the target card's value to capture it.",
      "Manage your Personal Draw Deck (2s, 3s, 4s, Jokers) and avoid letting enemy capture face cards.",
      "Win by emptying Enemy Draw Deck and Enemy Row without face cards in Enemy Capture Pile.",
    ],
    about: [
      "Card Capture is a tactical solitaire game of hand management and strategic choices.",
      "Use your limited tools (2s, 3s, 4s) to defeat powerful enemies (J,Q,K,A).",
      "Each round offers multiple options: capture an enemy, sacrifice cards, or let them take from you.",
    ],
    howToPlay: [
      "Personal Draw Deck contains all 2s, 3s, 4s, and both Jokers. Enemy Draw Deck contains remaining cards.",
      "Setup: Draw 4 cards from Enemy Deck into positions 1-4. Remove any face cards to bottom of Enemy Deck.",
      "Each round: Enemy Phase (refill empty positions) → Discard Phase (discard up to 4 cards) → Draw Phase (draw to 4) → Capture Phase.",
      "In Capture Phase, choose one: (1) Capture an enemy card by spending same-suit cards totaling its value or more, (2) Let enemy capture one of your cards, or (3) Sacrifice 2 cards to send 1 enemy card to bottom of Enemy Deck.",
      "Card values: 2-10 are face value, J=11, Q=12, K=13, A=14. Jokers act as any value of any suit.",
      "LOSE if any face card (J,Q,K,A) enters the Enemy Capture Pile.",
      "WIN when Enemy Draw Deck is empty, all positions are empty, and no face cards were captured.",
    ],
  },

  // Bowling Solitaire
  "/bowling-solitaire": {
    enabled: false,
    title: "Bowling Solitaire",
    thumbnail: "Golf.jpg",
    cardColorBg: "#1a1f36",
    cardColorText: "#f4e4c1",
    cardDescription:
      "Play 10 frames of solitaire bowling, knocking down pins using card arithmetic and strategy.",
    stats: {
      complexity: 70,
      difficulty: 75,
      luck: 35,
    },
    category: GameCategory.Misc,
    briefRules: [
      "Arrange 10 cards into a bowling pin formation; use 3 ball piles to knock down pins.",
      "Match card value (1-10) to the final digit of adjacent pin sums to knock them down.",
      "Score like real 10-Pin Bowling: strikes (10+next 2 balls), spares (10+next 1 ball).",
      "Play 10 frames; higher score wins.",
    ],
    byLine: "Designer: Sid Sackson",
    about: [
      "Bowling Solitaire translates the classic sport into a card game using clever arithmetic.",
      "Select cards strategically and calculate pin combinations to maximize your score.",
      "Master real bowling scoring rules to achieve strikes, spares, and perfect frames.",
    ],
    howToPlay: [
      "Use one suit (10 cards 1-10 and 3 ball piles of 5, 3, 2 cards). Arrange 10 pins in bowling formation: 4 back, 3 middle, 2 front, 1 front.",
      "Turn up top card of each ball pile. Select one card and try to knock down pins whose sum equals your card's value (ending digit matches).",
      "Example: 8 card can knock pins summing to 8, 18, 28, etc. On turn 1: cannot remove back row or center pin alone.",
      "After knocking down pins, turn up next card in that pile. If no valid move exists, record pins knocked (first ball).",
      "On second ball: knock down remaining pins that are adjacent to already-removed pins. If no valid move, frame ends.",
      "Scoring: Real bowling rules apply. Strike (all 10 on ball 1) = 10 + next 2 balls. Spare (all 10 on ball 2) = 10 + next 1 ball.",
      "Play 10 frames. Frame 10 allows extra balls if strike/spare scored. Try to beat your highest total score!",
    ],
  },

  // ============================== //
  // ========== Isaludo ========== //
  // ============================== //
  // Area 52
  "/area-52": {
    title: "Area 52",
    thumbnail: "Area52.jpg",
    cardBack: "Area52.png",
    cardColorBg: "#2a2836",
    cardColorText: "#b5faff",
    cardDescription:
      "Fight off waves of alien invaders before running out of defenders.",
    stats: {
      complexity: 70,
      difficulty: 70,
      luck: 30,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Survive both waves of alien invaders before running out of defenders to win.",
      "Single attacks must be of greater value and opposite color to the attacker.",
      "Dual attacks must add up to exactly the attacker's value. During wave 2, defenders matching the attacker's color are lost.",
      "Use sacrifices as a last resort.",
    ],
    about: [
      "Strategically command your defenders to fight off two waves of invading aliens.",
      "This game is adapted from Wil Su's Isaludo collection.",
    ],
    howToPlay: [
      "To win, you must survive both waves of alien invaders before running out of defenders.",
      "Each wave is made up of a series of attacks. Choose one or two defenders to tackle the lead attacker.",
      "Single attacks can be done with a defender of greater value and opposite color to the attacker. After a single attack, the defender is lost, and is replaced with the attacker.",
      "Dual attacks can be done with two cards whose total value equals the attacker's value. No attackers are lost during dual attacks, except during the second wave, where defenders matching the attacker's color are lost.",
      "Sacrifices can be used to move the lead attacker to the back of the attacker deck; the sacrified defender is lost.",
    ],
  },
  // The Sandwich Guy
  "/the-sandwich-guy": {
    title: "The Sandwich Guy",
    thumbnail: "SandwichGuy.jpg",
    cardBack: "SandwichGuy.png",
    cardColorBg: "#102524",
    cardColorText: "#b0eee9",
    cardDescription:
      "Serve sandwiches by selecting evenly spaced cards; don't let your ingredients run out!",
    stats: {
      complexity: 20,
      difficulty: 80,
      luck: 40,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Select three cards with equally-spaced rank values to create a sandwich.",
      "A/J/Q/K are worth 1/11/12/13, and wrapping around A/K is allowed",
      "Use same suits, or same colors, for better hand refills.",
    ],
    about: [
      "Make sandwiches with ingredients available in your food truck. The quality of each sandwich determines how many ingredients will refill your prep area. Sell out your entire inventory to win!",
      "This game is adapted from Wil Su's Isaludo collection.",
    ],
    howToPlay: [
      "Select three cards with equally-spaced rank values to create a sandwich.",
      "Aces, Jacks, Queens, Kings are worth 1, 11, 12, and 13, respectively.",
      'Card ranks can "wrap around" the Ace and King (e.g. 9, Q, and 2 is a valid selection).',
      "Your hand will be refilled with: 4 cards if the sandwich cards were of the same suit, 3 cards if the sandwich cards were the same color (but a different suit), or 2 cards if the sandwich cards had mixed colors.",
    ],
    // howToPlay: ["Lorem ipsum"],
  },
  // Dead Center
  "/dead-center": {
    title: "Dead Center",
    thumbnail: "DeadCenter.jpg",
    cardBack: "DeadCenter.png",
    cardColorBg: "#0f2430",
    cardColorText: "#f7d1ca",
    cardDescription:
      "Defend your cabin against a siege of zombies, using supporting cards strategically.",
    stats: {
      complexity: 75,
      difficulty: 50,
      luck: 20,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Kill all 12 zombies surrounding your 3x3 cabin before the deck runs out.",
      "Cards can be placed on a card of: equal value, the same color and greater value, or of opposite color and less value.",
      "Placed cards may kill adjacent zombies depending on the rank and value of the other cards in that line (see instructions).",
    ],
    about: [
      "Your 3x3 cabin is surrounded by zombies! Plan ahead: your ability to attack depends on surrounding cards!",
      "This game is adapted from Wil Su's Isaludo collection.",
    ],
    howToPlay: [
      "You must eliminate all zombies before running out of cards to win.",
      "During each turn, you may reveal a zombie if able, draw and play a card on a valid pile, and kill an adjacent zombie if you can.",
      "A drawn cards can be placed on top of an existing pile if that card is either: of equal value, of the same color and greater value, or of opposite color and less value, than a pile's top card.",
      "You may only kill a zombie adjacent to the last card placed, in addition to meeting the requirements for that zombie's rank. Those requirements depend on the two support cards that are in the same line as the zombie and the last played card. In addition, both support cards must add up to 10 (Jokers and Aces are worth 1).",
      "To kill a King, both support cards must match the King's suit.",
      "To kill a Queen, both support cards must match the Queen's suit.",
      "There are no restrictions to kill Jacks.",
    ],
  },
  // Foursquare
  "/foursquare": {
    title: "Foursquare",
    thumbnail: "Foursquare.jpg",
    cardBack: "Foursquare.png",
    cardColorBg: "#202640",
    cardColorText: "#fff5ca",
    cardDescription:
      "A tile-laying game where each move can disrupt the precarious grid.",
    stats: {
      complexity: 30,
      difficulty: 50,
      luck: 40,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Manage four zones with distinct placement constraints.",
      "Sequence cards so each zone can continue progressing.",
      "Complete all target zone conditions before deck lockout.",
    ],
    about: [
      "As the major of Flavortown, you are responsible for the placement of new restaurants across the grid. New restaurants (cards) that are the lowest or highest quality (rank) within their row or column will cause other restaurants to go out of business, or open up to challenge the newcomer.",
      "To win, you must manage to have 16 open restaurants (face up) within the 4x4 grid.",
      "This game is adapted from Wil Su's Isaludo collection.",
    ],
    howToPlay: [
      "Each turn, place the top card from the draw deck on a pile within the grid. You can start a new pile (as long as it's adjacent to an existing pile), or place a card on top of an existing pile (piles can have at most 4 cards).",
      "After a card is placed, if that card is the highest or lowest of its row or column, the cards in that row or column are flipped (face up or down). The value of face down cards are not used to determined which cards must be flipped. Aces are worth 1.",
      "At any given time, you must not have more than 4 piles whose top cards are face down.",
      "Win by having all 16 piles end up with a face up top card.",
    ],
  },
  // Skyway
  "/skyway": {
    title: "Skyway",
    thumbnail: "Skyway.jpg",
    cardBack: "Skyway.png",
    cardColorBg: "#1d2a35",
    cardColorText: "#b3d5ec",
    cardDescription:
      "Draft from a shifting market to engineer long suit-based routes across a growing grid.",
    stats: {
      complexity: 90,
      difficulty: 65,
      luck: 50,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Win by creating paths of length 5 or more for each suit.",
      "Create paths by placing cards of increasing value, within the same suit, in adjacent grid cells.",
      "Build grid cells of at most 3 cards tall by drawing cards from the market over 3 full passes of the deck.",
    ],
    about: [
      "You are a city planner in charge of designing a new traffic interchange. To be successful, you must create paths of sufficient length for each suit.",
    ],
    howToPlay: [
      "Each turn, you may draw one set of cards from the market. The other cards are moved to the discard pile. You will go through the full deck three times.",
      "You can place cards on any grid cell, but only the top 3 cards will be kept.",
      "Create paths by placing cards of increasing value, within the same suit, in adjacent grid cells.",
      "To win, you must create paths of length 5 or more for each suit.",
    ],
  },
  // The Emissary
  "/the-emissary": {
    title: "The Emissary",
    thumbnail: "Emissary.jpg",
    cardBack: "TheEmissary.png",
    cardColorBg: "#221c35",
    cardColorText: "#acdeff",
    cardDescription:
      "Win exactly the right number of debates in each kingdom while managing one-time advisors.",
    stats: {
      complexity: 70,
      difficulty: 60,
      luck: 30,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Win by successfully debating all 8 kindgoms.",
      "You must win the exact number of required debates for each kingdom (1 to 8).",
      "Collect and use advisors wisely.",
    ],
    about: [
      "You are a young noble, send by your father to gather support from eight neighboring kingdoms. You must engage in a series of debates to win over each kingdom's ruler.",
    ],
    howToPlay: [
      "You must visit each kingdom, and win the exact number of debates indicated by the number of that kingdom (1 through 8).",
      "You start each visit with 8 cards, and four advisors (Jacks). When winning over a kingdom, its ruler joins you as an advisor (Queen/King), but you may only use their services once, whereas your own advisors can be used anew each kingdom.",
      "When ready, select the next topic to debate. When able, you must be a card of the same suit.",
      "Each ruler has a trump suit (its own). To win a debate, you must play a card of higher value and of the same suit, or any card of the trump suit.",
    ],
  },
  // The First Boba Tea Shop in London
  "/the-boba-tea-shop": {
    title: "The Boba Tea Shop",
    thumbnail: "BobaTea.jpg",
    cardBack: "BobaTeaShop.png",
    cardColorBg: "#2b1c29",
    cardColorText: "#eed5a0",
    cardDescription:
      "A push-your-luck game where you must manage ordered queues of customers.",
    stats: {
      complexity: 30,
      difficulty: 40,
      luck: 55,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Play cards into valid stacks to satisfy order constraints.",
      "Plan around blocked stacks so you do not run out of legal moves.",
      "Complete all required stacks to win.",
    ],
    howToPlay: [
      "Play cards into valid stacks to satisfy order constraints.",
      "Plan around blocked stacks so you do not run out of legal moves.",
      "Complete all required stacks to win.",
      "You are allowed to tap the deck at any time to see who else is waiting, but the deck will be reshuffled afterwards.",
    ],
  },
  // Syndicate
  "/syndicate": {
    title: "Syndicate",
    thumbnail: "Syndicate.jpg",
    cardColorBg: "#252220",
    cardColorText: "#b2eee1",
    cardDescription:
      "Stategically promote members and candidates to the top of the syndicate hierarchy.",
    stats: {
      complexity: 70,
      difficulty: 70,
      luck: 30,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Build and convert stacks under syndicate rank restrictions.",
      "Use timing windows to secure high-value conversions.",
      "Game ends when objective is met or no legal move remains.",
    ],
  },
  // Hide and Seek
  "/hide-and-seek": {
    title: "Hide and Seek",
    thumbnail: "HideAndSeek.jpg",
    cardBack: "HideAndSeek.png",
    cardColorBg: "#221815",
    cardColorText: "#c5f7da",
    cardDescription:
      "Find your hidden playmates through careful planning and deduction.",
    stats: {
      complexity: 20,
      difficulty: 65,
      luck: 65,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Reveal hidden cards through legal uncover moves.",
      "Avoid locking hidden cards under unusable stacks.",
      "Finish by uncovering and resolving the final hidden sets.",
    ],
  },
  // Loot the Loop
  "/loot-the-loop": {
    title: "Loot the Loop",
    thumbnail: "LootTheLoop.jpg",
    cardBack: "LootTheLoop.png",
    cardColorBg: "#2e151f",
    cardColorText: "#eeddb8",
    cardDescription:
      "Capture scoring loop cards while preserving momentum and avoiding disruptive breaks.",
    stats: {
      complexity: 50,
      difficulty: 45,
      luck: 60,
    },
    category: GameCategory.Isaludo,
    byLine: "Game design by Wil Su",
    briefRules: [
      "Capture valid loop cards into the score pile.",
      "Protect scoring tempo by avoiding loop breaks.",
      "Win by reaching the game score objective before deck exhaustion.",
    ],
  },
  // ======================================= //
  // ========== Classic Solitaire ========== //
  // ======================================= //
  // Monte Carlo
  "/monte-carlo": {
    title: "Monte Carlo",
    thumbnail: "MonteCarlo.jpg",
    cardBack: "MonteCarlo.png",
    cardColorBg: "#222f3d",
    cardColorText: "#b1dada",
    cardDescription:
      "Clear the grid by matching adjacent cards and strategically consolidating.",
    stats: {
      complexity: 10,
      difficulty: 20,
      luck: 30,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Flip over any adjacent, equal-rank pairs.",
      "Consolidate the deck to remove flipped cards and refill the grid.",
      "Win by clearing all cards.",
    ],
  },
  // Calculation
  "/calculation": {
    title: "Calculation",
    thumbnail: "Calculation.jpg",
    cardBack: "Calculation.png",
    cardColorBg: "#12122b",
    cardColorText: "#eccfff",
    cardDescription: "Build four foundations with set step intervals.",
    stats: {
      complexity: 80,
      difficulty: 90,
      luck: 60,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Build four foundations with increasing step intervals of 1, 2, 3, and 4.",
      "Stock pile cards can be moved to any waste piles, or any suitable foundation.",
      "Only the top card of a waste pile can be moved, and only to a suitable foundation.",
      "Win by placing all cards (up to Kings) on foundations.",
    ],
  },
  // Accordion
  "/accordion": {
    title: "Accordion",
    thumbnail: "Accordion.jpg",
    cardBack: "Accordion.png",
    cardColorBg: "#351219",
    cardColorText: "#fffccf",
    cardDescription:
      "Compress a wide spread of cards by jumping matches one or three positions left.",
    stats: {
      complexity: 10,
      difficulty: 35,
      luck: 65,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Move a card onto another card 1 or 3 spaces to its left, if their suit or rank matches.",
      "Cards can match if they wrap around to a previous row, given they are still 1 or 3 spaces apart.",
      "Win by reducing the grid down to one card.",
    ],
  },
  // Aces Up
  "/aces-up": {
    title: "Aces Up",
    thumbnail: "AcesUp.jpg",
    cardBack: "AcesUp.png",
    cardColorBg: "#1d0f0a",
    cardColorText: "#eee0ca",
    cardDescription:
      "Strip each suit down to its Ace by discarding weaker visible cards.",
    stats: {
      complexity: 15,
      difficulty: 80,
      luck: 80,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Discard a top card from a foundation when a higher card of the same suit is visible.",
      "Top cards can be moved to empty foundations when available. Deal when no move is possible.",
      "Win by ending with only the four Aces.",
    ],
  },
  // Golf
  "/golf": {
    title: "Golf Solitaire",
    thumbnail: "Golf.jpg",
    cardBack: "Golf.png",
    cardColorBg: "#163021",
    cardColorText: "#acfdd1",
    cardDescription:
      "Eliminate the tableau by discarding rank-adjacent cards to the current rank card.",
    stats: {
      complexity: 15,
      difficulty: 50,
      luck: 70,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Play only top tableau cards one rank up or down from waste top.",
      "Use stock draws when no tableau play is possible.",
      "Clear all tableau cards to win.",
    ],
  },
  // Clock
  "/clock": {
    title: "Clock Solitaire",
    thumbnail: "Clock.jpg",
    cardBack: "Clock.png",
    cardColorBg: "#1d1610",
    cardColorText: "#eed9c2",
    cardDescription:
      "Flip by all the cards around the clock dial before all the kings are revealed.",
    stats: {
      complexity: 10,
      difficulty: 10,
      luck: 100,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Place revealed cards to matching clock positions by rank.",
      "Continue turns by revealing from the pile at each destination.",
      "Losing occurs if the fourth King appears before completion.",
    ],
  },
  // ============================== //
  // ========== Disabled ========== //
  // ============================== //

  // Freecell
  "/freecell": {
    title: "FreeCell (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#2A3440",
    cardColorText: "#DDEBFF",
    cardDescription:
      "A highly strategic open-information solitaire where careful sequence management wins.",
    stats: {
      complexity: 79,
      difficulty: 73,
      luck: 16,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Move all cards to the foundations from Ace up to King by suit.",
      "Build tableau columns down by alternating colors.",
      "Use free cells and empty columns as temporary storage.",
    ],
  },
  // Spider Solitaire
  "/spider-solitaire": {
    enabled: false,
    title: "Spider Solitaire (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#2E2731",
    cardColorText: "#F5E6FF",
    cardDescription:
      "Build descending tableau runs and complete full suited sequences from king to ace.",
    stats: {
      complexity: 74,
      difficulty: 69,
      luck: 38,
    },
    category: GameCategory.ClassicSolitaire,
    briefRules: [
      "Build cards down by rank in tableau columns.",
      "Complete full King to Ace suit runs to clear them.",
      "Deal new rows when needed, but only when every column has cards.",
    ],
  },
  // Pyramid
  "/pyramid": {
    title: "Pyramid (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#3A3126",
    cardColorText: "#FFEACC",
    cardDescription:
      "Dismantle the pyramid by pairing exposed cards to thirteen with careful stock timing.",
    stats: {
      complexity: 52,
      difficulty: 49,
      luck: 62,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Clear the pyramid by pairing exposed cards that total 13.",
      "Kings are worth 13 and can be removed alone.",
      "Use stock and waste cards to make needed pairs.",
    ],
  },
  // TriPeaks
  "/tripeaks": {
    title: "TriPeaks (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#24313A",
    cardColorText: "#E4F4FF",
    cardDescription:
      "Clear three peaks by making one-rank moves and preserving long scoring runs.",
    stats: {
      complexity: 48,
      difficulty: 44,
      luck: 64,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Remove exposed cards that are one rank higher or lower than waste top.",
      "Aces and Kings wrap in sequence for moves.",
      "Draw from stock when no legal tableau move is available.",
    ],
  },
  // Solitaire
  "/solitaire": {
    enabled: false,
    title: "Solitaire (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#2C2F3A",
    cardColorText: "#EEF0FF",
    cardDescription:
      "Classic Klondike pacing with alternating tableau builds and foundation progression.",
    stats: {
      complexity: 57,
      difficulty: 52,
      luck: 58,
    },
    category: GameCategory.ClassicSolitaire,
    // enabled: false,
    briefRules: [
      "Move all cards to the four foundations by suit from Ace to King.",
      "Build tableau piles in descending rank with alternating colors.",
      "Only Kings can fill an empty tableau column.",
    ],
  },
  // Scorpion
  "/scorpion": {
    title: "Scorpion (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#33262A",
    cardColorText: "#FFE4E8",
    cardDescription:
      "Manipulate long face-up runs to assemble four full same-suit king-to-ace sequences.",
    stats: {
      complexity: 68,
      difficulty: 63,
      luck: 47,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Build same-suit descending runs in tableau columns.",
      "Move face-up sequences as a stack to legal destinations.",
      "Win after completing four full King-to-Ace suit runs.",
    ],
  },
  // Canfield
  "/canfield": {
    title: "Canfield (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#263238",
    cardColorText: "#E4F6FF",
    cardDescription:
      "A constrained reserve-driven solitaire where planning around the base rank is key.",
    stats: {
      complexity: 73,
      difficulty: 68,
      luck: 45,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Build foundations by suit from the starting base rank.",
      "Build tableau down by alternating color with wraparound allowed.",
      "Use reserve and stock strategically to avoid dead ends.",
    ],
  },
  // Penguin
  "/penguin": {
    title: "Penguin (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#243443",
    cardColorText: "#E7F6FF",
    cardDescription:
      "Build by suit from the beak rank while using reserve cards to unlock frozen lines.",
    stats: {
      complexity: 77,
      difficulty: 71,
      luck: 31,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Build foundations by suit upward from the beak rank.",
      "Build tableau down by suit, filling empties with valid continuation cards.",
      "Use the reserve (flipper) cards to unlock key moves.",
    ],
  },
  // Forty Thieves
  "/forty-thieves": {
    title: "Forty Thieves (BETA)",
    thumbnail: DEFAULT_GAME_THUMBNAIL,
    cardColorBg: "#2E2D34",
    cardColorText: "#EFE8FF",
    cardDescription:
      "A strict one-card-move solitaire that rewards patience and precise tableau control.",
    stats: {
      complexity: 66,
      difficulty: 62,
      luck: 52,
    },
    category: GameCategory.ClassicSolitaire,
    enabled: false,
    briefRules: [
      "Build foundations up by suit from Ace.",
      "Build tableau down by suit and move one card at a time.",
      "Only Kings can fill empty tableau piles.",
    ],
  },
};
