import { LayoutManager, LayoutMetrics } from "@/hooks/useZoneLayout";
import { Colors } from "@/styles/styles";
import { View, ViewStyle } from "react-native";

type Props = {
  layoutManager: LayoutManager;
  layoutMetrics: LayoutMetrics;
};

{
  /* <ZoneVisualizer
  layoutManager={layoutManager}
  layoutMetrics={layoutMetrics}
/> */
}

export const ZoneVisualizer = ({ layoutManager, layoutMetrics }: Props) => {
  const { zones, getZoneBasePos, cardWidth, cardHeight } = layoutManager;
  const {
    startX,
    startY,
    gridWidth,
    gridHeight,
    gridWidthPadded,
    gridHeightPadded,
    gridGap,
  } = layoutMetrics;

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
            borderColor: Colors.K700,
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
            borderColor: Colors.accentBlue,
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
            borderColor: Colors.accentGreen,
          },
        ]}
      />

      {zones.map((zone) => {
        const pos = getZoneBasePos(zone);

        return (
          <View
            key={`placeholder-${zone.id}`}
            style={[
              zoneStyle,
              {
                left: pos.x,
                top: pos.y,
                borderColor: Colors.accentRed,
                width: cardWidth * (zone.width ?? 1),
                height: cardHeight * (zone.height ?? 1),
              },
            ]}
          />
        );
      })}
    </View>
  );
};
