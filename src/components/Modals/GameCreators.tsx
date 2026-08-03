import { Text } from "@/components/common/Text";
import { CREATOR_LINKS, type GameCreator } from "@/data/game-creators";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { Linking, View } from "react-native";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { ModalHeading } from "./ModalFull";

type CreatorGroup = {
  creators: GameCreator[];
  games: string[];
};

function getCreatorGroups(): CreatorGroup[] {
  const groups = new Map<string, CreatorGroup>();

  for (const game of GAME_DEFINITIONS) {
    const creators = game.credits?.creators;
    if (!creators?.length) continue;

    const key = creators.join("\u0000");
    const group = groups.get(key) ?? {
      creators: [...creators],
      games: [],
    };

    group.games.push(game.title);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      games: group.games.sort((first, second) => first.localeCompare(second)),
    }))
    .filter((group) => group.creators[0] !== "Unknown")
    .sort((first, second) =>
      first.creators.join(", ").localeCompare(second.creators.join(", ")),
    );
}

const creatorGroups = getCreatorGroups();

export function GameCreators() {
  const { spacing } = useResponsiveMetrics();

  return (
    <View style={[flexStyles.colStart, flexStyles.fullWidth]}>
      <ModalHeading
        color={Colors.K200}
        title="Game Creators"
        iconName="attribution"
      />
      <View
        style={[
          flexStyles.colStart,
          { gap: spacing(20), marginTop: spacing(20) },
        ]}
      >
        {creatorGroups.map((group) => {
          const creatorNames = group.creators.join(", ");

          return (
            <View key={creatorNames} style={[flexStyles.colStart]}>
              <View style={[flexStyles.rowStart, { flexWrap: "wrap" }]}>
                {group.creators.map((creator, index) => {
                  const creatorLink = CREATOR_LINKS[creator];

                  return (
                    <View key={creator} style={flexStyles.rowStart}>
                      <Text
                        size="md"
                        weight={500}
                        color={creatorLink ? Colors.accentBlue : Colors.K200}
                        onPress={
                          creatorLink
                            ? () => void Linking.openURL(creatorLink)
                            : undefined
                        }
                      >
                        {creator}
                      </Text>
                      {index !== group.creators.length - 1 && (
                        <Text size="md">{", "}</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              <Text size="sm" weight={300} color={Colors.K400}>
                {group.games.join(", ")}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
