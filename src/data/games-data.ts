export type GameMenuInfo = {
  title: string;
  howToPlay: string[];
  rules?: string[];
};

export const GAMES_DATA: Record<string, GameMenuInfo> = {
  "/aces-up": {
    title: "Aces Up",
    howToPlay: [
      "Discard a top card when a higher card of the same suit is showing.",
      "Move a top card into an empty pile to create new options.",
      "Win by ending with only the four Aces.",
    ],
    rules: [
      "These are the full rules!",
      "Discard a top card when a higher card of the same suit is showing.",
      "Move a top card into an empty pile to create new options.",
      "Win by ending with only the four Aces.",
    ],
  },
  "/solitaire": {
    title: "Solitaire",
    howToPlay: [
      "Move all cards to the four foundations by suit from Ace to King.",
      "Build tableau piles in descending rank with alternating colors.",
      "Only Kings can fill an empty tableau column.",
    ],
  },
  "/freecell": {
    title: "FreeCell",
    howToPlay: [
      "Move all cards to the foundations from Ace up to King by suit.",
      "Build tableau columns down by alternating colors.",
      "Use free cells and empty columns as temporary storage.",
    ],
  },
  "/spider-solitaire": {
    title: "Spider Solitaire",
    howToPlay: [
      "Build cards down by rank in tableau columns.",
      "Complete full King to Ace suit runs to clear them.",
      "Deal new rows when needed, but only when every column has cards.",
    ],
  },
  "/pyramid": {
    title: "Pyramid",
    howToPlay: [
      "Clear the pyramid by pairing exposed cards that total 13.",
      "Kings are worth 13 and can be removed alone.",
      "Use stock and waste cards to make needed pairs.",
    ],
  },
  "/tripeaks": {
    title: "TriPeaks",
    howToPlay: [
      "Remove exposed cards that are one rank higher or lower than waste top.",
      "Aces and Kings wrap in sequence for moves.",
      "Draw from stock when no legal tableau move is available.",
    ],
  },
  "/skyway": {
    title: "Skyway",
    howToPlay: [
      "Play cards onto lanes following each lane's build rule.",
      "Use draws and transfers to keep lanes advancing.",
      "Avoid board lockups that leave no legal lane actions.",
    ],
  },
  "/the-sandwich-guy": {
    title: "The Sandwich Guy",
    howToPlay: [
      "Chain legal matches to keep the run alive.",
      "Use buffer spaces carefully to prevent dead ends.",
      "A round ends when no legal chain can continue.",
    ],
  },
  "/area-52": {
    title: "Area 52",
    howToPlay: [
      "Survive each wave by placing cards according to the scenario rule.",
      "Use limited actions efficiently before drawing deeper into the deck.",
      "Clear all required wave objectives to win.",
    ],
  },
  "/dead-center": {
    title: "Dead Center",
    howToPlay: [
      "Resolve threats in center lanes before they overwhelm the board.",
      "Use tactical placements to keep the draw sequence alive.",
      "Win by clearing the final objective state.",
    ],
  },
  "/the-first-boba-tea-shop-in-london": {
    title: "The First Boba Tea Shop in London",
    howToPlay: [
      "Play cards into valid stacks to satisfy order constraints.",
      "Plan around blocked stacks so you do not run out of legal moves.",
      "Complete all required stacks to win.",
    ],
  },
  "/foursquare": {
    title: "Foursquare",
    howToPlay: [
      "Manage four zones with distinct placement constraints.",
      "Sequence cards so each zone can continue progressing.",
      "Complete all target zone conditions before deck lockout.",
    ],
  },
  "/loot-the-loop": {
    title: "Loot the Loop",
    howToPlay: [
      "Capture valid loop cards into the score pile.",
      "Protect scoring tempo by avoiding loop breaks.",
      "Win by reaching the game score objective before deck exhaustion.",
    ],
  },
  "/syndicate": {
    title: "Syndicate",
    howToPlay: [
      "Build and convert stacks under syndicate rank restrictions.",
      "Use timing windows to secure high-value conversions.",
      "Game ends when objective is met or no legal move remains.",
    ],
  },
  "/hide-and-seek": {
    title: "Hide and Seek",
    howToPlay: [
      "Reveal hidden cards through legal uncover moves.",
      "Avoid locking hidden cards under unusable stacks.",
      "Finish by uncovering and resolving the final hidden sets.",
    ],
  },
  "/the-emissary": {
    title: "The Emissary",
    howToPlay: [
      "Progress through kingdoms by completing each local objective.",
      "Balance risk and board control between kingdoms.",
      "Win by completing all required kingdoms.",
    ],
  },
  "/golf": {
    title: "Golf Solitaire",
    howToPlay: [
      "Play only top tableau cards one rank up or down from waste top.",
      "Use stock draws when no tableau play is possible.",
      "Clear all tableau cards to win.",
    ],
  },
  "/clock": {
    title: "Clock Solitaire",
    howToPlay: [
      "Place revealed cards to matching clock positions by rank.",
      "Continue turns by revealing from the pile at each destination.",
      "Losing occurs if the fourth King appears before completion.",
    ],
  },
  "/monte-carlo": {
    title: "Monte Carlo",
    howToPlay: [
      "Remove adjacent equal-rank pairs.",
      "Consolidate cards only when no removable pair exists.",
      "Win by clearing all cards.",
    ],
  },
  "/accordion": {
    title: "Accordion",
    howToPlay: [
      "Move a card onto one 1-left or 3-left if suit or rank matches.",
      "Each move compresses the row and changes future options.",
      "Win by reducing to one card.",
    ],
  },
  "/calculation": {
    title: "Calculation",
    howToPlay: [
      "Build four foundations with step intervals 1, 2, 3, and 4.",
      "Draw from stock to waste and play waste onto legal foundation.",
      "Win by placing all cards on foundations.",
    ],
  },
  "/scorpion": {
    title: "Scorpion",
    howToPlay: [
      "Build same-suit descending runs in tableau columns.",
      "Move face-up sequences as a stack to legal destinations.",
      "Win after completing four full King-to-Ace suit runs.",
    ],
  },
  "/canfield": {
    title: "Canfield",
    howToPlay: [
      "Build foundations by suit from the starting base rank.",
      "Build tableau down by alternating color with wraparound allowed.",
      "Use reserve and stock strategically to avoid dead ends.",
    ],
  },
  "/penguin": {
    title: "Penguin",
    howToPlay: [
      "Build foundations by suit upward from the beak rank.",
      "Build tableau down by suit, filling empties with valid continuation cards.",
      "Use the reserve (flipper) cards to unlock key moves.",
    ],
  },
  "/forty-thieves": {
    title: "Forty Thieves",
    howToPlay: [
      "Build foundations up by suit from Ace.",
      "Build tableau down by suit and move one card at a time.",
      "Only Kings can fill empty tableau piles.",
    ],
  },
};
