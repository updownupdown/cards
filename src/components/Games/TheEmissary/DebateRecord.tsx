import { flexStyles, transitionStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { Text, View } from "react-native";
import { debateRecordsHeight, TheEmissaryVisit } from "./TheEmissaryCommon";

const dotRadius = 5;

interface DebateRecordProps {
  visit: TheEmissaryVisit | null;
  handSize: number;
}

export const DebateRecord = ({ handSize, visit }: DebateRecordProps) => {
  return (
    <View
      style={[
        flexStyles.rowCentered,
        flexStyles.fullWidth,
        flexStyles.spaceBetween,
        flexStyles.gap10,
        {
          position: "relative",
          zIndex: 1,
          backgroundColor: Colors.K875,
          borderRadius: 8,
          paddingHorizontal: 12,
          height: debateRecordsHeight,
        },
      ]}
    >
      <Text style={textStyles.default}>Wins</Text>

      <View style={[flexStyles.rowCentered, flexStyles.gap6]}>
        {Array.from({ length: handSize }, (_, i) => {
          if (!visit) return null;

          const won =
            visit.debateRecord[i] === undefined
              ? undefined
              : visit.debateRecord[i];

          const color =
            won === undefined ? Colors.K800 : won ? Colors.win : Colors.lose;

          return (
            <View
              key={`record-${i}`}
              style={[
                transitionStyles.sec03,
                {
                  backgroundColor: color,
                  width: dotRadius * 2,
                  height: dotRadius * 2,
                  borderRadius: dotRadius,
                },
              ]}
            />
          );
        })}
      </View>

      <Text
        style={[
          textStyles.default,
          {
            fontSize: 18,
            lineHeight: 22,
            fontFamily: FontWeight[500],
            flexShrink: 0,
          },
        ]}
      >
        {visit?.wins ?? "0"} / {visit?.requiredWins ?? "-"}
      </Text>
    </View>
  );
};
