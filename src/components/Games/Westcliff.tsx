import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";

export type WestcliffGameState = StockTableauState;

export default function Westcliff() {
  return <StockTableauSolitaire variant="westcliff" />;
}
