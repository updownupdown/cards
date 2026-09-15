import { RowsSolitaire, type RowsState } from "./RowsSolitaire";
export type ParallelsGameState = RowsState;
export default function Parallels() {
  return <RowsSolitaire variant="parallels" />;
}
