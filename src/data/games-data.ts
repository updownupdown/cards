import React from "react";

export type GameMenuInfo = {
  title: string;
  enabled?: boolean;
  about?: string[];
  briefRules: string[];
  howToPlay?: string[];
  byLine?: string;
};

export const GAMES_DATA: Record<string, GameMenuInfo> = {
  "/the-sandwich-guy": {
    title: "The Sandwich Guy",
    byLine: "Game design by Wil Su",
    about: [
      "Make sandwiches with ingredients available in your food truck. The quality of each sandwich determines how many ingredients will refill your prep area. Sell out your entire inventory to win!",
      "This game is closely adapted from Wil Su's Isaludo collection.",
    ],
    briefRules: [
      "Select three cards with equally-spaced rank values to create a sandwich.",
      "A/J/Q/K are worth 1/11/12/13, and wrapping around A/K is allowed",
      "Use same suits, or same colors, for better hand refills.",
    ],
    howToPlay: [
      "Select three cards with equally-spaced rank values to create a sandwich.",
      "Aces, Jacks, Queens, Kings are worth 1, 11, 12, and 13, respectively.",
      'Card ranks can "wrap around" the Ace and King (e.g. 9, Q, and 2 is a valid selection).',
      "Your hand will be refilled with: 4 cards if the sandwich cards were of the same suit, 3 cards if the sandwich cards were the same color (but a different suit), or 2 cards if the sandwich cards had mixed colors.",
    ],
    // howToPlay: ["Lorem ipsum"],
  },
  // Status: animated and looks good. need thorough testing
  "/monte-carlo": {
    title: "Monte Carlo",
    briefRules: [
      "Flip over any adjacent, equal-rank pairs.",
      "Consolidate the deck to remove flipped cards and refill the grid.",
      "Win by clearing all cards.",
    ],
  },
  // Status:
  "/calculation": {
    title: "Calculation",
    briefRules: [
      "Build four foundations with increasing step intervals of 1, 2, 3, and 4.",
      "Stock pile cards can be moved to any waste piles, or any suitable foundation.",
      "Only the top card of a waste pile can be moved, and only to a suitable foundation.",
      "Win by placing all cards (up to Kings) on foundations.",
    ],
  },
  // Status - needs testing
  "/dead-center": {
    title: "Dead Center",
    byLine: "Game design by Wil Su",
    briefRules: [
      "Kill all 12 zombies surrounding your 3x3 cabin before the deck runs out.",
      "Cards can be placed on a card of equal value; same color and greater value; or opposite color and less value.",
      "Placed cards may kill adjacent zombies depending on the rank and value of the other cards on the same line.",
    ],
  },
  "/accordion": {
    title: "Accordion",
    briefRules: [
      "Move a card onto another card 1 or 3 spaces to its left, if their suit or rank matches.",
      "Cards can match if they wrap around to a previous row, given they are still 1 or 3 spaces apart.",
      "Win by reducing the grid down to one card.",
    ],
  },
  "/aces-up": {
    title: "Aces Up",
    enabled: true,
    briefRules: [
      "Discard a top card from a foundation when a higher card of the same suit is visible.",
      "Top cards can be moved to empty foundations when available. Deal when no move is possible.",
      "Win by ending with only the four Aces.",
    ],
  },
  "/area-52": {
    title: "Area 52",
    byLine: "Game design by Wil Su",
    briefRules: [
      "Survive each wave by placing cards according to the scenario rule.",
      "Use limited actions efficiently before drawing deeper into the deck.",
      "Clear all required wave objectives to win.",
    ],
  },
  "/clock": {
    title: "Clock Solitaire",
    briefRules: [
      "Place revealed cards to matching clock positions by rank.",
      "Continue turns by revealing from the pile at each destination.",
      "Losing occurs if the fourth King appears before completion.",
    ],
  },
  "/freecell": {
    title: "FreeCell",
    enabled: false,
    briefRules: [
      "Move all cards to the foundations from Ace up to King by suit.",
      "Build tableau columns down by alternating colors.",
      "Use free cells and empty columns as temporary storage.",
    ],
  },
  "/spider-solitaire": {
    title: "Spider Solitaire",
    enabled: false,
    briefRules: [
      "Build cards down by rank in tableau columns.",
      "Complete full King to Ace suit runs to clear them.",
      "Deal new rows when needed, but only when every column has cards.",
    ],
  },
  "/pyramid": {
    title: "Pyramid",
    enabled: false,
    briefRules: [
      "Clear the pyramid by pairing exposed cards that total 13.",
      "Kings are worth 13 and can be removed alone.",
      "Use stock and waste cards to make needed pairs.",
    ],
  },
  "/skyway": {
    title: "Skyway",
    byLine: "Game design by Wil Su",
    briefRules: [
      "Play cards onto lanes following each lane's build rule.",
      "Use draws and transfers to keep lanes advancing.",
      "Avoid board lockups that leave no legal lane actions.",
    ],
  },
  "/tripeaks": {
    title: "TriPeaks",
    enabled: false,
    briefRules: [
      "Remove exposed cards that are one rank higher or lower than waste top.",
      "Aces and Kings wrap in sequence for moves.",
      "Draw from stock when no legal tableau move is available.",
    ],
  },
  "/the-first-boba-tea-shop-in-london": {
    title: "The First Boba Tea Shop in London",
    byLine: "Game design by Wil Su",
    enabled: false,
    briefRules: [
      "Play cards into valid stacks to satisfy order constraints.",
      "Plan around blocked stacks so you do not run out of legal moves.",
      "Complete all required stacks to win.",
    ],
  },
  "/foursquare": {
    title: "Foursquare",
    byLine: "Game design by Wil Su",
    enabled: false,
    briefRules: [
      "Manage four zones with distinct placement constraints.",
      "Sequence cards so each zone can continue progressing.",
      "Complete all target zone conditions before deck lockout.",
    ],
  },
  "/solitaire": {
    title: "Solitaire",
    enabled: false,
    briefRules: [
      "Move all cards to the four foundations by suit from Ace to King.",
      "Build tableau piles in descending rank with alternating colors.",
      "Only Kings can fill an empty tableau column.",
    ],
  },
  "/loot-the-loop": {
    title: "Loot the Loop",
    byLine: "Game design by Wil Su",
    briefRules: [
      "Capture valid loop cards into the score pile.",
      "Protect scoring tempo by avoiding loop breaks.",
      "Win by reaching the game score objective before deck exhaustion.",
    ],
  },
  "/syndicate": {
    title: "Syndicate",
    byLine: "Game design by Wil Su",
    enabled: false,
    briefRules: [
      "Build and convert stacks under syndicate rank restrictions.",
      "Use timing windows to secure high-value conversions.",
      "Game ends when objective is met or no legal move remains.",
    ],
  },
  "/hide-and-seek": {
    title: "Hide and Seek",
    byLine: "Game design by Wil Su",
    enabled: false,
    briefRules: [
      "Reveal hidden cards through legal uncover moves.",
      "Avoid locking hidden cards under unusable stacks.",
      "Finish by uncovering and resolving the final hidden sets.",
    ],
  },
  "/the-emissary": {
    title: "The Emissary",
    byLine: "Game design by Wil Su",
    // enabled: false,
    briefRules: [
      "Progress through kingdoms by completing each local objective.",
      "Balance risk and board control between kingdoms.",
      "Win by completing all required kingdoms.",
    ],
  },
  "/golf": {
    title: "Golf Solitaire",
    briefRules: [
      "Play only top tableau cards one rank up or down from waste top.",
      "Use stock draws when no tableau play is possible.",
      "Clear all tableau cards to win.",
    ],
  },
  "/scorpion": {
    title: "Scorpion",
    enabled: false,
    briefRules: [
      "Build same-suit descending runs in tableau columns.",
      "Move face-up sequences as a stack to legal destinations.",
      "Win after completing four full King-to-Ace suit runs.",
    ],
  },
  "/canfield": {
    title: "Canfield",
    enabled: false,
    briefRules: [
      "Build foundations by suit from the starting base rank.",
      "Build tableau down by alternating color with wraparound allowed.",
      "Use reserve and stock strategically to avoid dead ends.",
    ],
  },
  "/penguin": {
    title: "Penguin",
    enabled: false,
    briefRules: [
      "Build foundations by suit upward from the beak rank.",
      "Build tableau down by suit, filling empties with valid continuation cards.",
      "Use the reserve (flipper) cards to unlock key moves.",
    ],
  },
  "/forty-thieves": {
    title: "Forty Thieves",
    enabled: false,
    briefRules: [
      "Build foundations up by suit from Ace.",
      "Build tableau down by suit and move one card at a time.",
      "Only Kings can fill empty tableau piles.",
    ],
  },
};
