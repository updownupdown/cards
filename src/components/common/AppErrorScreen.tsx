import { dismissLaunchIntro } from "@/components/common/LaunchIntro";
import { i18n } from "@/i18n";
import { Colors, FontWeight } from "@/styles/styles";
import { reportCrash } from "@/utils/crash-reporting";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  error: Error;
  retry: () => Promise<void>;
};

/**
 * What the player sees when a screen outside a game (Home, the Gallery, the
 * privacy policy) throws while rendering. Without it the whole app unmounts:
 * a blank screen on web and a crash on Android and iOS. It can take the place
 * of the root layout, so it leans on nothing the layout provides (toasts, safe
 * area). expo-router hides the splash when it catches the error, and this takes
 * the launch intro away (on the web, the page's own overlay stays otherwise).
 */
export function AppErrorScreen({ error, retry }: Props) {
  useEffect(() => {
    dismissLaunchIntro();
    console.error("Screen crashed:", error);
    reportCrash(error);
  }, [error]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 32,
        backgroundColor: Colors.background,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          color: Colors.K100,
          fontFamily: FontWeight[400],
          fontSize: 18,
          textAlign: "center",
        }}
      >
        {i18n.t("common:errors.appCrashed")}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={({ pressed }) => ({
          paddingVertical: 12,
          paddingHorizontal: 28,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: Colors.K400,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            color: Colors.K100,
            fontFamily: FontWeight[500],
            fontSize: 16,
          }}
        >
          {i18n.t("common:errors.tryAgain")}
        </Text>
      </Pressable>
    </View>
  );
}
