import {
  WastePilesSolitaire,
  type WastePilesState,
} from "./WastePilesSolitaire";
export type PussInTheCornerGameState = WastePilesState;
export default function PussInTheCorner() {
  return <WastePilesSolitaire variant="puss-in-the-corner" />;
}
