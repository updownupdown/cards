const buildDate = new Date().toISOString();

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "SoloSuite",
  description: "A collection of solo playing card games.",
  slug: "cards",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/app-icon/icon.png",
  scheme: "cards",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/app-icon/icon.png",
  },
  android: {
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#343f49",
      foregroundImage: "./assets/app-icon/android-foreground.png",
      backgroundImage: "./assets/app-icon/android-background.png",
      monochromeImage: "./assets/app-icon/android-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.updownupdown.cards",
  },
  web: {
    output: "static",
    favicon: "./assets/app-icon/icon.png",
    themeColor: "#343f49",
    name: "SoloSuite",
    shortName: "SoloSuite",
    description: "A collection of solo playing card games.",
    display: "standalone",
    startUrl: "./",
    scope: "./",
    backgroundColor: "#343f49",
    orientation: "any",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#343F49",
        android: {
          image: "./assets/app-icon/icon.png",
          imageWidth: 76,
        },
      },
    ],
  ],
  experiments: {
    baseUrl: "/",
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "30ebd444-354d-47f5-a779-13c1576fbf48",
    },
    buildDate,
  },
};

module.exports = { expo: config };
