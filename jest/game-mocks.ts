import { jest } from "@jest/globals";
// Mocks for rendering game screens under Jest; see game-harness.tsx. Import
// this before any game module (games load lazily through games-router, so a
// top-of-file import is enough).

jest.mock("@/components/common/GameWrapper", () =>
  require("./game-harness").mockGameWrapperModule(),
);
jest.mock("@/components/Cards/CardMap", () =>
  require("./game-harness").mockCardMapModule(),
);
jest.mock("@/hooks/useStateManager", () =>
  require("./game-harness").mockStateManagerModule(),
);
jest.mock("@/hooks/useDragDrop", () =>
  require("./game-harness").mockDragDropModule(),
);
jest.mock("expo-router", () => require("./game-harness").mockExpoRouterModule());
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("@/components/common/Toast", () => ({
  ...jest.requireActual<object>("@/components/common/Toast"),
  useToast: () => () => {},
}));

// Rendering a game and playing out its timers takes a few seconds.
jest.setTimeout(30000);

export {};
