import {
  WastePilesSolitaire,
  type WastePilesState,
} from "./WastePilesSolitaire";
export type FrogGameState = WastePilesState;
export default function Frog() {
  return <WastePilesSolitaire variant="frog" />;
}
