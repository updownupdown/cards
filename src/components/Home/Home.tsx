import {
  BottomTabInset,
  MaxContentHeight,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";
import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
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
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: 400,
    maxWidth: MaxContentWidth,
    // maxHeight: MaxContentHeight,
    backgroundColor: "#eee",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    maxHeight: MaxContentHeight,
    backgroundColor: "#ddd",
  },
});
