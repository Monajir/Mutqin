# Branding preparation — 23 October 2026

The user's four `assets/Gemini_*.jpeg` images remain unchanged. The supplied
regular/adaptive JPEGs contain identical image data. Original app PNGs were
saved in `previous-assets/` before replacement.

Active assets:

- `assets/icon.png`: 1024×1024 opaque PNG, original cream/gold artwork on a
  full square dark-teal background. The baked rounded frame was removed so
  the operating system can supply its icon shape.
- `assets/adaptive-icon.png`: 1024×1024 RGBA, original lettering and motif
  extracted with transparent background and centered within a 600 px extent.
- `assets/notification-icon.png`: 96×96 RGBA, white rosette on transparency,
  with the source tile and illustrated notification badge removed. Source
  strokes are slightly strengthened for small-size legibility.
- `assets/splash.png`: original 1536×2752 portrait composition converted to
  PNG without redesigning or cropping it.

The app config continues referencing these filenames. Splash/adaptive
backgrounds and notification tint now use `#183E45`. Splash sizing remains
`contain`; its gradient may meet the solid background differently on other
screen aspect ratios, so verify it on the target device.

`preview.png` shows the artwork with illustrative launcher masks and small
notification sizes. It is not a screenshot from Android.

Preparation is reproducible with system Python + Pillow:

```bash
python3 scripts/prepare-branding.py
```

The script uses color separation tailored to these warm logos on cool teal,
not generative redrawing. The user explicitly authorized local image
processing after two built-in image-tool extraction attempts produced
speckled artifacts. Neither generated attempt is used in the app.

Validation: originals' SHA-256 prefixes unchanged; valid PNGs; actual alpha
transparency in both foreground assets; notification RGB entirely white;
Expo public config resolves all four assets and new background colors;
preview visually inspected. No new native build or phone verification was
performed. A native rebuild and installation are required for these assets
to appear in the installed development client. Preserve the existing app
signing identity and data when installing the update.
