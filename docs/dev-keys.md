# Developer keys

Dev mode (instant wins, the beta games, the Dev tab's shortcuts) can be
turned on wherever the app runs locally: a development build, or the web
build served from this computer. Anywhere else, solitarius.app included, it
needs a developer key.

A key looks like `7KQ2-M9XD-4TBR`. Typing is forgiving: lower case, spaces
and missing dashes are fine, and I, L and O are read as 1, 1 and 0.

These were once the Odyssey's unlock keys, with friend and tester keys too;
those went with the force field in 2026-11. The salt and the saved key
(`cards.odysseyUnlock.v1`) are unchanged, so a developer key entered before
then still counts.

## Making a key

```sh
npm run keys:add -- --label "James"
```

It prints the key once:

```
Developer key for James: 7KQ2-M9XD-4TBR
```

**Keep it straight away: the key isn't kept anywhere.** Only its fingerprint
goes into `src/data/dev-keys.ts`, with the label. The repository may be
public, so use a first name or a nickname as the label.

Then commit `src/data/dev-keys.ts` and merge to main. The web app picks the
key up as soon as main is published.

`npm run keys:list` lists the labels.

## Taking a key back

```sh
npm run keys:remove -- --label "James"
```

Commit and merge as above. Wherever that key was entered, dev mode can't be
turned on again from the next start, and a saved "on" reads as off.

## Turning dev mode on

Dev mode is turned on with a knock on the version number at the foot of
Settings, Advanced: five taps, a pause until the number turns red (five
seconds), then five more. Ten taps in a row do nothing, on purpose, so stray
taps never add up.

Outside a local run, without a key, the knock says so and opens the key
screen; a developer key entered there turns dev mode on at once. Settings
then has a Dev tab with its shortcuts and Turn off. Once a key has been
entered, the knock turns dev mode on directly.

On an iPhone, an app added to the Home Screen keeps its own storage, apart
from Safari's, so enter the key in the one you'll test in.
