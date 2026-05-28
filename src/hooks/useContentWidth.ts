import { ContentSidePadding, MaxContentWidth } from "@/styles/styles";
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export const useContentWidth = () => {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = useMemo(
    () => Math.min(windowWidth, MaxContentWidth) - ContentSidePadding,
    [windowWidth],
  );

  return { contentDiameter: contentWidth, contentRadius: contentWidth / 2 };
};
