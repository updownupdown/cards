import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import {
  SingleCardSolitaire,
  type SingleCardState,
} from "./SingleCardSolitaire";

export type LittleWindmillGameState = SingleCardState;

export default function LittleWindmill() {
  const difficulty = useGameSettingValue("littleWindmillDifficulty");
  return (
    <SingleCardSolitaire
      variant="little-windmill"
      redeals={difficulty === "easy" ? 1 : 0}
    />
  );
}
