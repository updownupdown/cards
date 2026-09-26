import { StockTableauSolitaire } from "./StockTableauSolitaire";
import { useGameVariant } from "@/hooks/useGameVariant";

export default function RankAndFile() {
  const variant = useGameVariant("/rank-and-file");
  if (!variant) return null;
  return <StockTableauSolitaire key={variant} variant={variant} />;
}
