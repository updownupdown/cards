// Expo's types, web styles included (outline, userSelect, touchAction...).
// expo start also writes expo-env.d.ts with this, but it's git-ignored, so a
// fresh checkout (or CI) type-checks without it.
/// <reference types="expo/types" />

declare module "*.svg" {
  import * as React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}

declare module "*.png" {
  import { ImageSourcePropType } from "react-native";
  const content: ImageSourcePropType;
  export default content;
}
