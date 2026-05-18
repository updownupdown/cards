import { StyleSheet, Text, View } from "react-native";
import HomeButton from "../home/home-button";
import { Card } from "../cards/Card";
import { Deck } from "../cards/Deck";

export default function AcesUp() {
  return (
    <View style={styles.container}>
      <HomeButton />
      <Text>Aces Up!</Text>

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
