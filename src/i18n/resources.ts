import enCards from "@/locales/en/cards.json";
import enCommon from "@/locales/en/common.json";
import enGame from "@/locales/en/game.json";
import enGames from "@/locales/en/games.json";
import enHome from "@/locales/en/home.json";
import enNodes from "@/locales/en/nodes.json";
import enPrivacy from "@/locales/en/privacy.json";
import enSettings from "@/locales/en/settings.json";
import esCards from "@/locales/es/cards.json";
import esCommon from "@/locales/es/common.json";
import esGame from "@/locales/es/game.json";
import esGames from "@/locales/es/games.json";
import esHome from "@/locales/es/home.json";
import esNodes from "@/locales/es/nodes.json";
import esPrivacy from "@/locales/es/privacy.json";
import esSettings from "@/locales/es/settings.json";
import frCards from "@/locales/fr/cards.json";
import frCommon from "@/locales/fr/common.json";
import frGame from "@/locales/fr/game.json";
import frGames from "@/locales/fr/games.json";
import frHome from "@/locales/fr/home.json";
import frNodes from "@/locales/fr/nodes.json";
import frPrivacy from "@/locales/fr/privacy.json";
import frSettings from "@/locales/fr/settings.json";
import idCards from "@/locales/id/cards.json";
import idCommon from "@/locales/id/common.json";
import idGame from "@/locales/id/game.json";
import idGames from "@/locales/id/games.json";
import idHome from "@/locales/id/home.json";
import idNodes from "@/locales/id/nodes.json";
import idPrivacy from "@/locales/id/privacy.json";
import idSettings from "@/locales/id/settings.json";
import itCards from "@/locales/it/cards.json";
import itCommon from "@/locales/it/common.json";
import itGame from "@/locales/it/game.json";
import itGames from "@/locales/it/games.json";
import itHome from "@/locales/it/home.json";
import itNodes from "@/locales/it/nodes.json";
import itPrivacy from "@/locales/it/privacy.json";
import itSettings from "@/locales/it/settings.json";
import ptCards from "@/locales/pt/cards.json";
import ptCommon from "@/locales/pt/common.json";
import ptGame from "@/locales/pt/game.json";
import ptGames from "@/locales/pt/games.json";
import ptHome from "@/locales/pt/home.json";
import ptNodes from "@/locales/pt/nodes.json";
import ptPrivacy from "@/locales/pt/privacy.json";
import ptSettings from "@/locales/pt/settings.json";
import trCards from "@/locales/tr/cards.json";
import trCommon from "@/locales/tr/common.json";
import trGame from "@/locales/tr/game.json";
import trGames from "@/locales/tr/games.json";
import trHome from "@/locales/tr/home.json";
import trNodes from "@/locales/tr/nodes.json";
import trPrivacy from "@/locales/tr/privacy.json";
import trSettings from "@/locales/tr/settings.json";
import type { AppLanguage } from "./languages";

// UI text, one JSON file per language and namespace. English is edited by
// hand; see docs/localization-plan.md for how the other languages are made.
// `cards` holds text shared by several games; `games` holds each game's own.

export const NAMESPACES = [
  "cards",
  "common",
  "game",
  "games",
  "home",
  "nodes",
  "privacy",
  "settings",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

const EN = {
  cards: enCards,
  common: enCommon,
  game: enGame,
  games: enGames,
  home: enHome,
  nodes: enNodes,
  privacy: enPrivacy,
  settings: enSettings,
};

export const RESOURCES: Record<AppLanguage, Record<Namespace, object>> & {
  en: typeof EN;
} = {
  en: EN,
  fr: {
    cards: frCards,
    common: frCommon,
    game: frGame,
    games: frGames,
    home: frHome,
    nodes: frNodes,
    privacy: frPrivacy,
    settings: frSettings,
  },
  es: {
    cards: esCards,
    common: esCommon,
    game: esGame,
    games: esGames,
    home: esHome,
    nodes: esNodes,
    privacy: esPrivacy,
    settings: esSettings,
  },
  id: {
    cards: idCards,
    common: idCommon,
    game: idGame,
    games: idGames,
    home: idHome,
    nodes: idNodes,
    privacy: idPrivacy,
    settings: idSettings,
  },
  it: {
    cards: itCards,
    common: itCommon,
    game: itGame,
    games: itGames,
    home: itHome,
    nodes: itNodes,
    privacy: itPrivacy,
    settings: itSettings,
  },
  pt: {
    cards: ptCards,
    common: ptCommon,
    game: ptGame,
    games: ptGames,
    home: ptHome,
    nodes: ptNodes,
    privacy: ptPrivacy,
    settings: ptSettings,
  },
  tr: {
    cards: trCards,
    common: trCommon,
    game: trGame,
    games: trGames,
    home: trHome,
    nodes: trNodes,
    privacy: trPrivacy,
    settings: trSettings,
  },
};
