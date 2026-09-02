import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
export type JosephineGameState = StockTableauState;
export default function Josephine() {
  return <StockTableauSolitaire variant="josephine" />;
}
