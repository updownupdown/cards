/* global jest */
// Native modules that game files import indirectly. The unit tests exercise
// pure game logic (the exported `...Rules` objects) and data helpers, so these
// only need to load, not work.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Reanimated's mock still loads worklets, whose native module doesn't exist
// under Jest, so mock worklets first.
jest.mock("react-native-worklets", () =>
  require("react-native-worklets/lib/module/mock"),
);

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

require("react-native-gesture-handler/jestSetup");

// Pairs with babel-plugin-require-context-hook in babel.config.js.
require("babel-plugin-require-context-hook/register")();
