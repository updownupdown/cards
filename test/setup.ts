jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/data/games-registry", () => ({
  GAME_DEFINITIONS: [],
  GAMES_DATA: {},
}));

jest.mock("@/components/Cards/AnimatedCard", () => ({
  AnimatedCard: jest.fn(() => null),
}));

jest.mock("@/components/common/GameWrapper", () => ({
  GameWrapper: jest.fn(() => null),
}));

jest.mock("@/components/Cards/CardAssets", () => ({
  getCardBackAsset: jest.fn(() => 0),
  getCardImageSource: jest.fn(() => 0),
  isCardImageSetPreloaded: jest.fn(() => true),
  preloadCardImageSet: jest.fn(() => Promise.resolve()),
}));
