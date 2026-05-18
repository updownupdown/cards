import {
  BottomTabInset,
  MaxContentHeight,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";
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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Slot />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    flex: 1,
    backgroundColor: "#eee",
    fontFamily: "Outfit_500Medium",
  },
  safeArea: {
    flex: 1,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    alignSelf: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,

    backgroundColor: "#ddd",
    borderWidth: 1,
    borderColor: "green",
    width: "100%",
    height: "100%",
    maxWidth: MaxContentWidth,
    maxHeight: MaxContentHeight,
  },
});
