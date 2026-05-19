import { ScrollView, StyleSheet, View } from "react-native";

import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.linkCol}>
        <Link href="/aces-up" style={styles.linkText}>
          Aces Up
        </Link>
        <Link href="/solitaire" style={styles.linkText}>
          Solitaire
        </Link>
        <Link href="/freecell" style={styles.linkText}>
          FreeCell
        </Link>
        <Link href="/spider-solitaire" style={styles.linkText}>
          Spider Solitaire
        </Link>
        <Link href="/pyramid" style={styles.linkText}>
          Pyramid
        </Link>
        <Link href="/tripeaks" style={styles.linkText}>
          TriPeaks
        </Link>
        <Link href="/skyway" style={styles.linkText}>
          Skyway
        </Link>
        <Link href="/the-sandwich-guy" style={styles.linkText}>
          The Sandwich Guy
        </Link>
        <Link href="/area-52" style={styles.linkText}>
          Area 52
        </Link>
        <Link href="/dead-center" style={styles.linkText}>
          Dead Center
        </Link>
        <Link href="/the-first-boba-tea-shop-in-london" style={styles.linkText}>
          The First Boba Tea Shop in London
        </Link>
        <Link href="/foursquare" style={styles.linkText}>
          Foursquare
        </Link>
        <Link href="/loot-the-loop" style={styles.linkText}>
          Loot the Loop
        </Link>
        <Link href="/syndicate" style={styles.linkText}>
          Syndicate
        </Link>
        <Link href="/hide-and-seek" style={styles.linkText}>
          Hide and Seek
        </Link>
        <Link href="/the-emissary" style={styles.linkText}>
          The Emissary
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 16,
  },
  linkCol: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 6,
    minHeight: "100%",
    width: "100%",
    paddingHorizontal: 12,
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
