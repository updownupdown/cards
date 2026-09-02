import {
  SingleDeckSpider,
  type SingleDeckSpiderState,
} from "./SingleDeckSpider";
export type SpideretteGameState = SingleDeckSpiderState;
export default function Spiderette() {
  return <SingleDeckSpider variant="spiderette" />;
}
