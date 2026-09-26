import {
  WastePilesSolitaire,
  type WastePilesState,
} from "./WastePilesSolitaire";
import { useGameVariant } from "@/hooks/useGameVariant";

export type SirTommyGameState = WastePilesState;

export default function SirTommy() {
  const variant = useGameVariant("/sir-tommy");
  if (!variant) return null;
  return <WastePilesSolitaire key={variant} variant={variant} />;
}
