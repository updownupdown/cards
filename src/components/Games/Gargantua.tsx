import { StockTableauSolitaire } from "./StockTableauSolitaire";
import { useGameVariant } from "@/hooks/useGameVariant";

export default function Gargantua() {
  const variant = useGameVariant("/gargantua");
  if (!variant) return null;
  return <StockTableauSolitaire key={variant} variant={variant} />;
}
