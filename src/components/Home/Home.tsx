import { Icon, IconName } from "@/icons";
import { homeStyles } from "@/styles/homeStyles";
import { Colors } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useState } from "react";
import { Pressable, Text, View, StyleSheet, Animated } from "react-native";
import { SettingsTab } from "../Modals/SettingsTab";
import { StatsTab } from "../Modals/StatsTab";
import { GamesTab } from "./GamesTab";
import { SplashHeader } from "./SplashHeader";

type TabName = "games" | "stats" | "settings";

function TabButton({
  iconName,
  label,
  isActive,
  onPress,
}: {
  iconName: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={homeStyles.tabButton} onPress={onPress}>
      <Icon
        name={iconName}
        color={isActive ? Colors.accentBlue : Colors.K100}
      />

      <Text
        style={[
          textStyles.default,
          { color: isActive ? Colors.accentBlue : Colors.K100 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName>("games");
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  return (
    <View style={homeStyles.container}>
      <SplashHeader onAnimationComplete={() => setIsAnimationComplete(true)}>
        {({ isLoaded, contentOpacity, tabTranslate }) => (
          <>
            {/* Content Area */}
            <View
              style={homeStyles.content}
              pointerEvents={isLoaded ? "auto" : "none"}
            >
              <Animated.View style={[{ flex: 1, opacity: contentOpacity }]}>
                {activeTab === "games" && <GamesTab />}
                {activeTab === "stats" && <StatsTab />}
                {activeTab === "settings" && <SettingsTab />}
              </Animated.View>
            </View>

            {/* Bottom Tab Bar */}
            <Animated.View
              style={[
                homeStyles.tabBar,
                {
                  opacity: contentOpacity,
                  transform: [{ translateY: tabTranslate }],
                },
              ]}
              pointerEvents={isLoaded ? "auto" : "none"}
            >
              <TabButton
                iconName="games"
                label="Games"
                isActive={activeTab === "games"}
                onPress={() => setActiveTab("games")}
              />
              <TabButton
                iconName="chart"
                label="Stats"
                isActive={activeTab === "stats"}
                onPress={() => setActiveTab("stats")}
              />
              <TabButton
                iconName="settings"
                label="Settings"
                isActive={activeTab === "settings"}
                onPress={() => setActiveTab("settings")}
              />
            </Animated.View>
          </>
        )}
      </SplashHeader>
    </View>
  );
}
