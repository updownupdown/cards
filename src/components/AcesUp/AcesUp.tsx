import { StyleSheet, Text, View } from "react-native";
import HomeButton from "../Home/HomeButton";
import { Card } from "../Cards/Card";
import { Deck } from "../Cards/Deck";
import { Icon } from "@/components/icons";

export default function AcesUp() {
  return (
    <View style={styles.container}>
      <HomeButton />
      <Text>Aces Up!</Text>

      <Icon name="sword" size={40} color="#ff3b30" />
      <Icon name="fist" size={32} />
      <Icon name="dungeon" color="green" />

      <View style={styles.cardRow}>
        <Card suit="clubs" rank="5" widthRatio={5} />
        <Card suit="hearts" rank="A" widthRatio={5} />
        <Card suit="spades" rank="Joker" widthRatio={5} />
      </View>
      <Deck
        cards={[
          { suit: "spades", rank: "A" },
          { suit: "hearts", rank: "K" },
          { suit: "diamonds", rank: "Q" },
        ]}
        direction="horizontal"
      />
      <Deck backCount={6} direction="horizontal" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  cardRow: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "blue",
  },
});
