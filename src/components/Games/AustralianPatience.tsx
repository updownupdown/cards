import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
export type AustralianPatienceGameState = StockTableauState;
export default function AustralianPatience() {
  return <StockTableauSolitaire variant="australian-patience" />;
}
