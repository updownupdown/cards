import { roundToPixel } from "@/utils/utils";
import { floatingBarDims } from "./menuStyles";
import { HomePadding } from "./styles";

export function getGameHeaderBottom(insetsTop: number, scale: number): number {
  return roundToPixel(
    insetsTop + (floatingBarDims.height + HomePadding) * scale,
  );
}
