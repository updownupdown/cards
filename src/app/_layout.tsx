import { ToastProvider } from "@/components/common/Toast";
import { Colors } from "@/styles/styles";
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
      </View>
    </ToastProvider>
  );
}
