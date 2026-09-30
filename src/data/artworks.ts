/**
 * What the Gallery sorts the game art by: roughly when each work was made,
 * its style, where it was made, and its medium. Years are approximate where
 * the credit gives a span or none (the middle of the span, or a best guess
 * from the artist), which is plenty for sorting into eras.
 */

export const ART_STYLES = [
  "sacred",
  "renaissance",
  "baroque",
  "rococo",
  "east-asian",
  "romanticism",
  "realism",
  "impressionism",
  "modern",
  "satire",
  "illustration",
  "architecture",
  "decorative",
] as const;
export type ArtStyle = (typeof ART_STYLES)[number];

export const ART_REGIONS = [
  "europe",
  "americas",
  "east-asia",
  "south-asia",
  "africa-middle-east",
  "oceania",
] as const;
export type ArtRegion = (typeof ART_REGIONS)[number];

export const ART_MEDIA = [
  "painting",
  "drawing",
  "print",
  "manuscript",
  "object",
  "photograph",
] as const;
export type ArtMedium = (typeof ART_MEDIA)[number];

/** Eras by the year a work was made: each runs up to the next one's start. */
export const ART_ERAS = [
  { id: "ancient", from: -Infinity },
  { id: "renaissance", from: 1400 },
  { id: "c17", from: 1600 },
  { id: "c18", from: 1700 },
  { id: "early-c19", from: 1800 },
  { id: "late-c19", from: 1850 },
  { id: "c20", from: 1900 },
] as const;
export type ArtEra = (typeof ART_ERAS)[number]["id"];

export type ArtworkInfo = {
  year: number;
  style: ArtStyle;
  region: ArtRegion;
  medium: ArtMedium;
};

type Row = [
  year: number,
  style: ArtStyle,
  region: ArtRegion,
  medium: ArtMedium,
];

