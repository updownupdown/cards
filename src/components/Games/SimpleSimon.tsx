import {
  SingleDeckSpider,
  type SingleDeckSpiderState,
} from "./SingleDeckSpider";
export type SimpleSimonGameState = SingleDeckSpiderState;
export default function SimpleSimon() {
  return <SingleDeckSpider variant="simple-simon" />;
}
