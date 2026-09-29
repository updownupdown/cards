import { ChaptersView } from "@/components/Gallery/ChaptersView";
import { QuotesView } from "@/components/Gallery/QuotesView";
import { WorksView } from "@/components/Gallery/WorksView";
import { WorkViewer } from "@/components/Gallery/WorkViewer";
import { useBarSideInset, useGlassStyle } from "@/components/ui/FloatingBar";
import { QUOTE_COUNT, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import type { GameSettingsMap } from "@/data/game-menu";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Segmented } from "@/components/ui/Nocturne";
import { COLLECT_HOME_TAB_INDEX } from "./home-view-state";
import { useStarfield } from "./Starfield";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { useState } from "react";
import { View } from "react-native";

type GalleryView = "works" | "chapters" | "quotes";
const VIEWS: GalleryView[] = ["works", "chapters", "quotes"];

type GalleryTabProps = {
  allEnabledGames: HomeGameEntry[];
  settingsMap: GameSettingsMap;
  contentPaddingTop: number;
  contentPaddingBottom: number;
};

/**
 * Everything collected: the game art (Works), the Tao Te Ching (Chapters)
 * and the quotes, switched between at the top.
 */
export function GalleryTab({
  allEnabledGames,
  settingsMap,
  contentPaddingTop,
  contentPaddingBottom,
}: GalleryTabProps) {
  const { t } = useTranslation("home");
  const { spacing, ui } = useResponsiveMetrics();
  const { collectedTaoIds, collectedQuoteIds } = useCampaignProgress();
  const glass = useGlassStyle(18);
  const side = useBarSideInset();
  const [view, setView] = useState<GalleryView>("works");
  const starfield = useStarfield();
  const [switchHeight, setSwitchHeight] = useState(0);
  const [open, setOpen] = useState<{ path: string; order: string[] } | null>(
    null,
  );

  const hasWon = (path: string) => (settingsMap[path]?.stats?.wins ?? 0) > 0;
  const acquired = allEnabledGames.filter(([path]) => hasWon(path)).length;
  const counts: Record<GalleryView, string> = {
    works: `${acquired}/${allEnabledGames.length}`,
    chapters: `${collectedTaoIds.size}/${TAO_CHAPTER_COUNT}`,
    quotes: `${collectedQuoteIds.size}/${QUOTE_COUNT}`,
  };
  const belowSwitch = contentPaddingTop + switchHeight + spacing(16);

  return (
    <View style={{ flex: 1 }}>
      {view === "works" && (
        <WorksView
          allEnabledGames={allEnabledGames}
          hasWon={hasWon}
          onOpenWork={(path, order) => setOpen({ path, order })}
          contentPaddingTop={belowSwitch}
          contentPaddingBottom={contentPaddingBottom}
        />
      )}
      {view === "chapters" && (
        <ChaptersView collectedIds={collectedTaoIds} topInset={belowSwitch} />
      )}
      {view === "quotes" && (
        <QuotesView collectedIds={collectedQuoteIds} topInset={belowSwitch} />
      )}

      <View
        style={[
          pointerEventsStyles.boxNone,
          {
            position: "absolute",
            top: contentPaddingTop,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingHorizontal: side,
          },
        ]}
      >
        <View
          onLayout={(event) =>
            setSwitchHeight(Math.ceil(event.nativeEvent.layout.height))
          }
          style={[
            glass,
            {
              width: "100%",
              maxWidth: ui.contentMaxWidth - side * 2,
              padding: spacing(4),
            },
            // Round ends, like the choices inside.
            switchHeight > 0 && { borderRadius: switchHeight / 2 },
          ]}
        >
          <Segmented
            pill
            options={VIEWS.map((key) => ({
              value: key,
              label: t(`gallery.views.${key}`),
              detail: counts[key],
            }))}
            value={view}
            onChange={(key) => {
              setView(key);
              starfield?.resetScroll(COLLECT_HOME_TAB_INDEX);
            }}
            // The glass is the track here.
            style={{
              padding: 0,
              borderWidth: 0,
              backgroundColor: "transparent",
            }}
          />
        </View>
      </View>

      {open && (
        <WorkViewer
          path={open.path}
          collected={hasWon(open.path)}
          onClose={() => setOpen(null)}
          onStep={(step) => {
            const { order } = open;
            const index = order.indexOf(open.path);
            setOpen({
              path: order[(index + step + order.length) % order.length],
              order,
            });
          }}
        />
      )}
    </View>
  );
}
