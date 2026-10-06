// The Campaign map as it stood until October 2026 (campaign progress versions 1
// to 3), before it was laid out afresh. Only its links are kept, each listed
// once under the path that sorts first: a save from those versions is opened
// against them to work out which games its wins had unlocked, so none of them
// lock again on the new map. See migrateUnlockedPaths in campaign-progress.ts.
//
// Never edit this: it is a record of a map that players played on.
const LINKS: Record<string, string[]> = {
  "/klondike": ["/memory", "/pocket-poker", "/sultan"],
  "/fifteen-puzzle": ["/klondike", "/memory"],
  "/grandfathers-clock": ["/jailbreak", "/memory", "/three-peaks"],
  "/eight-off": [
    "/fifteen-puzzle",
    "/queens-audience",
    "/ten-twenty-thirty",
    "/thumb-and-pouch",
  ],
  "/bowling": ["/grandfathers-clock", "/memory", "/pagoda", "/queens-audience"],
  "/sultan": ["/three-peaks"],
  "/beehive": ["/freecell", "/frog", "/klondike", "/tower-of-hanoi"],
  "/pocket-poker": ["/sultan"],
  "/bakers-dozen": [
    "/beehive",
    "/fifteen-puzzle",
    "/thumb-and-pouch",
    "/tower-of-hanoi",
  ],
  "/queens-audience": ["/whitehead"],
  "/freecell": ["/frog", "/pocket-poker"],
  "/jailbreak": ["/seahaven-towers"],
  "/apothecary": ["/canfield", "/jailbreak", "/pagoda"],
  "/seahaven-towers": ["/three-peaks"],
  "/lights-out": ["/royal-rest", "/seahaven-towers", "/three-peaks"],
  "/ten-twenty-thirty": ["/thumb-and-pouch", "/windmill"],
  "/pagoda": ["/parallels"],
  "/ouroboros": ["/penguin", "/pocket-poker", "/sultan"],
  "/whitehead": ["/windmill"],
  "/parallels": ["/queens-audience"],
  "/delta-21": ["/ten-twenty-thirty", "/thumb-and-pouch"],
  "/canfield": ["/glazier", "/pagoda", "/simple-simon"],
  "/frog": ["/tower-of-hanoi"],
  "/gargantua": [
    "/rank-and-file",
    "/red-diamond",
    "/royal-cotillion",
    "/tower-of-hanoi",
  ],
  "/penguin": ["/pocket-poker", "/sly-fox"],
  "/royal-rest": ["/seahaven-towers"],
  "/cruel": ["/freecell", "/frog", "/indian"],
  "/baroness": ["/delta-21", "/royal-cotillion"],
  "/fortunes-call": ["/lights-out", "/ouroboros", "/pyramid", "/royal-rest"],
  "/golf": ["/indian", "/penguin"],
  "/diplomat": ["/jailbreak", "/royal-rest", "/westcliff"],
  "/city-grid": ["/parallels", "/whitehead"],
  "/black-hole": ["/city-grid", "/flower-garden", "/whitehead", "/windmill"],
  "/simple-simon": ["/westcliff"],
  "/gaps": ["/golf", "/sir-tommy"],
  "/rank-and-file": ["/red-diamond", "/royal-cotillion", "/twelve-trials"],
  "/red-diamond": ["/seer", "/twelve-trials"],
  "/glazier": ["/monte-carlo", "/simple-simon"],
  "/sir-tommy": ["/sly-fox"],
  "/elementary-detective": ["/flower-garden", "/windmill"],
  "/chapter-and-verse": ["/city-grid", "/nestor", "/parallels"],
  "/crescent": ["/elementary-detective", "/yukon"],
  "/carpet": [
    "/chapter-and-verse",
    "/congress",
    "/monte-carlo",
    "/shifting-sands",
  ],
  "/beleaguered-castle": [
    "/easthaven",
    "/labyrinth",
    "/pyramid",
    "/triple-stack",
  ],
  "/field-command": ["/glazier", "/simple-simon", "/westcliff"],
  "/crazy-quilt": ["/cribbage-squares", "/crossword", "/seer"],
  "/bisley": ["/seer", "/twelve-trials"],
  "/cribbage-squares": ["/waypoint"],
  "/labyrinth": ["/sly-fox", "/triple-stack"],
  "/pyramid": ["/spiderette"],
  "/congress": ["/monte-carlo", "/night-vigil", "/shifting-sands"],
  "/blackberry-pie": ["/cabin-siege", "/yukon"],
  "/cafe-queue": ["/cribbage-squares", "/maria", "/waypoint"],
  "/easthaven": ["/triple-stack"],
  "/cabin-siege": ["/gremlin"],
  "/dominion": ["/easthaven", "/pyramid", "/spiderette"],
  "/nestor": ["/shifting-sands"],
  "/australian-patience": [
    "/ebb-and-flow",
    "/royal-envoy",
    "/sir-tommy",
    "/terrace",
  ],
  "/calculation": ["/gremlin", "/invaders"],
  "/fortress": ["/nestor", "/pickpocket", "/rogue-run"],
  "/king-albert": ["/la-belle-lucie", "/maria", "/picket-fence"],
  "/invaders": ["/lone-joker"],
  "/infiltrator": ["/invaders", "/lone-joker", "/twelve-trials"],
  "/la-belle-lucie": ["/picket-fence", "/scorpion"],
  "/clock": ["/iris-garden", "/scorpion"],
  "/aces-up": ["/fortress", "/forty-thieves", "/nestor", "/pickpocket"],
  "/rogue-run": ["/stalker"],
  "/dynasty": ["/spiderette", "/stalactites"],
  "/poker-squares": ["/stalker"],
  "/fight-clubs": ["/infiltrator", "/spider-solitaire"],
  "/pickpocket": ["/rogue-run"],
  "/chain-of-command": ["/dynasty", "/somnus", "/stalactites"],
  "/herbalist": ["/miss-milligan", "/somnus"],
  "/charlatan": ["/forty-thieves", "/shifting-sands"],
  "/picket-fence": ["/scorpion"],
  "/accordion": ["/clock", "/ebb-and-flow", "/iris-garden"],
  "/devils-grip": ["/pickpocket", "/poker-squares"],
  "/ebb-and-flow": ["/royal-envoy"],
  "/bristol": [
    "/devils-grip",
    "/elementary-detective",
    "/flower-garden",
    "/ozanams-square",
    "/poker-squares",
    "/royal-marriage",
  ],
  "/crownslayer": ["/herbalist", "/miss-milligan"],
  "/ascent": ["/lycan", "/spider-solitaire"],
  "/royal-envoy": ["/terrace"],
  "/four-seasons": ["/lycan", "/twelve-trials"],
  "/miss-milligan": ["/night-vigil"],
  "/augury": ["/city-grid", "/devils-grip", "/poker-squares"],
  "/crossword": ["/waypoint"],
  "/ozanams-square": ["/poker-squares"],
  "/elevens": ["/four-seasons", "/lycan"],
};

const NEIGHBOURS = new Map<string, string[]>();
for (const [from, links] of Object.entries(LINKS)) {
  for (const to of links) {
    NEIGHBOURS.set(from, [...(NEIGHBOURS.get(from) ?? []), to]);
    NEIGHBOURS.set(to, [...(NEIGHBOURS.get(to) ?? []), from]);
  }
}

/** The games a win on `path` unlocked on the old map, by their old paths. */
export function getV3Neighbours(path: string): readonly string[] {
  return NEIGHBOURS.get(path) ?? [];
}
