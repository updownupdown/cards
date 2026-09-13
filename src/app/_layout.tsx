import { GameLaunchOverlay } from "@/components/common/GameLaunchOverlay";
import { ToastProvider } from "@/components/common/Toast";
import {
  getActiveHomeTab,
  NODES_HOME_TAB_INDEX,
  subscribeActiveHomeTab,
} from "@/components/Home/home-view-state";
import { useGameColors } from "@/hooks/useGameColors";
import { getGameInfo, isGamePath } from "@/data/game-menu";
import { Colors } from "@/styles/styles";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack, usePathname, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useSyncExternalStore } from "react";
import { View, Platform } from "react-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const NODES_THEME_COLOR = "#19231D";

export default function Layout() {
  const { colorDark } = useGameColors();
  const pathname = usePathname();
  const activeHomeTab = useSyncExternalStore(
    subscribeActiveHomeTab,
    getActiveHomeTab,
    getActiveHomeTab,
  );
  const themeColor = isGamePath(pathname)
    ? colorDark
    : activeHomeTab === NODES_HOME_TAB_INDEX
      ? NODES_THEME_COLOR
      : Colors.background;
  // Android embeds the fonts at build time (expo-font plugin in app.config.js),
  // so they're ready from the first frame and the splash can hide straight
  // away. Other platforms load them at runtime.
  const embedsFonts = Platform.OS === "android";
  const [fontsLoadedAtRuntime] = useFonts(
    embedsFonts
      ? {}
      : {
          Outfit_200ExtraLight,
          Outfit_300Light,
          Outfit_400Regular,
          Outfit_500Medium,
          Outfit_600SemiBold,
          Outfit_700Bold,
        },
  );
  const fontsLoaded = embedsFonts || fontsLoadedAtRuntime;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateMeta = (name: string, content: string) => {
      document
        .querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
        ?.setAttribute("content", content);
    };

    updateMeta("theme-color", themeColor);
    updateMeta("msapplication-navbutton-color", themeColor);

    // Tint the Android system navigation (bottom button) bar to match the
    // current screen. In a standalone PWA Chrome samples the page background
    // behind the bottom safe area, so keeping the body background in sync with
    // the active theme color colours the virtual buttons accordingly.
    document.body.style.backgroundColor = themeColor;
  }, [themeColor]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    html.classList.toggle("fonts-loading", !fontsLoaded);
    html.classList.toggle("fonts-ready", fontsLoaded);
  }, [fontsLoaded]);

  // On web, expo-router keeps previous screens mounted but hides them with
  // display:none (which react-native-web flags with aria-hidden). If the
  // element that triggered navigation still holds focus, Chromium warns that
  // focus is trapped inside an aria-hidden subtree. Blurring on route change
  // clears that focus before the outgoing screen is hidden.
  useEffect(() => {
    if (typeof document === "undefined") return;

    const rootTitle = "SoloSuite";
    const pageTitle = isGamePath(pathname)
      ? `${getGameInfo(pathname).title} ♠ ${rootTitle}`
      : rootTitle;

    document.title = pageTitle;
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
      active.blur();
    }
  }, [pathname]);

  // Add this new useEffect to hide the splash screen once fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Native apps will crash if fonts aren't loaded, so we return null.
  // Web browsers handle missing fonts gracefully, and returning null breaks SSR/Hydration.
  if (!fontsLoaded && Platform.OS !== "web") {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ToastProvider>
          <View
            style={[
              {
                flex: 1,
                userSelect: "none",
                backgroundColor: Colors.background,
              },
            ]}
          >
            <Stack
              screenOptions={{
                headerShown: false,
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
                contentStyle: { backgroundColor: Colors.background },
              }}
            />
            <GameLaunchOverlay />
          </View>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
