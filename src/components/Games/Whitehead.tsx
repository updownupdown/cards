import {
  StockTableauSolitaire,
  type StockTableauState,
} from "./StockTableauSolitaire";
export type WhiteheadGameState = StockTableauState;
export default function Whitehead() {
  return <StockTableauSolitaire variant="whitehead" />;
}
