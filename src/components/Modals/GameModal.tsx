import { useGameSettings } from "@/hooks/useGameSettings";
import { SettingControl } from "../common/SettingControl";
import { modalStyles } from "@/styles/modalStyles";
import { textStyles } from "@/styles/textStyles";
import { usePathname } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import {
  calculateWinRate,
  getGameInfo,
  normalizeGamePath,
  type GameStats,
} from "../../data/game-menu";
import { Button } from "../Button/Button";
import ModalFull from "./ModalFull";
import { Colors, FontWeight } from "@/styles/styles";
import { flexStyles } from "@/styles/flexStyles";
import { Icon, IconName } from "@/icons";

export const EMPTY_STATS: GameStats = {
  attempts: 0,
  wins: 0,
  losses: 0,
};

interface ModalSectionProps {
  title?: string;
  iconName?: IconName;
  children: React.ReactNode;
}

const ModalSection = ({ children, title, iconName }: ModalSectionProps) => {
  return (
    <View
      style={[
        flexStyles.colCentered,
        flexStyles.fullWidth,
        flexStyles.gap20,
        {
          alignItems: "flex-start",
        },
      ]}
    >
      {(title || iconName) && (
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            {
              borderTopWidth: 1,
              borderTopColor: Colors.K800,
              paddingTop: 20,
            },
          ]}
        >
          {title && (
            <Text
              style={[
                flexStyles.flex1,
                {
                  fontFamily: FontWeight[500],
                  fontSize: 22,
                  color: Colors.K500,
                },
              ]}
            >
              {title}
            </Text>
          )}
          {iconName && <Icon name={iconName} size={32} color={Colors.K500} />}
        </View>
      )}

      {children}
    </View>
  );
};

type Props = {
  onClose: () => void;
};

export default function GameModal({ onClose }: Props) {
  const pathname = normalizeGamePath(usePathname());
  const info = getGameInfo(pathname);
  const { settings, updateSettings, isLoading } = useGameSettings(pathname);

  if (isLoading || settings === undefined) return null;

  const howToPlayText = info.howToPlay ?? info.briefRules;

  return (
    <>
      <ModalFull onClose={onClose} showHomeButton>
        {/* Scroll view */}
        <ScrollView
          contentContainerStyle={modalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View
            style={[
              flexStyles.colCentered,
              flexStyles.fullWidth,
              flexStyles.gap4,
              { alignItems: "flex-start" },
            ]}
          >
            <Text style={textStyles.h1}>{info.title}</Text>

            {/* By Line */}
            {info.byLine && (
              <Text style={modalStyles.byLine}>{info.byLine}</Text>
            )}
          </View>

          {/* Stats and favourite */}
          <View style={modalStyles.statsAndFav}>
            <View style={modalStyles.stats}>
              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Attempts</Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.attempts}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Wins</Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.wins}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Lost</Text>
                <Text style={modalStyles.statsTextValue}>
                  {settings.stats.losses}
                </Text>
              </View>

              <View style={modalStyles.stat}>
                <Text style={modalStyles.statsTextLabel}>Win rate</Text>
                <Text style={modalStyles.statsTextValue}>
                  {calculateWinRate(settings.stats)}
                </Text>
              </View>
            </View>

            <Button
              onPress={() =>
                updateSettings({ isFavorite: !settings.isFavorite })
              }
              iconName={settings.isFavorite ? "star" : "star-outline"}
              size="text"
              iconSize={42}
              iconColor={
                settings.isFavorite ? Colors.favoriteStar : Colors.accentBlue
              }
              style={{ borderWidth: 0, boxShadow: "unset" }}
            />
          </View>

          {info.about && (
            <ModalSection>
              {info.about.map((line) => (
                <Text key={line} style={modalStyles.aboutText}>
                  {line}
                </Text>
              ))}
            </ModalSection>
          )}

          <ModalSection title="How to Play" iconName="instructions">
            {howToPlayText.map((line) => (
              <Text key={line} style={modalStyles.rulesText}>
                {line}
              </Text>
            ))}
          </ModalSection>

          {/* <View style={[modalStyles.gameSettings]}>
            <Text style={textStyles.h4}>Game Settings</Text>
            <Text style={textStyles.default}>
              Setting changes apply to the next game
            </Text>

             <SettingControl
              label="Difficulty"
              value={settings.difficulty}
              type="string"
              options={[
                { label: "Easy", value: "easy" },
                { label: "Difficult", value: "difficult" },
              ]}
              onChange={(val) =>
                updateSettings({ difficulty: val as "easy" | "difficult" })
              }
            /> 

            <SettingControl
              label="Show intro"
              value={settings.showIntro}
              type="boolean"
              onChange={(val) => updateSettings({ showIntro: val })}
            />

            <SettingControl
              label="Show colored card interaction hints"
              value={settings.showCardHints}
              type="boolean"
              onChange={(val) => updateSettings({ showCardHints: val })}
            />
          </View> */}
        </ScrollView>

        {/* Play button */}
        {/* <View style={modalStyles.modalFooter}>
          <Button onPress={onClose} size="large" text="Play" fullWidth />
        </View> */}
      </ModalFull>
    </>
  );
}
