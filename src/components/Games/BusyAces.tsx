import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
export type BusyAcesGameState = StockTableauState;
export default function BusyAces() {
  return <StockTableauSolitaire variant="busy-aces" />;
}
