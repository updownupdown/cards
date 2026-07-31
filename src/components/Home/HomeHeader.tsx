import SoloSuiteLogo from "@/assets/images/SoloSuiteLogo.svg";
import { Button } from "@/components/Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HomeHeaderProps = {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
};

export function HomeHeader({ onOpenSearch, onOpenSettings }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { ui, spacing } = useResponsiveMetrics();

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
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          paddingTop: insets.top + spacing(layoutDims.pagePadding * 0.5),
          paddingBottom: spacing(layoutDims.pagePadding * 0.5),
          pointerEvents: "box-none",
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            {
              pointerEvents: "box-none",
              height: spacing(layoutDims.menuBarHeight),
              paddingLeft: spacing(layoutDims.pagePadding),
              paddingRight: spacing(layoutDims.pagePadding * 0.5),
            },
          ]}
        >
          <SoloSuiteLogo
            width={140}
            height={32}
            style={{
              marginRight: "auto",
              filter: `drop-shadow(1px 2px 4px rgba(0, 0, 0, 0.16))`,
            }}
          />

          <View style={[flexStyles.rowCentered]}>
            <Button
              headerButton
              iconName="search"
              onPress={onOpenSearch}
              style={[styles.headerBtn]}
              iconColor={rgba(Colors.white, 0.6)}
            />

            <Button
              headerButton
              size="xl"
              iconName="menu"
              onPress={onOpenSettings}
              style={[styles.headerBtn]}
              iconColor={rgba(Colors.white, 0.6)}
            />
          </View>
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
