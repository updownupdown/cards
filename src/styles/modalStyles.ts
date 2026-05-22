import { Colors, MaxContentHeight, MaxContentWidth } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: MaxContentWidth,
    height: "100%",
    maxHeight: MaxContentHeight,
    backgroundColor: Colors.K850,
    borderRadius: 8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 12,
  },
  modalContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 32,
  },
  homeActionBtn: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#dedede",
    borderWidth: 1,
    borderColor: "#bcbcbc",
  },
  homeActionText: {
    fontWeight: "700",
    fontSize: 16,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: Colors.K900,
    borderRadius: 8,
    padding: 20,
    gap: 6,
  },
});
