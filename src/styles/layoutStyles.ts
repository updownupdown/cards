import {
  Colors,
  ContentSidePadding,
  MaxContentHeight,
  MaxContentWidth,
  rgba,
} from "@/styles/styles";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";
import { debugStyles } from "./debugStyles";
import { headerButtonSize } from "./buttonStyles";

export const layoutStyles = StyleSheet.create({
  // App
  appView: {
    flex: 1,
    justifyContent: "center",
    fontFamily: "Outfit_500Medium",
    backgroundColor: Colors.K850,
  },
  appViewWide: {
    backgroundColor: Colors.K900,
  },
  safeArea: {
    ...flexStyles.fullWidthHeight,
    flex: 1,
    flexGrow: 1,
    alignItems: "stretch",
    alignSelf: "center",
    padding: ContentSidePadding,
    maxWidth: MaxContentWidth + ContentSidePadding * 2,
    maxHeight: MaxContentHeight + ContentSidePadding * 2,
    backgroundColor: Colors.K850,
  },
  safeAreaWide: {
    borderRadius: 30,
    boxShadow: `1px 2px 4px ${rgba(Colors.black, 0.3)}, 2px 4px 16px ${rgba(Colors.black, 0.3)}`,
  },
  background: {
    width: "100%",
    height: "100%",
  },
  // Game Area
  gameHeader: {
    position: "relative",
    zIndex: 12, // above the game overlay
    ...flexStyles.rowCentered,
    justifyContent: "space-between",
    width: "100%",
    height: headerButtonSize,
    backgroundColor: Colors.K850,
  },
  gameLoadingOverlay: {
    position: "absolute",
    zIndex: 11, // under the header but over the intro
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...flexStyles.rowCentered,
    backgroundColor: Colors.K850,
  },
  gameArea: {
    position: "relative",
    zIndex: 1,
    ...flexStyles.colCentered,
    flex: 1,
    justifyContent: "space-evenly",
    backgroundColor: Colors.K850,
    gap: 30,
    paddingVertical: 20,
  },
});
