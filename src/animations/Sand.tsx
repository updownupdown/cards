import { StyleSheet, View } from "react-native";
import { Drifter, type SceneProps, seeded } from "./BackgroundAnimations";

export function Sand(props: SceneProps) {
  return (
    <>
      <View style={styles.haze} />
      {Array.from({ length: 60 }, (_, index) => {
        const size = 1 + Math.floor(seeded(index, 10) * 2);

        return (
          <Drifter
            key={index}
            {...props}
            delay={seeded(index, 11) * 7000}
            duration={2500 + seeded(index, 12) * 3500}
            travelPadding={12}
            y={seeded(index, 13)}
          >
            <View
              style={[
                styles.grain,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  opacity: 0.35 + seeded(index, 14) * 0.55,
                },
              ]}
            />
          </Drifter>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  haze: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(198, 146, 77, 0.12)",
  },
  grain: {
    backgroundColor: "#d9a85f",
  },
});
