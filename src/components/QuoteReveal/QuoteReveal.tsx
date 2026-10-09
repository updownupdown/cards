import { RewardReveal } from "@/components/common/RewardReveal";
import { QuoteDetail } from "@/components/Gallery/QuoteDetail";
import { getQuote, type QuoteId } from "@/data/collectibles";
import { getQuoteAuthor } from "@/data/quote-authors";
import { rgba } from "@/styles/styles";
import { useEffect } from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";

type Props = {
  quoteId: QuoteId;
  /** The game's background and colour, redrawn over the game's UI. */
  background: ImageSourcePropType;
  overlayColor: string;
  /** Just before the scene clears: the screen behind can change unseen. */
  onUncover?: () => void;
  onDone: () => void;
};

const OVERLAY_OPACITY = 0.86;

/**
 * The reveal of a newly earned quote. The game's own background is redrawn
 * over its UI with a stronger overlay, so the board and buttons fade away
 * and only the scenery stays; on it, the quote's page from the Gallery,
 * exactly as there (the quote fades in whole, then its author's portrait is
 * drawn), in the game's own colours. See RewardReveal for the button that
 * closes it.
 */
export function QuoteReveal({
  quoteId,
  background,
  overlayColor,
  onUncover,
  onDone,
}: Props) {
  const quote = getQuote(quoteId);
  const author = quote ? getQuoteAuthor(quote.author) : undefined;

  // Without its quote or author there is nothing to reveal.
  const missing = !quote || !author;
  useEffect(() => {
    if (missing) onDone();
  }, [missing, onDone]);
  if (!quote || !author) return null;

  return (
    <RewardReveal
      testID="quote-reveal"
      // Opaque even before the image has loaded, so the UI never shows.
      backgroundColor={overlayColor}
      backdrop={
        <>
          <ImageBackground
            source={background}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: rgba(overlayColor, OVERLAY_OPACITY) },
            ]}
          />
        </>
      }
      onUncover={onUncover}
      onDone={onDone}
    >
      {(page) => (
        <QuoteDetail
          author={author}
          quoteId={quoteId}
          collected
          topInset={page.topInset}
          bottomInset={page.bottomInset}
          onRead={page.onRead}
        />
      )}
    </RewardReveal>
  );
}
