# Crash Reporting Plan

Status: implemented on 2026-09-21, except for the source-map auth token and
the on-device verification. See "What's left" at the end.

## Why

Release builds report nothing. Solitarius already notices when a game launch never settled: `consumeInterruptedGameLaunch` in `src/data/game-menu.ts` catches it, so the next launch doesn't resume into a crash loop. But nobody learns which game crashed or why. Crash reporting sends that information to a dashboard.

## Recommendation: Sentry

Use `@sentry/react-native`, which has an Expo config plugin and an official Expo guide.

- **What it captures:**
  - JavaScript errors and unhandled promise rejections;
  - native crashes in Java, Kotlin and C++;
  - app-not-responding freezes (ANRs);
  - crash-free session and user rates for each release.
- **Readable stack traces:** it uploads source maps during release builds, so traces from the minified Hermes bundle point to the original TypeScript lines.
- **Cost:** a free plan exists for a single developer. Check the current error quota when signing up.

Alternatives:

- **Firebase Crashlytics:** free, but needs a Firebase project, `google-services.json` and `@react-native-firebase`. JavaScript errors have to be recorded by hand, and Hermes stack traces are less readable.
- **BugSnag:** similar to Sentry, but its paid plans are more restrictive.
- **EAS Insights:** usage metrics only, no crash reporting.

## How it works

1. `Sentry.init` runs at startup and installs handlers: the global JavaScript error handler, a promise rejection tracker, native crash handlers and an ANR watchdog.
2. When something fails, the SDK builds an event containing:
   - the error and its stack trace;
   - device model, OS version and app version;
   - breadcrumbs, a short trail of recent events such as screen changes and custom game events.
3. Events are saved on the device first. JavaScript errors are sent right away. A native crash kills the process, so its report is sent on the next launch.
4. Sentry matches stack traces to the uploaded source maps, groups identical failures into issues, emails you about new issues, and tracks crash-free rates by release.

## How it's wired

1. **`src/utils/crash-reporting.ts`** holds the whole setup: `initCrashReporting`
   (called at the top of `src/app/_layout.tsx`, before the first screen mounts),
   `setCrashContext`, `addGameBreadcrumb`, `reportCrash`, `reportMessage` and
   `withCrashReporting`, which wraps the root layout's default export. Nothing
   else in the app imports `@sentry/react-native`, and none of the 120 game
   components changed.
2. **Options:** `enabled: !__DEV__`, `sendDefaultPii: false`, `tracesSampleRate: 0`,
   and a `beforeSend` that drops everything when the player has turned crash
   reports off. No session replay, no profiling.
3. **The setting:** `crashReports` in `GlobalSettings`, on by default, with a
   "Send crash reports" toggle in the settings modal. The module mirrors the
   value in a variable of its own, because `beforeSend` is synchronous and the
   settings cache is native-only (and empty at startup).
4. **Config:** the `@sentry/react-native/expo` plugin in `app.config.js`, and
   `getSentryExpoConfig` in `metro.config.js` for source maps. `extra.sentryDsn`
   carries the DSN and `extra.sentryEnvironment` the EAS build profile.
5. **Context:** the root layout tags each event with the current game path and
   display language and leaves a `screen` breadcrumb; `GameWrapper` adds `deal`,
   `undo`, `win` and `loss`. No game state is attached.
6. **Failures:** the game route's existing `ErrorBoundary` reports the error it
   catches, and `consumeInterruptedGameLaunch` now returns the game path, which
   the home screen reports as a message - that's the only trace a native crash
   during a game launch leaves behind.
7. **Jest** transforms `@sentry/*`, which ships ESM (`transformIgnorePatterns`
   in `package.json`).

Screen names come from our own breadcrumbs rather than
`Sentry.reactNavigationIntegration()`, which exists to create tracing spans and
would mean turning tracing on.

## Privacy and store updates

- **Privacy policy** (`src/locales/*/privacy.json`): done. The summary, "Data we
  collect" and "Children's privacy" sections now describe the diagnostics sent,
  say that no personal information is included and that IP addresses are not
  stored, and point at the setting. Translated into all seven languages, and the
  policy's date moved to 2026-09-21.
- **Settings:** done - "Send crash reports", on by default.
- **Sentry project settings** and the **store forms** are still to do; see
  "What's left".

## Decisions made

- Sentry, project `solitarius` in the `james-carmichael` organization, US data
  region.
- Crash reports default to on, with an opt-out in the settings.
- Performance tracing stays off (`tracesSampleRate: 0`).

## What's left

1. **Auth token,** for uploading source maps: `SENTRY_AUTH_TOKEN` in
   `.env.local` locally, and an EAS environment variable with sensitive
   visibility for EAS builds. Make it an organization token
   (sentry.io -> Settings -> Auth Tokens -> Create New Token) with the
   `project:releases` and `org:read` scopes. A local release build without one
   needs `SENTRY_DISABLE_AUTO_UPLOAD=true`.
2. **Prebuild Android again** so the plugin applies, then re-apply the local
   `applicationIdSuffix` edits in `android/app/build.gradle`, which is
   gitignored.
3. **Verify on a preview build:** a temporary hidden action calling
   `Sentry.captureException(new Error("Sentry test"))` and then
   `Sentry.nativeCrash()`. Confirm both arrive with readable stack traces, and
   that turning the setting off stops them. Remove the action afterwards.
4. **Sentry project settings:** turn on "Prevent storing of IP addresses" - the
   privacy policy now promises it.
5. **Google Play data safety form:** declare "Crash logs" and "Diagnostics",
   collected for app stability, not shared, not linked to identity, encrypted in
   transit. App Store: "Crash Data", not linked to the user.
6. **Measure on the Pixel 7:** cold start (0.65-0.8 s before), memory and APK
   size.
