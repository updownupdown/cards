import { AnimationProvider } from "@/components/Animations/Animations";
import { layoutStyles } from "@/styles/layoutStyles";
import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/common/Toast";

export default function Layout() {
  const { width: windowWidth } = useWindowDimensions();
  const wideWidth = windowWidth > 480;

  const [fontsLoaded] = useFonts({
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <ToastProvider>
        <AnimationProvider>
          <View
            style={[
              layoutStyles.appView,
              wideWidth && layoutStyles.appViewWide,
            ]}
          >
            <SafeAreaView
              style={[
                layoutStyles.safeArea,
                wideWidth && layoutStyles.safeAreaWide,
              ]}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: false,
                  fullScreenGestureEnabled: false,
                }}
              />
            </SafeAreaView>
          </View>
        </AnimationProvider>
      </ToastProvider>
    </>
  );
}
