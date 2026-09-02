import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
export type CongressGameState = StockTableauState;
export default function Congress() {
  return <StockTableauSolitaire variant="congress" />;
}
