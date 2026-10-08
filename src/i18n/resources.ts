import enCards from "@/locales/en/cards.json";
import enCommon from "@/locales/en/common.json";
import enGame from "@/locales/en/game.json";
import enGames from "@/locales/en/games.json";
import enHome from "@/locales/en/home.json";
import enCampaign from "@/locales/en/campaign.json";
import enPrivacy from "@/locales/en/privacy.json";
import enSettings from "@/locales/en/settings.json";
import esCards from "@/locales/es/cards.json";
import esCommon from "@/locales/es/common.json";
import esGame from "@/locales/es/game.json";
import esGames from "@/locales/es/games.json";
import esHome from "@/locales/es/home.json";
import esCampaign from "@/locales/es/campaign.json";
import esPrivacy from "@/locales/es/privacy.json";
import esSettings from "@/locales/es/settings.json";
import frCards from "@/locales/fr/cards.json";
import frCommon from "@/locales/fr/common.json";
import frGame from "@/locales/fr/game.json";
import frGames from "@/locales/fr/games.json";
import frHome from "@/locales/fr/home.json";
import frCampaign from "@/locales/fr/campaign.json";
import frPrivacy from "@/locales/fr/privacy.json";
import frSettings from "@/locales/fr/settings.json";
import idCards from "@/locales/id/cards.json";
import idCommon from "@/locales/id/common.json";
import idGame from "@/locales/id/game.json";
import idGames from "@/locales/id/games.json";
import idHome from "@/locales/id/home.json";
import idCampaign from "@/locales/id/campaign.json";
import idPrivacy from "@/locales/id/privacy.json";
import idSettings from "@/locales/id/settings.json";
import itCards from "@/locales/it/cards.json";
import itCommon from "@/locales/it/common.json";
import itGame from "@/locales/it/game.json";
import itGames from "@/locales/it/games.json";
import itHome from "@/locales/it/home.json";
import itCampaign from "@/locales/it/campaign.json";
import itPrivacy from "@/locales/it/privacy.json";
import itSettings from "@/locales/it/settings.json";
import ptCards from "@/locales/pt/cards.json";
import ptCommon from "@/locales/pt/common.json";
import ptGame from "@/locales/pt/game.json";
import ptGames from "@/locales/pt/games.json";
import ptHome from "@/locales/pt/home.json";
import ptCampaign from "@/locales/pt/campaign.json";
import ptPrivacy from "@/locales/pt/privacy.json";
import ptSettings from "@/locales/pt/settings.json";
import trCards from "@/locales/tr/cards.json";
import trCommon from "@/locales/tr/common.json";
import trGame from "@/locales/tr/game.json";
import trGames from "@/locales/tr/games.json";
import trHome from "@/locales/tr/home.json";
import trCampaign from "@/locales/tr/campaign.json";
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
  "campaign",
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
  campaign: enCampaign,
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
    campaign: frCampaign,
    privacy: frPrivacy,
    settings: frSettings,
  },
  es: {
    cards: esCards,
    common: esCommon,
    game: esGame,
    games: esGames,
    home: esHome,
    campaign: esCampaign,
    privacy: esPrivacy,
    settings: esSettings,
  },
  id: {
    cards: idCards,
    common: idCommon,
    game: idGame,
    games: idGames,
    home: idHome,
    campaign: idCampaign,
    privacy: idPrivacy,
    settings: idSettings,
  },
  it: {
    cards: itCards,
    common: itCommon,
    game: itGame,
    games: itGames,
    home: itHome,
    campaign: itCampaign,
    privacy: itPrivacy,
    settings: itSettings,
  },
  pt: {
    cards: ptCards,
    common: ptCommon,
    game: ptGame,
    games: ptGames,
    home: ptHome,
    campaign: ptCampaign,
    privacy: ptPrivacy,
    settings: ptSettings,
  },
  tr: {
    cards: trCards,
    common: trCommon,
    game: trGame,
    games: trGames,
    home: trHome,
    campaign: trCampaign,
    privacy: trPrivacy,
    settings: trSettings,
  },
};
