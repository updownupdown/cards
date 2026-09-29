import {
  FallingParticle,
  type SceneProps,
  seeded,
  useWind,
} from "./BackgroundAnimations";

export function Embers(props: SceneProps) {
  const colors = ["#ffb347", "#ff7a2f", "#ffd27a"];
  const wind = useWind(props.width);

  return (
    <>
      {Array.from({ length: 28 }, (_, index) => (
        <FallingParticle
          key={index}
          {...props}
          flicker
          color={colors[index % colors.length]}
          duration={10000 + seeded(index, 15) * 8000}
          gentleSway
          phase={seeded(index, 16)}
          size={1 + seeded(index, 17) * 2.5}
          sway={1 + seeded(index, 18) * 3}
          wind={wind}
          x={seeded(index, 19)}
        />
      ))}
    </>
  );
}
