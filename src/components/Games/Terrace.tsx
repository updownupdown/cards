import {
  SingleCardSolitaire,
  type SingleCardState,
} from "./SingleCardSolitaire";
import { useGameVariant } from "@/hooks/useGameVariant";

export type TerraceGameState = SingleCardState;

export default function Terrace() {
  const variant = useGameVariant("/terrace");
  if (!variant) return null;
  return <SingleCardSolitaire key={variant} variant={variant} />;
}
