export const GAME_THUMBNAIL_ASSETS = {
  "Accordion.jpg": require("../../assets/thumbnails/Accordion.jpg"),
  "AcesUp.jpg": require("../../assets/thumbnails/AcesUp.jpg"),
  "Area52.jpg": require("../../assets/thumbnails/Area52.jpg"),
  "BobaTea.jpg": require("../../assets/thumbnails/BobaTea.jpg"),
  "Clock.jpg": require("../../assets/thumbnails/Clock.jpg"),
  "DeadCenter.jpg": require("../../assets/thumbnails/DeadCenter.jpg"),
  "Emissary.jpg": require("../../assets/thumbnails/Emissary.jpg"),
  "Foursquare.jpg": require("../../assets/thumbnails/Foursquare.jpg"),
  "HideAndSeek.jpg": require("../../assets/thumbnails/HideAndSeek.jpg"),
  "LootTheLoop.jpg": require("../../assets/thumbnails/LootTheLoop.jpg"),
  "MonteCarlo.jpg": require("../../assets/thumbnails/MonteCarlo.jpg"),
  "SandwichGuy.jpg": require("../../assets/thumbnails/SandwichGuy.jpg"),
  "Skyway.jpg": require("../../assets/thumbnails/Skyway.jpg"),
  "Syndicate.jpg": require("../../assets/thumbnails/Syndicate.jpg"),
  "Calculation.jpg": require("../../assets/thumbnails/Calculation.jpg"),
  "Golf.jpg": require("../../assets/thumbnails/Golf.jpg"),
  "Regicide.jpg": require("../../assets/thumbnails/Regicide.jpg"),
  "Scoundrel.jpg": require("../../assets/thumbnails/Scoundrel.jpg"),
} as const;

export type GameThumbnailName = keyof typeof GAME_THUMBNAIL_ASSETS;
