import { RowsSolitaire, type RowsState } from "./RowsSolitaire";
export type LabyrinthGameState = RowsState;
export default function Labyrinth() {
  return <RowsSolitaire variant="labyrinth" />;
}
