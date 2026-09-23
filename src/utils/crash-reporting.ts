// Crash reporting through Sentry. See docs/crash-reporting-plan.md.
//
// One setup covers native and web: the SDK reports JavaScript errors and
// unhandled rejections everywhere, and native crashes and ANRs on Android.
// Performance tracing and session replay stay off - the app doesn't need them
// and replay would record the screen.
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import {
  DEFAULT_GLOBAL_SETTINGS,
  loadGlobalSettings,
  subscribeToGlobalSettings,
} from "@/data/game-menu";

const extra = Constants.expoConfig?.extra as
  | {
      sentryDsn?: string;
      sentryEnvironment?: string;
      // null when the build didn't set SENTRY_RELEASE.
      sentryRelease?: string | null;
    }
  | undefined;

/** Public project identifier. Empty (the default) turns crash reporting off. */
const DSN = extra?.sentryDsn ?? "";

/**
 * The "Send crash reports" setting, mirrored here because beforeSend runs
 * synchronously and the settings cache is native-only (and empty at startup).
 */
let isEnabledBySetting = DEFAULT_GLOBAL_SETTINGS.crashReports;

export function initCrashReporting() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    // Development errors are already on the console, and the red screen says
    // more than a Sentry issue would.
    enabled: !__DEV__,
    environment: extra?.sentryEnvironment ?? "development",
    // Left unset on native, where the SDK takes the release from the build.
    ...(extra?.sentryRelease ? { release: extra.sentryRelease } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: (event) => (isEnabledBySetting ? event : null),
  });

  // Settings load after init, so the first read applies the saved choice and
  // the subscription keeps up with later changes.
  void loadGlobalSettings()
    .then(({ crashReports }) => {
      isEnabledBySetting = crashReports;
    })
    .catch(() => {});

  subscribeToGlobalSettings(({ crashReports }) => {
    isEnabledBySetting = crashReports;
  });
}

/**
 * Which screen the player is on, so an event says which game it came from
 * without having to read the stack trace.
 */
export function setCrashContext(tags: {
  game?: string;
  mode?: string;
  language?: string;
}) {
  if (!DSN) return;
  Sentry.setTags(tags);
}

/** A short trail of recent moments, attached to whatever fails next. */
export function addGameBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
) {
  if (!DSN) return;
  Sentry.addBreadcrumb({ category: "game", level: "info", message, data });
}

export function reportCrash(error: unknown, context?: Record<string, unknown>) {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function reportMessage(
  message: string,
  context?: Record<string, unknown>,
) {
  if (!DSN) return;
  Sentry.captureMessage(message, context ? { extra: context } : undefined);
}

/** Wraps the root layout so native crashes and React errors are caught. */
export const withCrashReporting: typeof Sentry.wrap = (component) =>
  DSN ? Sentry.wrap(component) : component;
