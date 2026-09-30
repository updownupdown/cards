import type { WildGameId } from "@/data/wild-cards";
import type { ComponentType } from "react";
import { Architect } from "./Architect";
import { CastleDemolition } from "./CastleDemolition";
import { CuttingDeck } from "./CuttingDeck";
import { HatTrick } from "./HatTrick";
import { RoyalFlush } from "./RoyalFlush";
import { Shuffleboard } from "./Shuffleboard";
import type { WildGameProps } from "./types";

export const WILD_GAME_COMPONENTS: Record<
  WildGameId,
  ComponentType<WildGameProps>
> = {
  "castle-demolition": CastleDemolition,
  "hat-trick": HatTrick,
  "cutting-deck": CuttingDeck,
  "royal-flush": RoyalFlush,
  shuffleboard: Shuffleboard,
  architect: Architect,
};
