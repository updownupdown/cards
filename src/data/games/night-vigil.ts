import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const nightVigil: GameDefinition = {
  path: "/night-vigil",
  title: "Night Vigil",
  tags: [GameTag.CardCombat],
  rating: {
    complexity: 72,
    difficulty: 76,
    luck: 42,
  },
  background: GAME_BACKGROUNDS.nightCity,
  animation: GameAnimations.Lightning,
  thumbnail: "NightVigil.webp",
  thumbnailCredit: {
    title: "The Night Watch",
    artistName: "Rembrandt van Rijn",
    date: "1642",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:La_ronda_de_noche,_por_Rembrandt_van_Rijn.jpg",
  },
  gameColorDark: "#11161a",
  gameColorPale: "#e7edf0",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Draw Responses one at a time. Match each Threat within 0-3 points, or spend your round's Smoke Bomb or Grapple Line. Resolve when ready.",
  ],
  howToPlay: [
    "## Objective",
    "Survive all **12 encounters** and defeat the {KD}, the Jester King. You lose when Health reaches 0.",

    "## Setup",
    "- Jacks, Queens, and Kings form the Encounter Deck in rank order. The {KD} is always last.",
    "- The {10S} tracks 10 Armor and the {10H} tracks 10 Health.",
    "- Number cards, Aces, and two Jokers form the Play Deck.",

    "## Each encounter",
    "- Reveal 4 Threats. Each Joker adds one more, up to 6. The final encounter always has 6.",
    "- Draw Responses one at a time, up to the number of Threats. A Joker drawn as a Response becomes a new Threat instead.",
    "- **Standard:** Stack one or more Responses on a Threat. Their total must equal the Threat or exceed it by no more than 3.",
    "- **Smoke:** Once per round, play a Response face down to clear one Threat. It cannot clear a Joker or a Threat matching the Encounter suit.",
    "- **Grapple:** Once per round, connect two adjacent Threats. Responses played sideways must total the two Threats or exceed them by no more than 3. Failure deals 2 damage.",

    "## Double agents and chaos",
    "- An Ace Threat equals the highest Threat value in the round.",
    "- An Ace Response equals the lowest Threat value in the round.",
    "- A Joker Threat equals the highest Threat and cannot be smoked.",

    "## Damage and healing",
    "- Every unresolved Threat deals 1 damage. A failed Grapple deals 2 instead for its pair.",
    "- Street Level adds 1 damage for Kings. Kingpin Case adds 1 for Queens and Kings. City in Shadows adds 1 for Queens and 2 for Kings.",
    "- Heal 1 after an encounter if you did not use Smoke, or if you drew fewer Responses than there were Threats. Healing and damage cancel.",

    "## Score",
    "Your score is remaining Armor + Health, plus 5 for Kingpin Case or 10 for City in Shadows.",
  ],
};
