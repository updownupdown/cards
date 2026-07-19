import { Image } from "expo-image";
import { ImageSourcePropType } from "react-native";
import { CardSizes } from "./CardStyles";
import { cardBackAssets, defaultCardBackName } from "./generated-card-backs";

type ImageLoadSource = Parameters<typeof Image.loadAsync>[0];
type LoadedImage = Awaited<ReturnType<typeof Image.loadAsync>>;

const CARD_SIZES = [
  "classic",
  "regular",
  "small",
  "small-colored",
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
  /^\.\/(?:classic|regular|small|small-colored|tableau)\/[^/]+\.png$/,
);

const cardFilesBySize = buildCardFilesBySize();

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

export function getCardBackAsset(filename?: string) {
  if (!filename) return cardBackAssets[defaultCardBackName];
  return cardBackAssets[filename] ?? cardBackAssets[defaultCardBackName];
}

export function isCardImageSetPreloaded(
  cardSize: CardSizes,
  customBack?: string,
) {
  return loadedImages.has(getPreloadKey(cardSize, customBack));
}

export function preloadCardImageSet(cardSize: CardSizes, customBack?: string) {
  const preloadKey = getPreloadKey(cardSize, customBack);
  const existing = preloadPromises.get(preloadKey);

  if (existing) return existing;

  const sources = [
    ...Object.values(getCardFilesForSize(cardSize)),
    getCardBackAsset(customBack),
  ];

  const promise = Promise.allSettled(
    sources.map((source) => Image.loadAsync(source as ImageLoadSource)),
  ).then((results) => {
    const loaded = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failedCount = results.length - loaded.length;

    loadedImages.set(preloadKey, loaded);

    if (failedCount > 0) {
      console.warn(
        `Failed to preload ${failedCount} card image${failedCount === 1 ? "" : "s"} for ${cardSize}.`,
      );
    }
  });

  preloadPromises.set(preloadKey, promise);
  return promise;
}

function getPreloadKey(cardSize: CardSizes, customBack?: string) {
  return `${cardSize}:${customBack ?? defaultCardBackName}`;
}

function buildCardFilesBySize() {
  const cardFiles = Object.fromEntries(
    CARD_SIZES.map((cardSize) => [cardSize, {}]),
  ) as Record<CardSizes, Record<string, ImageSourcePropType>>;

  for (const key of cardContext.keys()) {
    const match = key.match(/^\.\/([^/]+)\/([^/]+)\.png$/);
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
          .map((cardName) => `assets/cards/${cardSize}/${cardName}.png`)
          .join(", ")}`,
      );
    }

    if (unexpected.length > 0) {
      console.warn(
        `[CardAssets] Unexpected card image${unexpected.length === 1 ? "" : "s"} for cardSize "${cardSize}": ${unexpected
          .map((cardName) => `assets/cards/${cardSize}/${cardName}.png`)
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
    `[CardAssets] Missing card image for cardSize "${cardSize}" and card "${cardName}". Expected assets/cards/${cardSize}/${cardName}.png`,
  );
}
