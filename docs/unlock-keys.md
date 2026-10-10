# Unlock keys

The Odyssey's force field holds back the games beyond it (`FIELD_RADIUS` in
`src/data/force-field.ts`) until the full Odyssey is unlocked. On Android it
is sold through Google Play (product `odyssey_unlock`, "The Full Odyssey",
`src/data/play-purchase.ts`). On the web, where there is nothing to buy, it
comes from an unlock key.

There are two kinds:

- **Friend keys** open the full Odyssey in the web app (solitarius.app),
  for people who can't buy it on Google Play, such as iPhone users. In the
  Android app a friend key does nothing; give Android friends a Google Play
  promo code instead.
- **Developer keys** open the full Odyssey anywhere, and let dev mode be
  turned on (the knock on the version number in Settings, Advanced). Without
  one, dev mode only works where the app runs locally: a development build,
  or the web build served from this computer.

A key looks like `7KQ2-M9XD-4TBR`. Typing is forgiving: lower case, spaces
and missing dashes are fine, and I, L and O are read as 1, 1 and 0.

## Making a key

```sh
npm run keys:add -- --label "Sam"              # a friend key
npm run keys:add -- --label "James" --role dev  # a developer key
```

It prints the key and a link that enters it:

```
Key for Sam (friend): 7KQ2-M9XD-4TBR
Link: https://solitarius.app/?key=7KQ2-M9XD-4TBR
```

**Send it on straight away: the key isn't kept anywhere.** Only its
fingerprint goes into `src/data/unlock-keys.ts`, with the label. The repository
may be public, so use a first name or a nickname as the label.

Then commit `src/data/unlock-keys.ts` and merge to main. The web app picks
the key up as soon as main is published; the Android app with its next
release (so a developer key for Android needs a build with it in).

`npm run keys:list` lists the labels, and what each key is for.

## Giving it to a friend

- **On Android or a computer**, the link is enough: opening it unlocks the
  web app, in the browser and in the installed app alike, since they share
  their storage.
- **On an iPhone or iPad**, an app added to the Home Screen keeps its own
  storage, apart from Safari's, and links always open in Safari. So:
  1. Open solitarius.app in Safari, tap Share, then Add to Home Screen.
  2. Open Solitarius from the Home Screen.
  3. Go to Settings, Advanced, Unlock key, and type or paste the key.

  Playing from the Home Screen is better anyway: Safari clears a website's
  data after about a week without a visit, but not a Home Screen app's.

On the map, "Enter a key" on the banner over a game beyond the field goes to
the same place in Settings.

Entering a key never touches progress: it only adds the unlock.

## Taking a key back

```sh
npm run keys:remove -- --label "Sam"
```

Commit and merge as above. Wherever that key was entered, the full Odyssey
locks again at the next start (unless that save had already won beyond the
field before the field arrived; see below). Other keys aren't affected.

## What can't be done without a server

The app checks a key against the list of fingerprints, all on the device. So
it can't tell whether a key has been used, how often, or by whom, and anyone
given a key can pass it on. Taking it back is the remedy. Counting
redemptions would need a small server (a free Cloudflare Worker, say), and a
line in the privacy policy.

## Saves from before the field

The first time a save loads with the field, it is checked once: if it had
already won a game beyond the field in the Odyssey, the full Odyssey stays
open for it, for good.

## Testing

In dev mode, Settings has a Force field choice: As played, Always shown or
Lifted, whatever the unlock says.

## The Google Play purchase

The Android app sells the Full Odyssey as a one-time product. In Play Console,
under Monetize with Play, then Products, then In-app products, create
`odyssey_unlock` (name "The Full Odyssey") and activate it. Play only sells it
to a build installed from Play (any testing track), not to one installed by
hand. To buy it without paying, add your Google account under Settings, then
License testing.

At each start the app asks Play whether the account owns it: that opens the
Odyssey on a new phone or after a reinstall, and closes it again after a
refund. Offline, the last answer stands.
