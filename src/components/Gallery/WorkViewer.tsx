import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { ZoomableImage } from "@/components/common/ZoomableImage";
import { gameArt, useGameCategory } from "@/components/Home/HomeArt";
import {
  StepperBar,
  useBarSideInset,
  useGlassStyle,
} from "@/components/ui/FloatingBar";
import { ActionButton, Kicker } from "@/components/ui/Nocturne";
import {
  GAME_FULL_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { layoutDims, rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { useState } from "react";
import { Modal, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A work up close, over everything (the tabs too): the game it belongs to at
 * the top, the painting to zoom into, its label, and a bar at the foot to
 * step between works or close. Playing the game closes it.
 */
export function WorkViewer({
  path,
  collected,
  onClose,
  onStep,
}: {
  path: string;
  collected: boolean;
  onClose: () => void;
  onStep: (step: 1 | -1) => void;
}) {
  const { spacing, font, ui } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("home");
  const language = useDisplayLanguage();
  const game = GAMES_DATA[path];
  const credit = game.thumbnailCredit;
  const [artBox, setArtBox] = useState({ width: 0, height: 0 });
  const aspect = game.thumbnail ? GAME_THUMBNAIL_ASPECTS[game.thumbnail] : 0.8;
  const artWidth = Math.min(artBox.width, artBox.height * aspect);
  const barInset = useBarSideInset();
  // Clear the bar at the foot, which takes the tab bar's place, with room
  // to spare under the label.
  const bottomReserve =
    insets.bottom +
    spacing(layoutDims.tabBarHeight + layoutDims.pagePadding + 16);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* A native Modal is its own root, so its gestures need their own
          GestureHandlerRootView. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.night }}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: ui.contentMaxWidth,
            alignSelf: "center",
            paddingTop: insets.top + barInset,
            paddingBottom: bottomReserve,
            paddingLeft: insets.left + barInset,
            paddingRight: insets.right + barInset,
            gap: spacing(16),
          }}
        >
          <WorkGamePanel
            path={path}
            onPlay={() => {
              onClose();
              launchGame(path as Href);
            }}
          />

          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            onLayout={(event) =>
              setArtBox({
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              })
            }
          >
            {collected && game.thumbnail ? (
              artWidth > 0 && (
                <ZoomableImage
                  key={path}
                  source={GAME_FULL_THUMBNAIL_ASSETS[game.thumbnail]}
                  width={artWidth}
                  height={artWidth / aspect}
                />
              )
            ) : (
              <View
                style={{
                  width: "70%",
                  aspectRatio: aspect,
                  maxHeight: "100%",
                  borderRadius: spacing(4),
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: rgba(theme.ink, 0.15),
                  alignItems: "center",
                  justifyContent: "center",
                  padding: spacing(20),
                }}
              >
                <Text
                  serif
                  italic
                  size="lg"
                  color={theme.dim}
                  style={{ textAlign: "center" }}
                >
                  {t("gallery.uncollected", {
                    game: localizeGameTitle(game, path, language),
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* The work's label. */}
          {collected && credit ? (
            <View
              style={{
                alignItems: "center",
                gap: spacing(2),
                paddingHorizontal: spacing(12),
              }}
            >
              <Text
                serif
                italic
                style={{
                  textAlign: "center",
                  fontSize: font(25),
                  lineHeight: font(30),
                }}
                numberOfLines={2}
              >
                {credit.title || localizeGameTitle(game, path, language)}
              </Text>
              <Text
                serif
                color={theme.dim}
                style={{
                  textAlign: "center",
                  fontSize: font(19),
                  lineHeight: font(24),
                }}
              >
                {[credit.artistName, credit.date].filter(Boolean).join(", ")}
              </Text>
              {credit.sourceName ? (
                <Kicker color={theme.faint} style={{ marginTop: spacing(4) }}>
                  {credit.sourceName}
                </Kicker>
              ) : null}
            </View>
          ) : null}
        </View>

        <StepperBar
          placement="tabBar"
          action={{
            iconName: "arrow-back",
            label: t("gallery.back"),
            onPress: onClose,
          }}
          onPrevious={() => onStep(-1)}
          onNext={() => onStep(1)}
          previousLabel={t("gallery.previous")}
          nextLabel={t("gallery.next")}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

/** The work's game, in one line: its art, name and family, and Play. */
function WorkGamePanel({ path, onPlay }: { path: string; onPlay: () => void }) {
  const { spacing } = useResponsiveMetrics();
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();
  const category = useGameCategory();
  const glass = useGlassStyle();
  const game = GAMES_DATA[path];
  const thumb = spacing(44);
  return (
    <View
      style={[
        glass,
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing(12),
          padding: spacing(10),
          paddingRight: spacing(12),
        },
      ]}
    >
      <Image
        source={gameArt(game)}
        cachePolicy="memory"
        contentFit="cover"
        style={{
          width: thumb,
          height: thumb,
          borderRadius: spacing(12),
          backgroundColor: game.gameColorDark,
        }}
      />
      {/* The game's name is left to the label and the art: only its family. */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="md" weight={400} color={theme.dim} numberOfLines={1}>
          {category(game)}
        </Text>
      </View>
      <ActionButton
        small
        iconName="play"
        label={tCommon("play")}
        onPress={onPlay}
      />
    </View>
  );
}
