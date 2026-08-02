module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  moduleNameMapper: {
    "\\.(css)$": "<rootDir>/test/style-mock.js",
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/src/app/",
    "<rootDir>/e2e/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|immer|use-immer)",
  ],
  collectCoverageFrom: [
    "src/components/Games/**/*.{ts,tsx}",
    "src/components/Home/Home.tsx",
    "src/components/Modals/{GameModal,HomeModal,SearchModal,game-modal-policy}.{ts,tsx}",
    "src/data/game-menu.ts",
    "src/hooks/**/*.{ts,tsx}",
    "src/app/index.tsx",
    "src/app/\\[game\\].tsx",
    "!src/**/*.d.ts",
  ],
};
