// Jest-only Babel transform. The app has no babel.config.js (Expo applies
// babel-preset-expo itself), so tests reuse that preset from Expo's own
// install and add babel-plugin-require-context-hook, which provides Metro's
// require.context (used by the game registry). App builds are unaffected.
const babelJest = require("babel-jest").default;

const presetExpo = require.resolve("babel-preset-expo", {
  paths: [require.resolve("expo/package.json")],
});

module.exports = babelJest.createTransformer({
  babelrc: false,
  configFile: false,
  presets: [presetExpo],
  plugins: [require.resolve("babel-plugin-require-context-hook")],
  caller: { name: "metro", bundler: "metro", platform: "ios" },
});
