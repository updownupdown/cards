import { messageStyles } from "@/styles/messageStyles";
import { Text, View } from "react-native";

interface Props {
  message?: string;
  messageType?: "win" | "lose" | "default";
}

export const MessageBox = ({ message, messageType = "default" }: Props) => {
  return (
    <View
      style={[
        messageStyles.box,
        messageType === "win" && messageStyles.boxWin,
        messageType === "lose" && messageStyles.boxLose,
      ]}
    >
      <Text
        style={[
          messageStyles.text,
          messageType === "win" && messageStyles.textWin,
          messageType === "lose" && messageStyles.textLose,
        ]}
      >
        {message}
      </Text>
    </View>
  );
};
