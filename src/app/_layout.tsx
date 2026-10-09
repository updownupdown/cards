import { AppErrorScreen } from "@/components/common/AppErrorScreen";
import { GameLaunchOverlay } from "@/components/common/GameLaunchOverlay";
import {
  LaunchIntro,
  useLaunchIntroPhase,
} from "@/components/common/LaunchIntro";
import { SystemBarScrims } from "@/components/common/SystemBarScrims";
import { ToastProvider } from "@/components/common/Toast";
import { useGameColors } from "@/hooks/useGameColors";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { getGameInfo, isGamePath } from "@/data/game-menu";
import { useDisplayLanguage } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { SOURCE_LANGUAGE } from "@/i18n/languages";
import { applyColorTheme, Colors } from "@/styles/styles";
import { getColorTheme } from "@/styles/themes";
import {
  addGameBreadcrumb,
  initCrashReporting,
  setCrashContext,
  withCrashReporting,
} from "@/utils/crash-reporting";
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
import {
  EBGaramond_400Regular,
  EBGaramond_400Regular_Italic,
  EBGaramond_500Medium,
  EBGaramond_500Medium_Italic,
  EBGaramond_600SemiBold,
} from "@expo-google-fonts/eb-garamond";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { loadDevMode } from "@/data/dev-mode";
import { redeemUnlockKeyFromLink } from "@/data/odyssey-unlock";
import { loadHintMode } from "@/data/hint-mode";
import { loadMomentSettings } from "@/data/moments";
import { loadSwipeDismissKnown } from "@/data/swipe-dismiss";
import { loadAutopilotSessions } from "@/hints/hint-store";
import { FontDisplay, useFonts } from "expo-font";
import {
  Stack,
  usePathname,
  SplashScreen,
  type ErrorBoundaryProps,
} from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View, Platform } from "react-native";

// Install the crash handlers before the first screen mounts, so a failure
// during startup is still reported.
initCrashReporting();

// Keep the splash screen visible while we fetch resources; the launch intro
// hides it once it's drawn the same picture underneath. A short fade, over in
// the intro's hold, before its colours start to move.
SplashScreen.preventAutoHideAsync();
ExpoSplashScreen.setOptions({ duration: 150, fade: true });
// Beta games turned on from the settings, read before Home lists games
// (after the full Odyssey's unlock, which says whether dev mode may be on).
// Then, on the web, an unlock key given in the link (`?key=`).
void loadDevMode().then(() => redeemUnlockKeyFromLink());
// "Help from Above" (the header UFO), read before a game's header shows.
void loadHintMode();
// How often a quiet moment follows a win, read before the first win.
void loadMomentSettings();
// Whether the quick start's swipe still needs its cue.
void loadSwipeDismissKnown();
// Deals Autopilot played in, so a resumed one's win still doesn't count.
void loadAutopilotSessions();

