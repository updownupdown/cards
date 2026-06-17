import { AnimationProvider } from "@/components/Animations/Animations";
import { ToastProvider } from "@/components/common/Toast";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, MaxContentHeight, MaxContentWidth } from "@/styles/styles";
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
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Layout() {
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
    <ToastProvider>
      <View
        style={[
          {
            flex: 1,
            justifyContent: "center",
            userSelect: "none",
            backgroundColor: Colors.background,
          },
        ]}
      >
        <SafeAreaView
          style={[
            flexStyles.fullWidthHeight,
            {
              flex: 1,
              flexGrow: 1,
              alignItems: "stretch",
              alignSelf: "center",
              maxWidth: MaxContentWidth,
              maxHeight: MaxContentHeight,
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
        </SafeAreaView>
      </View>
    </ToastProvider>
  );
}
