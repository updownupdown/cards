import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const dungeonBounty: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/dungeon-bounty",
  tip: {
    default: {
      text: "Use weapons/spells vs foes; survive 2 levels; score bounty+gems.",
    },
  },
  title: "Dungeon Bounty",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#2a1a2e",
  cardColorText: "#f3d9a4",
  background: "wall-tile.jpg",
  cardDescription:
    "A dungeon-crawling bounty hunt: equip weapons, cast spells, slay beasts, and grab the loot.",
  stats: {
    complexity: 85,
    difficulty: 75,
    luck: 45,
  },
  // tags: [GameTag.ModernMechanics, GameTag.AIGenerated],
  tags: [GameTag.Beta],
  briefRules: [
    "Two cavern cards appear each turn; defeat any enemies before looting.",
    "Add weapons (clubs) and spells (spades) for an attack that must meet an enemy's health.",
    "Fail and you take damage or lose an item; win and you claim the loot and grow stronger.",
    "Clear two dungeon levels; your score is claimed bounties plus collected gems.",
  ],
  about: [
    "Dungeon Bounty by Theo Peters & Aaron Camponi is a solo dungeon crawler played with one deck.",
    "Only the single-player mode is implemented. Choose a difficulty in Settings; higher tiers start weaker and enemies gain suit powers.",
  ],
  howToPlay: [
    "## Goal",
    "Survive two dungeon levels and claim as much **bounty and gems** as possible.",
    "## The cards",
    "- **Clubs** — weapons you equip (up to two, each ≤ your strength).",
    "- **Spades** — spells; combine them into attacks, then they are discarded.",
    "- **Diamonds** — gems; kept for score and for buying/enchanting.",
    "- **Face cards** — enemies (Jack/Queen/King).",
    "- **Aces** — hidden magic: a value-1 item, or clear a cavern to the deck bottom.",
    "- **Jokers** — merchants who sell discard-pile goods for gems.",
    "## Combat",
    "Add your weapons and spells to form an **attack**. If it meets or beats the enemy's health, it dies — you claim the other cavern card and gain **+1 strength**. Otherwise take **damage** or **surrender an item**.",
    "## Power combos",
    "- **Curse:** a spell equal to a weapon's value adds double the weapon's value plus the spell.",
    "- **Enchant:** a gem equal to a weapon's value permanently doubles it.",
    "- **Volatile Relic:** a weapon, spell and gem of one value combine for a huge attack that ignores enemy powers and hits every foe.",
    "## Difficulty",
    "Beginner starts at 5 strength and ignores enemy suit powers. Intermediate/Advanced/Bloodlust start weaker and honour club/spade/heart/diamond enemy powers.",
  ],
};
