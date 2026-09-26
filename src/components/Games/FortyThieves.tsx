import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameVariant } from "@/hooks/useGameVariant";

export type FortyThievesGameState = StockTableauState;

export default function FortyThieves() {
  const variant = useGameVariant("/forty-thieves");
  const difficulty = useGameSettingValue("difficulty");
  if (!variant) return null;
  return (
    <StockTableauSolitaire
      key={variant}
      variant={variant}
      redeals={difficulty === "easy" ? Infinity : 0}
    />
  );
}
