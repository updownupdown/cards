import { layoutStyles } from "@/styles/layoutStyles";
import { Text, View } from "react-native";

interface Props {
  message?: string;
}

export const MessageBox = ({ message }: Props) => {
  return (
    <View style={layoutStyles.gameMessageBox}>
      <Text style={layoutStyles.gameMessageText}>{message}</Text>
    </View>
  );
};
