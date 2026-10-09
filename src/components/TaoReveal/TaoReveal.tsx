import { RewardReveal } from "@/components/common/RewardReveal";
import { TaoChapterDetail } from "@/components/TaoCollection/TaoChapterDetail";
import { theme } from "@/styles/styles";
import { ImageBackground, StyleSheet, View } from "react-native";

type Props = {
  chapter: number;
  /** Just before the sky clears: the screen behind can change unseen. */
  onUncover?: () => void;
  onDone: () => void;
};

/**
 * The reveal of a newly earned Tao chapter: the night sky comes up over the
 * game, and on it the chapter's page from the Gallery, exactly as there
 * (its constellation forms, then the lines are read out one by one; a swipe
 * reads faster), in the app's own colours whatever the game's. See
 * RewardReveal for the button that closes it.
 */
export function TaoReveal({ chapter, onUncover, onDone }: Props) {
  return (
    <RewardReveal
      testID="tao-reveal"
      // Opaque even before the starfield image has loaded.
      backgroundColor="#05080e"
      palette={theme}
      backdrop={
        <>
          <ImageBackground
            source={require("../../../assets/images/starfield.webp")}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(6, 10, 18, 0.72)" },
            ]}
          />
        </>
      }
      onUncover={onUncover}
      onDone={onDone}
    >
      {(page) => (
        <TaoChapterDetail
          chapterNumber={chapter}
          collected
          width={page.width}
          height={page.height}
          topInset={page.topInset}
          bottomInset={page.bottomInset}
          onRead={page.onRead}
        />
      )}
    </RewardReveal>
  );
}
