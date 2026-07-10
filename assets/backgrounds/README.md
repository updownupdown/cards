# Background textures

Drop shared background texture images here (`.png`, `.jpg`, `.webp`), then run:

```
npm run assets:generate
```

Reference the file name from a game definition via the `background` field, e.g.:

```ts
background: "Felt.png",
```

Multiple games may share the same texture — just point them at the same file.
