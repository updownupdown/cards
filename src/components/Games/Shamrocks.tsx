import { FanSolitaire, type FanGameState } from "./FanSolitaire";

export type ShamrocksGameState = FanGameState;

export default function Shamrocks() {
  return <FanSolitaire variant="shamrocks" />;
}
