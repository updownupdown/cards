import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
import { useGameVariant } from "@/hooks/useGameVariant";

export type MissMilliganGameState = StockTableauState;

export default function MissMilligan() {
  const variant = useGameVariant("/miss-milligan");
  if (!variant) return null;
  return <StockTableauSolitaire key={variant} variant={variant} />;
}
