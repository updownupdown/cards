import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
export type EasthavenGameState = StockTableauState;
export default function Easthaven() {
  return <StockTableauSolitaire variant="easthaven" />;
}
