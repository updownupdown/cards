import { buttonStyles } from "@/styles/buttonStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button } from "../Button/Button";
import InfoModal from "../Modals/InfoModal";
import { Colors } from "@/styles/styles";

interface Props {
  gameTitle: string;
  ended: boolean;
  won: boolean;
  reset: () => void;
}

export const GameHeader = ({ gameTitle, ended, won, reset }: Props) => {
  return (
    <View style={layoutStyles.gameHeader}>
      <Button
        style={[buttonStyles.headerButton]}
        onPress={() => {
          router.push("/");
        }}
        iconName={"arrow-back"}
        iconColor={Colors.K400}
      />

      <Text style={textStyles.gameHeaderTitle}>{gameTitle}</Text>

      <Button
        style={[buttonStyles.headerButton]}
        onPress={reset}
        iconName="reset"
        iconColor={Colors.K400}
      />

      <InfoModal ended={ended} won={won} />
    </View>
  );
};
