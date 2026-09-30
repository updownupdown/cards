import { Button } from "@/components/Button/Button";
import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { GAMES_DATA } from "@/data/games-registry";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { usePalette } from "@/styles/palette";
import { FontWeight, rgba } from "@/styles/styles";
import type { Href } from "expo-router";

/**
 * A "Win <game> to collect" button under something not collected yet, the
 * game's name in bold, which starts the game. A Tao chapter or quote only
 * comes from a Campaign win, so for those the game starts in Campaign mode
 * once it is unlocked on the map.
 */
export function CollectFrom({
  path,
  campaign = false,
  onLaunch,
}: {
  path: string;
  campaign?: boolean;
  /** Called as the game starts (a viewer can close). */
  onLaunch?: () => void;
}) {
  const { t } = useTranslation("common");
  const theme = usePalette();
  const language = useDisplayLanguage();
  const { unlockedPaths } = useCampaignProgress();
  const game = GAMES_DATA[path];
  if (!game) return null;
  const play = () => {
    onLaunch?.();
    if (campaign && unlockedPaths.has(path)) {
      void setLastPlayedGameDot(path);
      launchGame({ pathname: path, params: { mode: "campaign" } } as Href);
    } else {
      launchGame(path as Href);
    }
  };

  // The game's name is marked **bold** in the translation.
  const label = t("winToCollect", {
    game: localizeGameTitle(game, path, language),
  })
    .split("**")
    .map((part, index) =>
      index % 2 === 1 ? (
        <Text key={index} weight={600} color={theme.sky}>
          {part}
        </Text>
      ) : (
        part
      ),
    );

  return (
    <Button
      text={label}
      size="sm"
      onPress={play}
      halfTaller
      style={{ alignSelf: "center" }}
      textStyle={{
        fontFamily: FontWeight[400],
        color: rgba(theme.sky, 0.75),
      }}
    />
  );
}
