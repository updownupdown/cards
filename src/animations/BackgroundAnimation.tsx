import { StyleSheet, View } from "react-native";
import { animationStyles, type SceneProps } from "./BackgroundAnimations";
import { Birds } from "./Birds";
import { CherryBlossom } from "./CherryBlossom";
import { Clouds } from "./Clouds";
import { Dust } from "./Dust";
import { Embers } from "./Embers";
import { Firefly } from "./Firefly";
import { Leaves } from "./Leaves";
import { ManaDust } from "./ManaDust";
import { Pollen } from "./Pollen";
import { Rain } from "./Rain";
import { Sand } from "./Sand";
import { Snow } from "./Snow";
import { Stars } from "./Stars";
import { GameAnimation, GameAnimations } from "./types";

type Props = SceneProps & {
  animation?: GameAnimation;
};

export function BackgroundAnimation({ animation, width, height }: Props) {
  if (!animation || width <= 0 || height <= 0) return null;

  const sceneProps = { width, height };
  let scene: React.ReactNode;

  switch (animation) {
    case GameAnimations.Snow:
      scene = <Snow {...sceneProps} />;
      break;
    case GameAnimations.Leaves:
      scene = <Leaves {...sceneProps} />;
      break;
    case GameAnimations.Sand:
      scene = <Sand {...sceneProps} />;
      break;
    case GameAnimations.Embers:
      scene = <Embers {...sceneProps} />;
      break;
    case GameAnimations.Birds:
      scene = <Birds {...sceneProps} />;
      break;
    case GameAnimations.Clouds:
      scene = <Clouds {...sceneProps} />;
      break;
    case GameAnimations.Stars:
      scene = <Stars {...sceneProps} />;
      break;
    case GameAnimations.Firefly:
      scene = <Firefly {...sceneProps} />;
      break;
    case GameAnimations.Rain:
      scene = <Rain {...sceneProps} />;
      break;
    case GameAnimations.CherryBlossom:
      scene = <CherryBlossom {...sceneProps} />;
      break;
    case GameAnimations.ManaDust:
      scene = <ManaDust {...sceneProps} />;
      break;
    case GameAnimations.Pollen:
      scene = <Pollen {...sceneProps} />;
      break;
    case GameAnimations.Dust:
      scene = <Dust {...sceneProps} />;
      break;
  }

  return (
    <View
      style={[StyleSheet.absoluteFillObject, animationStyles.nonInteractive]}
    >
      {scene}
    </View>
  );
}
