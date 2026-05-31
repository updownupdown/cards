import { ContentSidePadding, MaxContentWidth } from "@/styles/styles";
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export const useContentWidth = () => {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = useMemo(
    () => Math.min(windowWidth - ContentSidePadding * 2, MaxContentWidth),
    [windowWidth],
  );

  return { contentDiameter: contentWidth, contentRadius: contentWidth / 2 };
};
