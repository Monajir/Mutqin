"""Prepare the user's JPEG branding without regenerating its artwork.

Run with system Python + Pillow: python3 scripts/prepare-branding.py
Original JPEGs remain unchanged; output paths match app.config.js.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
DESIGN = ROOT / "design" / "branding"
BACKGROUND = "#183E45"
RESAMPLE = Image.Resampling.LANCZOS


def extract_warm_art(path, region):
    image = Image.open(path).convert("RGB")
    image = image.crop(tuple(round(v * s) for v, s in zip(region, image.size * 2)))
    red, _, blue = image.split()
    # These supplied images have warm cream/gold marks on a cool teal
    # background. Their red-minus-blue separation preserves the original
    # letter shapes; it is not a general-purpose background remover.
    alpha = ImageChops.subtract(red, blue).point(
        lambda value: max(0, min(255, round((value - 4) * 255 / 16)))
    )
    image = image.convert("RGBA")
    image.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f"No foreground found in {path.name}")
    return image.crop(bounds)


def centered(art, size, max_extent):
    art = art.copy()
    art.thumbnail((max_extent, max_extent), RESAMPLE)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return result


def main():
    DESIGN.mkdir(parents=True, exist_ok=True)
    logo = extract_warm_art(ASSETS / "Gemini_adaptive-icon.jpeg", (.14, .20, .86, .71))
    adaptive = centered(logo, 1024, 600)
    adaptive.save(ASSETS / "adaptive-icon.png", optimize=True)

    # Full-bleed square background; Android/iOS supplies the outer icon mask.
    icon = Image.new("RGBA", (1024, 1024), BACKGROUND)
    icon.alpha_composite(centered(logo, 1024, 780))
    icon.convert("RGB").save(ASSETS / "icon.png", optimize=True)

    rosette = extract_warm_art(ASSETS / "Gemini_notification-icon.jpeg", (.27, .27, .73, .74))
    # Slightly strengthen fine source strokes before shrinking to tray size.
    alpha = rosette.getchannel("A").filter(ImageFilter.MaxFilter(9))
    white = Image.new("RGBA", rosette.size, "white")
    white.putalpha(alpha)
    notification = centered(white, 96, 72)
    # Keep RGB exactly white even at antialiased/transparent pixels; alpha
    # alone describes the small icon's shape to Android.
    final_notification = Image.new("RGBA", (96, 96), "white")
    final_notification.putalpha(notification.getchannel("A"))
    final_notification.save(ASSETS / "notification-icon.png", optimize=True)

    Image.open(ASSETS / "Gemini_splash.jpeg").convert("RGB").save(
        ASSETS / "splash.png", optimize=True
    )

    # Review at launcher/tray scale and under two common launcher masks.
    sheet = Image.new("RGB", (1000, 700), "#E8EEEE")
    draw = ImageDraw.Draw(sheet)
    for x, label, shape in [(30, "App icon", "square"), (270, "Adaptive / circle", "circle"), (510, "Adaptive / rounded", "rounded")]:
        tile = Image.new("RGBA", (200, 200), BACKGROUND)
        tile.alpha_composite((icon if shape == "square" else adaptive).resize((200, 200), RESAMPLE))
        mask = Image.new("L", (200, 200), 0)
        painter = ImageDraw.Draw(mask)
        if shape == "circle":
            painter.ellipse((0, 0, 199, 199), fill=255)
        elif shape == "rounded":
            painter.rounded_rectangle((0, 0, 199, 199), radius=45, fill=255)
        else:
            painter.rectangle((0, 0, 199, 199), fill=255)
        sheet.paste(tile, (x, 55), mask)
        draw.text((x, 25), label, fill="black")
    draw.text((30, 295), "Notification at 24 / 48 / 96 px", fill="black")
    tray = Image.new("RGBA", (680, 150), "#183E45")
    for x, size in [(30, 24), (130, 48), (260, 96)]:
        tray.alpha_composite(final_notification.resize((size, size), RESAMPLE), (x, (150-size)//2))
    sheet.paste(tray.convert("RGB"), (30, 325))
    splash = Image.open(ASSETS / "splash.png")
    splash.thumbnail((250, 600), RESAMPLE)
    sheet.paste(splash, (740, 55))
    draw.text((740, 25), "Splash source / contain", fill="black")
    draw.text((30, 520), "Original JPEGs preserved. Background: " + BACKGROUND, fill="black")
    sheet.save(DESIGN / "preview.png")
    for name in ("icon.png", "adaptive-icon.png", "notification-icon.png", "splash.png"):
        image = Image.open(ASSETS / name)
        print(name, image.size, image.mode)


if __name__ == "__main__":
    main()
