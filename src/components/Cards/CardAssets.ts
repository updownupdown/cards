import { Image } from "expo-image";
import { ImageSourcePropType, Platform } from "react-native";
import { CardSizes } from "./CardStyles";
import { DEFAULT_CARD_BACK } from "@/data/card-backs";

type ImageLoadSource = Parameters<typeof Image.loadAsync>[0];

const CARD_SIZES = [
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
  /^\.\/(?:regular|small|small-colored|tableau)\/[^/]+\.webp$/,
);
const cardBackContext = require.context(
  "../../../assets/cards/backs",
  false,
  /^\.\/[^/]+\.webp$/,
);

const cardFilesBySize = buildCardFilesBySize();
const cardBackFiles = buildCardBackFiles();

const preloadPromises = new Map<string, Promise<void>>();
// On web, the preloaded images themselves, kept so they stay decoded.
const loadedImages = new Map<string, unknown[]>();
// On web, each preloaded image's in-memory copy, by the image's own URL.
const webSources = new Map<string, ImageSourcePropType>();
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

  return inMemory(source);
}

/** `cardBackKey` is a card-back ink, lowercased (see src/data/card-backs.ts). */
export function getCardBackImage(cardBackKey?: string) {
  return inMemory(getCardBackFile(cardBackKey));
}

function getCardBackFile(cardBackKey?: string) {
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
      [getCardBackFile(cardBackPath)],
      "card back",
    ),
  ]).then(() => undefined);
}

/**
 * On web, fetches and decodes every card face and back in the background, so
 * no game ever waits on the network for a card. On native the images ship in
 * the app, so there's nothing to download; each game decodes its own set as
 * it opens.
 */
export function preloadAllCardImagesOnWeb() {
  if (Platform.OS !== "web") return;

  for (const cardSize of CARD_SIZES) {
    preloadImages(
      getFacesPreloadKey(cardSize),
      Object.values(getCardFilesForSize(cardSize)),
      cardSize,
    );
  }
  for (const [cardBackKey, source] of Object.entries(cardBackFiles)) {
    preloadImages(getBackPreloadKey(cardBackKey), [source], "card back");
  }
}

function preloadImages(
  preloadKey: string,
  sources: ImageSourcePropType[],
  label: string,
) {
  const existing = preloadPromises.get(preloadKey);

  if (existing) return existing;

  const promise = Promise.allSettled(
    sources.map((source) =>
      Platform.OS === "web"
        ? loadWebImage(source)
        : Image.loadAsync(source as ImageLoadSource),
    ),
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
      loaded.forEach((image) => (image as { release(): void }).release());
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

/**
 * Fetches a card image once and keeps it in memory as a blob, decoded, for
 * every card showing it (see getCardImageSource). Cards drew from the image's
 * own URL before, which the browser asked the server for again the first time
 * each face turned up in play (every time with no cache, as locally, and once
 * solitarius.app's ten minute cache ran out), an empty outline until it came.
 */
async function loadWebImage(source: ImageSourcePropType) {
  const uri = getSourceUri(source);
  if (!uri) throw new Error("Card image has no uri");

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Card image request failed: ${response.status}`);
  }
  const blobUri = URL.createObjectURL(await response.blob());
  const image = new window.Image();
  image.src = blobUri;
  await image.decode();
  webSources.set(uri, { uri: blobUri });
  return image;
}

function getSourceUri(source: ImageSourcePropType | undefined) {
  return typeof source === "object" && source !== null && "uri" in source
    ? source.uri
    : undefined;
}

/** On web, the in-memory copy of a preloaded image, else the image itself. */
function inMemory<T extends ImageSourcePropType | undefined>(source: T): T {
  if (Platform.OS !== "web") return source;
  const uri = getSourceUri(source);
  return ((uri && webSources.get(uri)) || source) as T;
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
