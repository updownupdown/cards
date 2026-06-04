import { Colors, FontWeight } from "@/styles/styles";
import { StyleSheet } from "react-native";

export const homeStyles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 30,
    backgroundColor: Colors.background,
  },
  sectionHeaderRow: {
    marginTop: 20,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: Colors.K200,
    fontFamily: FontWeight[600],
  },
  starBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },

  // Tabs
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    paddingVertical: 12,
    justifyContent: "space-around",
    alignItems: "center",
    boxShadow: `0 0 4px ${Colors.background}, 0 0 18px ${Colors.background}`,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconAbsolute: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
