import { StyleSheet } from "react-native";

/**
 * pointerEvents as styles. On web, "box-none" and "box-only" only work from a
 * StyleSheet (inline, they become invalid CSS the browser ignores), and the
 * pointerEvents prop is deprecated there.
 */
export const pointerEventsStyles = StyleSheet.create({
  auto: { pointerEvents: "auto" },
  none: { pointerEvents: "none" },
  boxNone: { pointerEvents: "box-none" },
  boxOnly: { pointerEvents: "box-only" },
});
