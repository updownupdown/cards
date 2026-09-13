// Only the animation names live here: ~70 game data files import them at
// startup. The BackgroundAnimation component (which imports every scene) is
// imported from its own file by the game screen, so scenes load only there.
export { GameAnimations, type GameAnimation } from "./types";