const ARTWORK_ROWS: Record<string, Row> = {
  "/accordion": [1924, "modern", "europe", "painting"],
  "/aces-up": [1800, "decorative", "europe", "object"],
  "/apothecary": [1800, "satire", "europe", "print"],
  "/ascent": [1885, "romanticism", "americas", "painting"],
  "/augury": [1880, "realism", "europe", "painting"],
  "/australian-patience": [1889, "impressionism", "oceania", "painting"],
  "/bakers-dozen": [1681, "baroque", "europe", "painting"],
  "/baroness": [1838, "romanticism", "europe", "painting"],
  "/beehive": [-1450, "sacred", "africa-middle-east", "painting"],
  "/beleaguered-castle": [1617, "baroque", "europe", "print"],
  "/bisley": [1860, "architecture", "europe", "drawing"],
  "/black-hole": [1502, "renaissance", "europe", "painting"],
  "/blackberry-pie": [1874, "realism", "americas", "print"],
  "/bowling": [1650, "baroque", "europe", "painting"],
  "/bristol": [1821, "romanticism", "europe", "print"],
  "/cabin-siege": [1895, "realism", "americas", "print"],
  "/cafe-queue": [1888, "impressionism", "europe", "painting"],
  "/calculation": [1497, "renaissance", "europe", "painting"],
  "/canfield": [1595, "baroque", "europe", "painting"],
  "/carpet": [1612, "decorative", "africa-middle-east", "object"],
  "/chain-of-command": [1877, "realism", "europe", "painting"],
  "/chapter-and-verse": [1850, "romanticism", "europe", "painting"],
  "/charlatan": [1821, "satire", "europe", "print"],
  "/city-grid": [1817, "architecture", "americas", "print"],
  "/clock": [1785, "rococo", "europe", "print"],
  "/congress": [1878, "sacred", "east-asia", "painting"],
  "/crazy-quilt": [1886, "decorative", "americas", "object"],
  "/crescent": [1832, "romanticism", "europe", "drawing"],
  "/cribbage-squares": [1814, "satire", "europe", "print"],
  "/crossword": [1919, "modern", "europe", "painting"],
  "/crownslayer": [1705, "sacred", "south-asia", "painting"],
  "/cruel": [1562, "renaissance", "europe", "painting"],
  "/delta-21": [1833, "east-asian", "east-asia", "print"],
  "/devils-grip": [1750, "sacred", "south-asia", "painting"],
  "/diplomat": [1533, "renaissance", "europe", "painting"],
  "/dominion": [1682, "east-asian", "east-asia", "print"],
  "/dynasty": [1750, "east-asian", "east-asia", "painting"],
  "/easthaven": [1927, "modern", "europe", "print"],
  "/ebb-and-flow": [1869, "impressionism", "europe", "drawing"],
  "/eight-off": [1923, "modern", "europe", "painting"],
  "/elementary-detective": [1904, "illustration", "europe", "drawing"],
  "/field-command": [1825, "romanticism", "europe", "print"],
  "/fifteen-puzzle": [1730, "east-asian", "east-asia", "print"],
  "/fight-clubs": [1909, "realism", "americas", "painting"],
  "/flower-garden": [1899, "realism", "americas", "drawing"],
  "/fortress": [1645, "baroque", "europe", "painting"],
  "/fortunes-call": [1635, "baroque", "europe", "painting"],
  "/forty-thieves": [1805, "illustration", "europe", "print"],
  "/four-seasons": [1896, "modern", "europe", "print"],
  "/freecell": [1844, "romanticism", "europe", "painting"],
  "/frog": [1833, "east-asian", "east-asia", "print"],
  "/gaps": [1824, "east-asian", "east-asia", "print"],
  "/gargantua": [1852, "romanticism", "americas", "painting"],
  "/glazier": [1630, "decorative", "europe", "object"],
  "/golf": [1654, "baroque", "europe", "print"],
  "/grandfathers-clock": [1706, "decorative", "europe", "print"],
  "/gremlin": [1861, "romanticism", "europe", "painting"],
  "/herbalist": [1224, "sacred", "africa-middle-east", "manuscript"],
  "/indian": [1700, "architecture", "europe", "drawing"],
  "/infiltrator": [1776, "romanticism", "europe", "drawing"],
  "/invaders": [1906, "impressionism", "europe", "painting"],
  "/iris-garden": [1857, "east-asian", "east-asia", "print"],
  "/jailbreak": [1699, "baroque", "europe", "print"],
  "/king-albert": [1916, "modern", "europe", "photograph"],
  "/klondike": [1925, "realism", "americas", "painting"],
  "/la-belle-lucie": [1746, "rococo", "europe", "painting"],
  "/labyrinth": [1558, "architecture", "europe", "print"],
  "/lights-out": [1783, "romanticism", "europe", "print"],
  "/lone-joker": [1560, "sacred", "south-asia", "manuscript"],
  "/lycan": [1890, "realism", "europe", "painting"],
  "/maria": [1671, "baroque", "europe", "print"],
  "/memory": [1863, "realism", "europe", "painting"],
  "/miss-milligan": [1883, "realism", "americas", "painting"],
  "/monte-carlo": [1905, "impressionism", "europe", "painting"],
  "/nestor": [1515, "renaissance", "europe", "object"],
  "/night-vigil": [1642, "baroque", "europe", "painting"],
  "/ouroboros": [1478, "sacred", "europe", "manuscript"],
  "/ozanams-square": [1477, "decorative", "europe", "object"],
  "/pagoda": [1495, "east-asian", "east-asia", "painting"],
  "/parallels": [1857, "east-asian", "east-asia", "print"],
  "/penguin": [1873, "illustration", "europe", "print"],
  "/picket-fence": [1875, "realism", "europe", "painting"],
  "/pickpocket": [1818, "satire", "europe", "print"],
  "/pocket-poker": [1896, "modern", "europe", "print"],
  "/poker-squares": [1891, "impressionism", "europe", "painting"],
  "/pyramid": [1847, "romanticism", "europe", "print"],
  "/queens-audience": [1840, "illustration", "europe", "print"],
  "/rank-and-file": [1596, "renaissance", "europe", "print"],
  "/red-diamond": [1890, "decorative", "americas", "object"],
  "/rogue-run": [1750, "architecture", "europe", "print"],
  "/royal-cotillion": [1660, "baroque", "europe", "painting"],
  "/royal-envoy": [1870, "realism", "europe", "painting"],
  "/royal-rest": [1838, "architecture", "europe", "print"],
  "/scorpion": [1897, "modern", "europe", "print"],
  "/seahaven-towers": [1932, "modern", "europe", "painting"],
  "/seer": [1827, "romanticism", "europe", "painting"],
  "/shifting-sands": [1899, "realism", "americas", "print"],
  "/simple-simon": [1920, "illustration", "americas", "print"],
  "/sir-tommy": [1527, "renaissance", "europe", "painting"],
  "/sly-fox": [1933, "illustration", "americas", "painting"],
  "/somnus": [1781, "romanticism", "europe", "painting"],
  "/spider-solitaire": [1890, "illustration", "europe", "drawing"],
  "/spiderette": [1637, "illustration", "europe", "drawing"],
  "/stalactites": [1903, "modern", "europe", "painting"],
  "/stalker": [1890, "realism", "europe", "painting"],
  "/sultan": [1480, "renaissance", "europe", "painting"],
  "/ten-twenty-thirty": [1828, "east-asian", "east-asia", "print"],
  "/terrace": [1920, "modern", "europe", "painting"],
  "/three-peaks": [1863, "romanticism", "americas", "painting"],
  "/thumb-and-pouch": [1942, "decorative", "americas", "drawing"],
  "/tower-of-hanoi": [1563, "renaissance", "europe", "painting"],
  "/triple-stack": [1908, "realism", "europe", "painting"],
  "/twelve-trials": [1528, "renaissance", "europe", "print"],
  "/waypoint": [1856, "realism", "europe", "painting"],
  "/westcliff": [1923, "impressionism", "americas", "painting"],
  "/whitehead": [1832, "illustration", "americas", "print"],
  "/windmill": [1880, "realism", "europe", "painting"],
  "/yukon": [1910, "realism", "americas", "painting"],
};

export function getArtworkInfo(path: string): ArtworkInfo | undefined {
  const row = ARTWORK_ROWS[path];
  return row
    ? { year: row[0], style: row[1], region: row[2], medium: row[3] }
    : undefined;
}

export function artEra(year: number): ArtEra {
  let era: ArtEra = ART_ERAS[0].id;
  for (const entry of ART_ERAS) if (year >= entry.from) era = entry.id;
  return era;
}
