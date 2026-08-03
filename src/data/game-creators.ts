export const GameCreators = {
  Unknown: "Unknown",
  AaronCamponi: "Aaron Camponi",
  AndyRichdale: "Andy Richdale",
  AustinPalmer: "Austin Palmer",
  CLBaker: "C. L. Baker",
  DavidParlett: "David Parlett",
  Frank: "Frank",
  GreggJewell: "Gregg Jewell",
  JamesErnest: "James Ernest",
  JimOwen: "Jim Owen",
  JohnBurton: "John Burton",
  KatharineTurner: "Katharine Turner",
  KurtBieg: "Kurt Bieg",
  LucasGentry: "Lucas Gentry",
  LukeBadger: "Luke Badger",
  MarkSBall: "Mark S. Ball",
  PaulAbrahams: "Paul Abrahams",
  PaulAlfille: "Paul Alfille",
  PlaylinesGames: "Playlines Games",
  RobertHogue: "Robert Hogue",
  SidSackson: "Sid Sackson",
  StephenTudor: "Stephen Tudor",
  TheoPeters: "Theo Peters",
  WilSu: "Wil Su",
  ZachGage: "Zach Gage",
  DTeuber: "D. Teuber",
} as const;

export const CREATOR_LINKS: Partial<Record<GameCreator, string>> = {
  // [GameCreators.AaronCamponi]:
  //   "https://boardgamegeek.com/boardgamedesigner/126969/aaron-camponi",
  [GameCreators.AndyRichdale]:
    "https://boardgamegeek.com/boardgamedesigner/126152/andy-richdale",
  [GameCreators.AustinPalmer]:
    "https://boardgamegeek.com/boardgamedesigner/117577/austin-palmer",
  // [GameCreators.CLBaker]:
  //   "https://boardgamegeek.com/boardgamedesigner/1223/c-l-baker",
  [GameCreators.DavidParlett]:
    "https://boardgamegeek.com/boardgamedesigner/166/david-parlett",
  [GameCreators.Frank]:
    "https://boardgamegeek.com/boardgamedesigner/145156/frank",
  [GameCreators.GreggJewell]:
    "https://boardgamegeek.com/boardgamedesigner/71138/gregg-jewell",
  [GameCreators.JamesErnest]:
    "https://boardgamegeek.com/boardgamedesigner/61/james-ernest",
  [GameCreators.JohnBurton]:
    "https://boardgamegeek.com/boardgamedesigner/130937/john-burton",
  [GameCreators.KatharineTurner]:
    "https://boardgamegeek.com/boardgamedesigner/92670/katharine-turner",
  [GameCreators.KurtBieg]:
    "https://boardgamegeek.com/boardgamedesigner/12161/kurt-bieg",
  [GameCreators.LucasGentry]:
    "https://boardgamegeek.com/boardgamedesigner/109557/lucas-gentry",
  [GameCreators.LukeBadger]:
    "https://boardgamegeek.com/boardgamedesigner/126151/luke-badger",
  [GameCreators.MarkSBall]:
    "https://boardgamegeek.com/boardgamedesigner/136705/mark-s-ball",
  [GameCreators.PaulAbrahams]:
    "https://boardgamegeek.com/boardgamedesigner/126153/paul-abrahams",
  [GameCreators.RobertHogue]:
    "https://boardgamegeek.com/boardgamedesigner/127574/robert-hogue",
  [GameCreators.SidSackson]:
    "https://boardgamegeek.com/boardgamedesigner/4/sid-sackson",
  [GameCreators.StephenTudor]: "https://boardgamegeek.com/profile/TudePlays",
  // [GameCreators.TheoPeters]:
  //   "https://boardgamegeek.com/boardgamedesigner/126970/theo-peters",
  [GameCreators.WilSu]:
    "https://boardgamegeek.com/boardgamedesigner/121533/wilhelm-su",
  [GameCreators.ZachGage]:
    "https://boardgamegeek.com/boardgamedesigner/60260/zach-gage",
};

export type GameCreator = (typeof GameCreators)[keyof typeof GameCreators];

export function isValidLink(link: string | undefined): link is string {
  if (!link) return false;

  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
