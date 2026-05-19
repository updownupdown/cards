import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeButton() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.menuBtnWrap, { top: insets.top + 8 }]}>
      <Link href="/" asChild>
        <Pressable style={styles.menuBtn}>
          <Text>Back to Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  menuBtnWrap: {
    position: "absolute",
    left: 8,
    zIndex: 100,
    elevation: 4,
    backgroundColor: "#eee",
  },
  menuBtn: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#ddd",
  },
});
