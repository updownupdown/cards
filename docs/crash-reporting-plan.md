# Crash Reporting Plan

Status: plan only, to be implemented in a future session after the localization groundwork (`docs/localization-plan.md`).

## Why

Release builds report nothing. SoliNova already notices when a game launch never settled: `consumeInterruptedGameLaunch` in `src/data/game-menu.ts` catches it, so the next launch doesn't resume into a crash loop. But nobody learns which game crashed or why. Crash reporting sends that information to a dashboard.

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

## Implementation steps

1. **Account:** create a Sentry organization (choose the EU or US data region) and a React Native project. Note the DSN, which is public and can live in `app.config.js`, and create an auth token.
   - Keep the token in `.env.local` locally.
   - Store it as an EAS environment variable with sensitive visibility for EAS builds.
2. **Install:** run `npx expo install @sentry/react-native`. Avoid the wizard, which rewrites files; set it up by hand instead.
3. **Plugin:** add `["@sentry/react-native/expo", { url: "https://sentry.io/", project, organization }]` to `app.config.js`.
4. **Metro:** switch `metro.config.js` to `getSentryExpoConfig(__dirname)`, keeping any existing customizations.
5. **Initialization** at the top of `src/app/_layout.tsx`:
   ```ts
   Sentry.init({
     dsn,
     enabled: !__DEV__,
     sendDefaultPii: false,
     tracesSampleRate: 0,
     environment, // "preview" or "production"
     beforeSend: (event) => (crashReportsEnabled() ? event : null),
   });
   ```
   Export the root layout wrapped with `Sentry.wrap(RootLayout)`.
   - Don't copy the docs' sample options that turn on personal data, session replay and profiling.
   - Session replay records the screen, which is a privacy and performance cost this app doesn't need.
6. **Screen names:** register `Sentry.reactNavigationIntegration()` with Expo Router's navigation container ref, so breadcrumbs show which screen each event came from.
7. **Game context:**
   - Tag events with the current game path, launch mode (standard or nodes) and language.
   - Add breadcrumbs for game start, win, loss, undo and new deal.
   - Don't attach full game state, which is large and not needed.
8. **Error boundary:**
   - Wrap the game screen in `Sentry.ErrorBoundary`, so a failing game shows "Something went wrong" with a way home instead of a blank screen, and gets reported.
   - When `consumeInterruptedGameLaunch` returns true, report a message naming the game that failed to open.
9. **Native project:** prebuild Android again so the plugin applies. `android/` is gitignored, so re-apply the local `applicationIdSuffix` edits in `android/app/build.gradle`. Local release builds without a token need `SENTRY_DISABLE_AUTO_UPLOAD=true`.
10. **Verify on a preview build:**
    - Add a temporary hidden action that calls `Sentry.captureException(new Error("Sentry test"))`, then `Sentry.nativeCrash()`.
    - Confirm both reports arrive with readable stack traces, then remove the action.
11. **Measure on the Pixel 7:** cold start (currently 0.65–0.8 s), memory and APK size, before and after.

## Privacy and store updates

- **Privacy policy** (`src/app/privacy.tsx`):
  - It currently says the app uses no crash reporting.
  - Replace that with a description of the crash diagnostics sent: stack traces, device model, OS and app version, and recent in-app events. Say that no personal information is included and how to turn it off.
- **Settings:** add a "Send crash reports" toggle that the `beforeSend` check above respects.
- **Sentry project settings:** turn on "Prevent storing of IP addresses".
- **Google Play data safety form:** declare "Crash logs" and "Diagnostics". They are collected for app stability, not shared, not linked to identity, and encrypted in transit.
- **App Store privacy details:** declare "Crash Data", not linked to the user.

## Decisions for you

- Sentry (recommended) or Crashlytics.
- The data region, EU or US.
- Whether crash reports default to on with an opt-out (recommended) or off with an opt-in.
- Whether to turn on performance tracing. The recommendation is to leave it off for v1.
