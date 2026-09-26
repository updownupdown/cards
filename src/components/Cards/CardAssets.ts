import { Image } from "expo-image";
import { ImageSourcePropType, Platform } from "react-native";
import { CardSizes } from "./CardStyles";
import { DEFAULT_CARD_BACK } from "@/data/card-backs";

type ImageLoadSource = Parameters<typeof Image.loadAsync>[0];
type LoadedImage = Awaited<ReturnType<typeof Image.loadAsync>>;

const CARD_SIZES = [
  "classic",
  "regular",
  "small",
  "tableau",
] as const satisfies readonly CardSizes[];
const CARD_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;
const CARD_SUITS = ["C", "D", "H", "S"] as const;
const EXPECTED_CARD_NAMES = [
  ...CARD_RANKS.flatMap((rank) => CARD_SUITS.map((suit) => `${rank}${suit}`)),
  ...CARD_SUITS.map((suit) => `Joker${suit}`),
];

const cardContext = require.context(
  "../../../assets/cards",
  true,
  /^\.\/(?:classic|regular|small|small-colored|tableau)\/[^/]+\.webp$/,
);
const cardBackContext = require.context(
  "../../../assets/cards/backs",
  false,
  /^\.\/[^/]+\.webp$/,
);

const cardFilesBySize = buildCardFilesBySize();
const cardBackFiles = buildCardBackFiles();

const preloadPromises = new Map<string, Promise<void>>();
const loadedImages = new Map<string, LoadedImage[]>();
const loggedMissingCards = new Set<string>();

export function getCardFilesForSize(cardSize?: CardSizes) {
  return cardFilesBySize[cardSize ?? "regular"];
}

export function getCardImageSource(
  cardSize: CardSizes | undefined,
  cardName: string,
) {
  const resolvedCardSize = cardSize ?? "regular";
  const source = getCardFilesForSize(resolvedCardSize)[cardName];

  if (!source) {
    logMissingCardImage(resolvedCardSize, cardName);
  }

  return source;
}

/** `cardBackKey` is a card-back ink, lowercased (see src/data/card-backs.ts). */
export function getCardBackImage(cardBackKey?: string) {
  return (
    cardBackFiles[cardBackKey ?? ""] ??
    cardBackFiles[DEFAULT_CARD_BACK.toLowerCase()]
  );
}

export function isCardImageSetPreloaded(
  cardSize: CardSizes,
  cardBackPath?: string,
) {
  return (
    loadedImages.has(getFacesPreloadKey(cardSize)) &&
    loadedImages.has(getBackPreloadKey(cardBackPath))
  );
}

export function preloadCardImageSet(
  cardSize: CardSizes,
  cardBackPath?: string,
) {
  // Faces are shared by every game with this card size, so they're decoded
  // (and held in memory) once per size rather than once per game; only the
  // back differs between games.
  return Promise.all([
    preloadImages(
      getFacesPreloadKey(cardSize),
      Object.values(getCardFilesForSize(cardSize)),
      cardSize,
    ),
    preloadImages(
      getBackPreloadKey(cardBackPath),
      [getCardBackImage(cardBackPath)],
      "card back",
    ),
  ]).then(() => undefined);
}

function preloadImages(
  preloadKey: string,
  sources: ImageSourcePropType[],
  label: string,
) {
  const existing = preloadPromises.get(preloadKey);

  if (existing) return existing;

  const promise = Promise.allSettled(
    sources.map((source) => Image.loadAsync(source as ImageLoadSource)),
  ).then((results) => {
    const loaded = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failedCount = results.length - loaded.length;

    // On native, card views decode their own copies at the size they're shown,
    // so these full-size decodes only confirm the images are ready. Holding on
    // to them kept every card size and every visited game's back in memory for
    // the whole session (over 400 MB after a dozen games), so release them.
    if (Platform.OS !== "web") {
      loaded.forEach((image) => image.release());
    }
    loadedImages.set(preloadKey, Platform.OS === "web" ? loaded : []);

    if (failedCount > 0) {
      console.warn(
        `Failed to preload ${failedCount} card image${failedCount === 1 ? "" : "s"} for ${label}.`,
      );
    }
  });

  preloadPromises.set(preloadKey, promise);
  return promise;
}

function getFacesPreloadKey(cardSize: CardSizes) {
  return `faces:${cardSize}`;
}

function getBackPreloadKey(cardBackPath?: string) {
  return `back:${cardBackPath ?? "default"}`;
}

function buildCardBackFiles() {
  const cardBackFiles: Record<string, ImageSourcePropType> = {};

  for (const key of cardBackContext.keys()) {
    const fileName = key.match(/^\.\/([^/]+)\.webp$/)?.[1];
    if (!fileName) continue;

    cardBackFiles[fileName] = cardBackContext(key) as ImageSourcePropType;
  }

  return cardBackFiles;
}

function buildCardFilesBySize() {
  const cardFiles = Object.fromEntries(
    CARD_SIZES.map((cardSize) => [cardSize, {}]),
  ) as Record<CardSizes, Record<string, ImageSourcePropType>>;

  for (const key of cardContext.keys()) {
    const match = key.match(/^\.\/([^/]+)\/([^/]+)\.webp$/);
    if (!match) continue;

    const [, folder, cardName] = match;
    if (!isCardSize(folder)) continue;

    cardFiles[folder][cardName] = cardContext(key) as ImageSourcePropType;
  }

  validateCardFiles(cardFiles);

  return cardFiles;
}

function isCardSize(value: string): value is CardSizes {
  return CARD_SIZES.includes(value as CardSizes);
}

function validateCardFiles(
  cardFiles: Record<CardSizes, Record<string, ImageSourcePropType>>,
) {
  const expectedCards = new Set(EXPECTED_CARD_NAMES);

  for (const cardSize of CARD_SIZES) {
    const cardNames = Object.keys(cardFiles[cardSize]);
    const missing = EXPECTED_CARD_NAMES.filter(
      (cardName) => !cardFiles[cardSize][cardName],
    );
    const unexpected = cardNames.filter(
      (cardName) => !expectedCards.has(cardName),
    );

    if (missing.length > 0) {
      console.error(
        `[CardAssets] Missing ${missing.length} card image${missing.length === 1 ? "" : "s"} for cardSize "${cardSize}": ${missing
          .map((cardName) => `assets/cards/${cardSize}/${cardName}.webp`)
          .join(", ")}`,
      );
    }

    if (unexpected.length > 0) {
      console.warn(
        `[CardAssets] Unexpected card image${unexpected.length === 1 ? "" : "s"} for cardSize "${cardSize}": ${unexpected
          .map((cardName) => `assets/cards/${cardSize}/${cardName}.webp`)
          .join(", ")}`,
      );
    }
  }
}

function logMissingCardImage(cardSize: CardSizes, cardName: string) {
  const key = `${cardSize}:${cardName}`;
  if (loggedMissingCards.has(key)) return;

  loggedMissingCards.add(key);
  console.error(
    `[CardAssets] Missing card image for cardSize "${cardSize}" and card "${cardName}". Expected assets/cards/${cardSize}/${cardName}.webp`,
  );
}
