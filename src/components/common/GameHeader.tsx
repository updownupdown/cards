import { layoutStyles } from "@/styles/layoutStyles";
import { Pressable, Text, View } from "react-native";
import MenuButton from "../Home/HomeButton";
import { buttonStyles } from "@/styles/buttonStyles";
import { textStyles } from "@/styles/textStyles";
import { router } from "expo-router";
import { Icon } from "../icons";
import { Colors } from "@/constants/theme";

interface Props {
  gameTitle: string;
  ended: boolean;
  won: boolean;
  reset: () => void;
}

export const GameHeader = ({ gameTitle, ended, won, reset }: Props) => {
  return (
    <View style={layoutStyles.gameHeader}>
      <Pressable
        style={buttonStyles.headerButton}
        onPress={() => {
          router.push("/");
        }}
      >
        <Icon name="arrow-back" fill={Colors.K700} />
      </Pressable>

      <Text style={textStyles.title}>{gameTitle}</Text>

      <Pressable style={buttonStyles.button} onPress={reset}>
        <Text style={buttonStyles.buttonText}>Reset</Text>
      </Pressable>

      <MenuButton ended={ended} won={won} />
    </View>
  );
};
