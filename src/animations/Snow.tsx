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
      {Array.from({ length: 42 }, (_, index) => (
        <FallingParticle
          key={index}
          {...props}
          color={`rgba(255, 255, 255, ${seeded(index, 6) * 0.6 + 0.4})`}
          duration={9000 + seeded(index, 1) * 7000}
          gentleSway
          phase={seeded(index, 2)}
          size={0.5 + seeded(index, 3) * 2}
          sway={2 + seeded(index, 4) * 6}
          wind={wind}
          x={seeded(index, 5)}
        />
      ))}
    </>
  );
}
