import {
  FallingParticle,
  type SceneProps,
  seeded,
  useWind,
} from "./BackgroundAnimations";

export function Snow(props: SceneProps) {
  const wind = useWind(props.width);

  return (
    <>
      {Array.from({ length: 32 }, (_, index) => (
        <FallingParticle
          key={index}
          {...props}
          color={`rgba(255, 255, 255, ${seeded(index, 6) * 0.5 + 0.5})`}
          duration={7000 + seeded(index, 1) * 7000}
          gentleSway
          phase={seeded(index, 2)}
          size={1 + seeded(index, 3) * 3}
          sway={2 + seeded(index, 4) * 4}
          wind={wind}
          x={seeded(index, 5)}
        />
      ))}
    </>
  );
}
