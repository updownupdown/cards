import { CollectFrom } from "@/components/common/CollectFrom";
import { WorkPlaceholder } from "./shared";
import { Text } from "@/components/common/Text";
import { ZoomableImage } from "@/components/common/ZoomableImage";
import { StepperBar, useBarSideInset } from "@/components/ui/FloatingBar";
import { Kicker } from "@/components/ui/Nocturne";
import {
  GAME_FULL_THUMBNAIL_ASSETS,
  GAME_THUMBNAIL_ASPECTS,
} from "@/data/game-thumbnails";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { layoutDims, theme } from "@/styles/styles";
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
          {/* Above the game and the label, which the work grows over when
              zoomed. */}
          <View
            style={{
              flex: 1,
              zIndex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
            onLayout={(event) =>
              setArtBox({
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              })
            }
          >
            {collected && game.thumbnail
              ? artWidth > 0 && (
                  <ZoomableImage
                    key={path}
                    source={GAME_FULL_THUMBNAIL_ASSETS[game.thumbnail]}
                    width={artWidth}
                    height={artWidth / aspect}
                  />
                )
              : artWidth > 0 && (
                  <View style={{ alignItems: "center", gap: spacing(20) }}>
                    <WorkPlaceholder
                      // Room kept under it for the button below.
                      width={Math.min(
                        artBox.width * 0.7,
                        (artBox.height - spacing(80)) * aspect,
                      )}
                      height={
                        Math.min(
                          artBox.width * 0.7,
                          (artBox.height - spacing(80)) * aspect,
                        ) / aspect
                      }
                      iconSize={spacing(48)}
                      radius={spacing(4)}
                    />
                    <CollectFrom path={path} onLaunch={onClose} />
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
                  // Tall enough for the italic's descenders, which two
                  // clipped lines would otherwise cut off.
                  lineHeight: font(34),
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
                  fontSize: font(15.2),
                  lineHeight: font(19.2),
                }}
              >
                {[credit.artistName, credit.date].filter(Boolean).join(", ")}
              </Text>
              {credit.sourceName ? (
                <Kicker
                  color={theme.faint}
                  style={{
                    marginTop: spacing(4),
                    fontSize: font(8.8),
                    lineHeight: font(11),
                  }}
                >
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
