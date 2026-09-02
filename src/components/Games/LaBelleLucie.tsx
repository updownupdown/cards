import { FanSolitaire, type FanGameState } from "./FanSolitaire";

export type LaBelleLucieGameState = FanGameState;

export default function LaBelleLucie() {
  return <FanSolitaire variant="la-belle-lucie" />;
}
