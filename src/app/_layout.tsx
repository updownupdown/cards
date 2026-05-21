import { layoutStyles } from "@/styles/layoutStyles";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ImageBackground, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Layout() {
  const [fontsLoaded] = useFonts({
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
    // <ImageBackground
    //   source={require("@/assets/images/blue-felt.jpg")}
    //   resizeMode="repeat"
    //   style={layoutStyles.background}
    // >
    <View style={layoutStyles.appView}>
      <SafeAreaView style={layoutStyles.safeArea}>
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }}
        />
      </SafeAreaView>
    </View>
    // </ImageBackground>
  );
}
