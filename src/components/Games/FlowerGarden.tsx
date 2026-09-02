import { FanSolitaire, type FanGameState } from "./FanSolitaire";

export type FlowerGardenGameState = FanGameState;

export default function FlowerGarden() {
  return <FanSolitaire variant="flower-garden" />;
}
