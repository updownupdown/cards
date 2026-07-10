import {
  Colors,
  ContentSidePadding,
  FontWeight,
  MaxContentHeight,
  rgba,
} from "@/styles/styles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { flexStyles } from "./flexStyles";

export const modalBorderRadius = 20;

export const modalShadow = `1px 2px 10px ${rgba(Colors.K900, 0.6)}, 2px 4px 20px ${rgba(Colors.K900, 0.4)}`;

export function useModalStyles() {
  const { ui, spacing, font } = useResponsiveMetrics();

  return useMemo(
    () =>
      StyleSheet.create({
        modalBackdrop: {
          flex: 1,
          backgroundColor: rgba(Colors.K800, 0.5),
          alignItems: "center",
          justifyContent: "center",
          padding: spacing(ContentSidePadding / 1.5),
        },
        modalCard: {
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          height: "100%",
          maxHeight: MaxContentHeight,
          backgroundColor: Colors.K900,
          borderRadius: spacing(20),
          overflow: "hidden",
          boxShadow: modalShadow,
        },
        modalHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingRight: spacing(16),
          paddingLeft: spacing(30),
          paddingVertical: spacing(12),
        },
        modalFooter: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing(30),
        },
        scrollContent: {
          ...flexStyles.colCentered,
          padding: spacing(30),
          paddingTop: spacing(10),
          paddingBottom: spacing(40),
          justifyContent: "space-evenly",
          gap: spacing(30),
          alignItems: "stretch",
          alignSelf: "stretch",
        },
        byLine: {
          fontFamily: FontWeight[300],
          fontSize: font(15),
          color: Colors.K500,
        },
        statsAndFav: {
          ...flexStyles.rowCentered,
          ...flexStyles.fullWidth,
          justifyContent: "space-between",
          gap: spacing(20),
        },
        stats: {
          ...flexStyles.rowCentered,
          gap: spacing(20),
        },
        stat: {
          ...flexStyles.colCentered,
        },
        statsTextLabel: {
          fontSize: font(14),
          color: Colors.K300,
          fontFamily: FontWeight[300],
        },
        statsTextValue: {
          fontSize: font(20),
          color: Colors.K100,
          fontFamily: FontWeight[500],
        },
        rules: {
          ...flexStyles.colCentered,
          ...flexStyles.fullWidth,
          alignItems: "flex-start",
          paddingVertical: spacing(12),
          gap: spacing(20),
        },
        aboutText: {
          fontSize: font(17),
          fontFamily: FontWeight[500],
          color: Colors.K200,
        },
        rulesText: {
          fontSize: font(17),
          fontFamily: FontWeight[300],
          color: Colors.K200,
        },
      }),
    [ui, spacing, font],
  );
}