function Layout() {
  // The colour theme is applied before anything below renders, and the app
  // is rebuilt under a new key when it changes, so every screen restyles.
  const { settings, isLoading: settingsLoading } = useGlobalSettings();
  applyColorTheme(settings.colorTheme);
  const { colorDark } = useGameColors();
  const pathname = usePathname();
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
          // font-display: block. The web's launch intro sets the name in it
          // before the app loads, and it mustn't show in a fallback first.
          Outfit_500Medium: {
            uri: Outfit_500Medium,
            display: FontDisplay.BLOCK,
          },
          Outfit_600SemiBold,
          Outfit_700Bold,
          EBGaramond_400Regular,
          EBGaramond_400Regular_Italic,
          EBGaramond_500Medium,
          EBGaramond_500Medium_Italic,
          EBGaramond_600SemiBold,
        },
  );
  const fontsLoaded = embedsFonts || fontsLoadedAtRuntime;
  const startLanguage = useLanguageSync();
  const languageReady = startLanguage !== null;
  const displayLanguage = useDisplayLanguage();
  const isSplashVisible = !fontsLoaded || !languageReady;
  const introPhase = useLaunchIntroPhase();

  // Colour for the chrome the app can't draw behind: Chrome mobile's header,
  // and the page background Chrome samples for Android's button bar in a
  // standalone PWA. Each value is the flattest match for what the screen
  // itself shows - a game's own dark colour inside a game, and the starfield's
  // overlay colour on the home screen, whose tabs all sit on the same
  // background image (the theme's night, looked up from the setting so this
  // follows it). Until the launch intro is gone, it has these: black (the
  // page's head and global.css), then easing into this colour.
  const themeColor = isGamePath(pathname)
    ? colorDark
    : getColorTheme(settings.colorTheme).colors.night;

  useEffect(() => {
    if (typeof document === "undefined" || introPhase !== "done") return;

    const updateMeta = (name: string, content: string) => {
      document
        .querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
        ?.setAttribute("content", content);
    };

    updateMeta("theme-color", themeColor);
    updateMeta("msapplication-navbutton-color", themeColor);

    // Tint the Android system navigation (bottom button) bar to match the
    // current screen. Chrome paints that area with the canvas background,
    // which comes from the root element whenever the root has a background of
    // its own - and global.css gives <html> the splash black so the page is
    // black before the app mounts. That means body's colour never propagates
    // to the canvas, so the root has to be updated too or the bar stays black.
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;
  }, [themeColor, introPhase]);

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

    const rootTitle = "Solitarius";
    const pageTitle = isGamePath(pathname)
      ? `${localizeGameTitle(getGameInfo(pathname), pathname, displayLanguage)} ♠ ${rootTitle}`
      : rootTitle;

    document.title = pageTitle;
  }, [displayLanguage, pathname]);

  // Breadcrumbs say which screen an event came from, and the tag lets Sentry
  // group issues by game.
  useEffect(() => {
    const game = isGamePath(pathname) ? pathname : undefined;
    setCrashContext({ game, language: displayLanguage });
    addGameBreadcrumb(`screen ${pathname}`);
  }, [displayLanguage, pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
      active.blur();
    }
  }, [pathname]);

  // Native apps will crash if fonts aren't loaded, so we return null.
  // Web browsers handle missing fonts gracefully, and returning null breaks SSR/Hydration.
  if ((!fontsLoaded || !languageReady) && Platform.OS !== "web") {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ToastProvider>
          <View
            // The static web pages are in English. In another language the
            // app is rebuilt instead of hydrated from them, which would fail
            // (React error #418) on every screen not hydrated yet.
            key={`${settings.colorTheme}:${settings.useEnglishGameTitles}:${
              Platform.OS === "web" ? (startLanguage ?? SOURCE_LANGUAGE) : ""
            }`}
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
            >
              <Stack.Screen
                name="index"
                options={{ orientation: "portrait" }}
              />
              {/* One game screen at a time: opening a game while another is
                  open (e.g. from a link) replaces it instead of stacking every
                  earlier game, still running, underneath. */}
              <Stack.Screen name="[game]" dangerouslySingular={() => "game"} />
            </Stack>
            <GameLaunchOverlay />
            {/* Keeps the system bars readable over every screen. LOCKED:
                see utils/system-bar-scrims. */}
            <SystemBarScrims inGame={isGamePath(pathname)} />
          </View>
        </ToastProvider>
        {/* Over everything, once fonts are ready, the saved language applied
            and the colour theme known: it takes over from the splash, hides
            it and eases into the theme. */}
        {!isSplashVisible && !settingsLoading && (
          <LaunchIntro pageColor={themeColor} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Catches render errors from every screen without a boundary of its own (games
 * have theirs, in [game]), and from this layout.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <AppErrorScreen error={error} retry={retry} />;
}

// Catches native crashes and errors React itself can't hand to a boundary.
export default withCrashReporting(Layout);
