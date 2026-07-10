import { GameDefinition, GameMenuInfo } from "../games-data";
import { scoundrel } from "./scoundrel";
import { theBogey } from "./the-bogey";
import { regicide } from "./regicide";
import { cardCapture } from "./card-capture";
import { bowlingSolitaire } from "./bowling-solitaire";
import { area52 } from "./area-52";
import { theSandwichGuy } from "./the-sandwich-guy";
import { deadCenter } from "./dead-center";
import { foursquare } from "./foursquare";
import { skyway } from "./skyway";
import { theEmissary } from "./the-emissary";
import { theBobaTeaShop } from "./the-boba-tea-shop";
import { syndicate } from "./syndicate";
import { hideAndSeek } from "./hide-and-seek";
import { lootTheLoop } from "./loot-the-loop";
import { monteCarlo } from "./monte-carlo";
import { calculation } from "./calculation";
import { accordion } from "./accordion";
import { acesUp } from "./aces-up";
import { golf } from "./golf";
import { clock } from "./clock";
import { freecell } from "./freecell";
import { spiderSolitaire } from "./spider-solitaire";
import { pyramid } from "./pyramid";
import { tripeaks } from "./tripeaks";
import { solitaire } from "./solitaire";
import { scorpion } from "./scorpion";
import { canfield } from "./canfield";
import { penguin } from "./penguin";
import { fortyThieves } from "./forty-thieves";

// Order here determines display order across the app.
export const GAME_DEFINITIONS: GameDefinition[] = [
  scoundrel,
  theBogey,
  regicide,
  cardCapture,
  bowlingSolitaire,
  area52,
  theSandwichGuy,
  deadCenter,
  foursquare,
  skyway,
  theEmissary,
  theBobaTeaShop,
  syndicate,
  hideAndSeek,
  lootTheLoop,
  monteCarlo,
  calculation,
  accordion,
  acesUp,
  golf,
  clock,
  freecell,
  spiderSolitaire,
  pyramid,
  tripeaks,
  solitaire,
  scorpion,
  canfield,
  penguin,
  fortyThieves,
];

export const GAMES_DATA: Record<string, GameMenuInfo> = Object.fromEntries(
  GAME_DEFINITIONS.map((game) => [game.path, game]),
);
