import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const glazier: GameDefinition = {
  path: "/glazier",
  title: "Glazier",
  tags: [GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: {
    complexity: 55,
    difficulty: 50,
    luck: 30,
  },
  thumbnail: "Glazier.webp",
  background: GAME_BACKGROUNDS.geometricCeiling,
  animation: GameAnimations.Embers,
  gameColorDark: "#1c2033",
  gameColorPale: "#f1d7a2",
  cardBack: CardBackColors.Indigo,
  cardDescription:
    "Draft coloured glass from the kilns and set a stained-glass window where no colour repeats in any row or column.",
  quickStart: [
    "Take all panes of one suit from a kiln; the rest move to the workbench.",
    "Frames hold 1 to 4 panes of one suit. Extra panes shatter and cost points.",
    "Full frames set a pane in the window; no suit twice in a row or column.",
  ],
  howToPlay: [
    "## Objective",
    "Score **40 points** or more in four rounds by filling a 4x4 stained-glass window.",

    "## Drafting",
    "- Each round, three kilns get four panes each and the workbench gets one.",
    "- Take **all** panes of one suit from a kiln or the workbench. A kiln's other panes move to the workbench.",
    "- The round ends when the kilns and workbench are empty.",

    "## Frames",
    "- The frames hold 1, 2, 3 and 4 panes of a single suit, one frame per window row.",
    "- A frame can't take a suit that no longer fits in its window row.",
    "- Panes that don't fit shatter. You can also shatter a group on purpose.",

    "## Window",
    "- At the end of the round, each full frame sets one pane in its row, and you choose the column.",
    "- **No suit may repeat in any row or column.**",
    "- Panes that can no longer be set shatter.",

    "## Scoring",
    "- A pane scores the length of the line it joins across plus the line it joins down, or 1 if it joins none.",
    "- Each round, shards cost 1, 1, 2, 2, 2, 3 and 3 points; any more are free.",
    "- At the end, each full row scores **3** and each full column scores **6**.",

    "## Ratings",
    "- 40+: Journeyman",
    "- 55+: Master Glazier",
    "- 70+: Cathedral Window",

    "## Tips",
    "- What you leave in a kiln piles up on the workbench.",
    "- Before setting a pane, check which columns stay open for the suits its row still needs.",
  ],
};
