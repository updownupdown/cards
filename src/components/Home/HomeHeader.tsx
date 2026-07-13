import SoloSuiteLogo from "@/assets/images/SoloSuiteLogo.svg";
import { Button } from "@/components/Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { Colors, HomePadding, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HomeHeaderProps = {
  contentMaxWidth: number;
  pageSidePadding: number;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
};

export function HomeHeader({
  contentMaxWidth,
  pageSidePadding,
  onOpenSearch,
  onOpenSettings,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();

  const headerOffsetTop = insets.top + spacing(HomePadding * 0.5);
  const headerHeight = ui.gameHeaderHeight;

  return (
    <View
      style={{
        position: Platform.OS === "web" ? "fixed" : "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 8,
        pointerEvents: "box-none",
      }}
    >
      <LinearGradient
        colors={[
          rgba(Colors.background, 1),
          rgba(Colors.background, 0.8),
          rgba(Colors.background, 0),
        ]}
        start={{ x: 0.5, y: 0.8 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      <View
        style={{
          width: "100%",
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          paddingTop: headerOffsetTop,
          paddingBottom: spacing(HomePadding * 0.5),
          pointerEvents: "box-none",
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              pointerEvents: "box-none",
              height: headerHeight,
              paddingLeft: spacing(HomePadding),
              paddingRight: spacing(HomePadding * 0.5),
            },
          ]}
        >
          <SoloSuiteLogo
            width={140}
            height={32}
            style={{ marginRight: "auto" }}
          />

          <Button
            iconName="search"
            onPress={onOpenSearch}
            style={[styles.headerBtn, menuStyles.headerButton]}
          />

          <Button
            iconName="settings"
            onPress={onOpenSettings}
            style={[styles.headerBtn, menuStyles.headerButton]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    backgroundColor: "unset",
    boxShadow: "unset",
    paddingHorizontal: 12,
  },
});
