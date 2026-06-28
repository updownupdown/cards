import React from "react";
import { GameThumbnailName } from "./game-thumbnails";

export enum GameCategory {
  Isaludo = "Isaludo",
  ClassicSolitaire = "ClassicSolitaire",
  Beta = "Beta",
}

export const GameCategoryNames: Record<GameCategory, string> = {
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

const DEFAULT_GAME_THUMBNAIL: GameThumbnailName = "MonteCarlo.jpg";

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
  // ========== Isaludo ========== //
  // ============================== //
  // Area 52
  "/area-52": {
    title: "Area 52",
    thumbnail: "Area52.jpg",
    cardBack: "Area52.png",
    cardColorBg: "#200a16",
    cardColorText: "#ffbcdd",
    cardDescription:
      "A two-wave defense puzzle where each choice of defender can save or sink your final stand.",
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
    cardColorBg: "#18251f",
    cardColorText: "#c6ffd5",
    cardDescription:
      "Build clever three-card sandwiches with evenly spaced ranks to keep your ingredient engine running.",
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
    cardColorBg: "#241a15",
    cardColorText: "#fcd3c2",
    cardDescription:
      "Survive a tight cabin siege by placing cards strategically to unlock zombie eliminations.",
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
    cardColorText: "#d8e2ff",
    cardDescription:
      "Develop a volatile 4x4 city grid where each new card can flip entire districts.",
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
    cardColorBg: "#18102e",
    cardColorText: "#d5abfc",
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
    cardColorBg: "#2b3015",
    cardColorText: "#dff0a4",
    cardDescription:
      "Fulfill layered card orders by sequencing stacks before your available moves dry up.",
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
  },
  // Syndicate
  "/syndicate": {
    title: "Syndicate",
    thumbnail: "Syndicate.jpg",
    cardColorBg: "#112221",
    cardColorText: "#c4f1e7",
    cardDescription:
      "Build and convert rank-restricted stacks, timing key turns to lock in powerful scores.",
    stats: {
      complexity: 60,
      difficulty: 60,
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
    cardColorBg: "#132422",
    cardColorText: "#91f1e9",
    cardDescription:
      "Carefully uncover buried cards without trapping crucial reveals behind dead stacks.",
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
    cardColorBg: "#1a0d0c",
    cardColorText: "#ffdcce",
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
    cardColorBg: "#242b33",
    cardColorText: "#c6d3e9",
    cardDescription:
      "Match adjacent ranks, collapse the grid, and keep clearing until every card is gone.",
    stats: {
      complexity: 10,
      difficulty: 30,
      luck: 50,
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
    cardColorBg: "#110c1d",
    cardColorText: "#e0cfff",
    cardDescription:
      "Build four mathematical foundations with different step patterns from a shared stock.",
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
    cardColorBg: "#1d1118",
    cardColorText: "#ffcff3",
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
    cardColorBg: "#1b150f",
    cardColorText: "#fff2db",
    cardDescription:
      "Strip each suit down to its ace by discarding weaker visible cards at the right time.",
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
    cardColorBg: "#12251a",
    cardColorText: "#beffdb",
    cardDescription:
      "Chain tableau plays up or down in rank and use limited stock draws to finish the course.",
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
    cardColorBg: "#272115",
    cardColorText: "#DABE9B",
    cardDescription:
      "Reveal and place cards by rank around the dial, hoping the final kings arrive late.",
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
    title: "FreeCell",
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
    title: "Spider Solitaire",
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
    enabled: false,
    briefRules: [
      "Build cards down by rank in tableau columns.",
      "Complete full King to Ace suit runs to clear them.",
      "Deal new rows when needed, but only when every column has cards.",
    ],
  },
  // Pyramid
  "/pyramid": {
    title: "Pyramid",
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
    title: "TriPeaks",
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
    title: "Solitaire",
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
    enabled: false,
    briefRules: [
      "Move all cards to the four foundations by suit from Ace to King.",
      "Build tableau piles in descending rank with alternating colors.",
      "Only Kings can fill an empty tableau column.",
    ],
  },
  // Scorpion
  "/scorpion": {
    title: "Scorpion",
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
    title: "Canfield",
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
    title: "Penguin",
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
    title: "Forty Thieves",
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
