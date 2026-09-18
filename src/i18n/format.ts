import { i18n } from "./index";
import { isAppLanguage, SOURCE_LANGUAGE } from "./languages";

// Numbers follow the display language: English writes "45%", French "45 %".
// The pseudo-locale is not a real BCP 47 tag, so it formats as English.

const percentFormatters = new Map<string, Intl.NumberFormat>();

function percentFormatter(language: string) {
  const cached = percentFormatters.get(language);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat(language, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  percentFormatters.set(language, formatter);
  return formatter;
}

/** A fraction (0 to 1) as a percentage in the display language. */
export function formatPercent(fraction: number) {
  const language = isAppLanguage(i18n.language)
    ? i18n.language
    : SOURCE_LANGUAGE;
  return percentFormatter(language).format(fraction);
}
