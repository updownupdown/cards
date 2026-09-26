import { FanSolitaire, type FanGameState } from "./FanSolitaire";
import { useGameVariant } from "@/hooks/useGameVariant";

export type LaBelleLucieGameState = FanGameState;

export default function LaBelleLucie() {
  const variant = useGameVariant("/la-belle-lucie");
  if (!variant) return null;
  return <FanSolitaire key={variant} variant={variant} />;
}
