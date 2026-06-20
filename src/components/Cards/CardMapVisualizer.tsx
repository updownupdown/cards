import { Colors, rgba } from "@/styles/styles";
import { View, ViewStyle } from "react-native";
import { MapZone } from "./CardMap";

type Props = {
  zones: MapZone[];
  getZoneStyles: (zone: MapZone) => ViewStyle;
  startX: number;
  startY: number;
  gridWidth: number;
  gridWidthPadded: number;
  gridHeight: number;
  gridHeightPadded: number;
};

export const CardMapVisualizer = ({
  zones,
  getZoneStyles,
  startX,
  startY,
  gridWidth,
  gridWidthPadded,
  gridHeight,
  gridHeightPadded,
}: Props) => {
  const zoneStyle: ViewStyle = {
    position: "absolute",
    zIndex: 200,
    borderWidth: 1,
  };

  return (
    <View
      style={[
        {
          userSelect: "none",
          pointerEvents: "none",
          position: "absolute",
          zIndex: 200,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          opacity: 0.6,
        },
      ]}
    >
      {/* Entire View */}
      <View
        style={[
          zoneStyle,
          {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            borderColor: rgba(Colors.white, 0.2),
          },
        ]}
      />

      {/* Full Grid */}
      <View
        style={[
          zoneStyle,
          {
            left: "50%",
            top: "50%",
            width: gridWidth,
            height: gridHeight,
            borderColor: rgba(Colors.accentBlue, 0.8),
            transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
          },
        ]}
      />

      {/* Padded Grid */}
      <View
        style={[
          zoneStyle,
          {
            left: startX,
            top: startY,
            width: gridWidthPadded,
            height: gridHeightPadded,
            borderColor: rgba(Colors.accentGreen, 0.8),
          },
        ]}
      />

      {/* Zones */}
      {zones.map((zone) => {
        return (
          <View
            key={`placeholder-${zone.id}`}
            style={[
              zoneStyle,
              getZoneStyles(zone),
              {
                borderColor: rgba(Colors.accentRed, 0.6),
              },
            ]}
          />
        );
      })}
    </View>
  );
};
