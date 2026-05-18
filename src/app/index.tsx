import { StyleSheet, View } from "react-native";

import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.linkCol}>
      <Link href="/" style={styles.linkText}>
        Home
      </Link>
      <Link href="/aces-up" style={styles.linkText}>
        Aces Up
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  linkCol: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderColor: "pink",
  },
  linkText: {
    fontSize: 16,
    backgroundColor: "#aaa",
    paddingVertical: 16,
    alignSelf: "stretch",
    textAlign: "center",
    boxShadow: "1px 2px 4px rgba(0,0,0,.1), 2px 4px 20px rgba(0,0,0,.1)",
    fontFamily: "Outfit_300Light",
  },
});
