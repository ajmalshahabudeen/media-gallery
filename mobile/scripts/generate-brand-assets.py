"""Build Server Gallery icon + splash assets from the brand PNG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "server gallery.png"
OUT = ROOT / "assets" / "images"
BG = (0, 0, 0, 255)
MARK_BG = (34, 34, 34)


def load_source() -> Image.Image:
    im = Image.open(SRC).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - MARK_BG[0]) < 8 and abs(g - MARK_BG[1]) < 8 and abs(b - MARK_BG[2]) < 8:
                px[x, y] = BG
    return im


def fit_on_canvas(src: Image.Image, size: int, pad_ratio: float = 0.0) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    inner = int(size * (1.0 - pad_ratio * 2))
    fitted = ImageOps.contain(src, (inner, inner))
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def monochrome(src: Image.Image, size: int, pad_ratio: float = 0.18) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1.0 - pad_ratio * 2))
    fitted = ImageOps.contain(src, (inner, inner)).convert("RGBA")
    px = fitted.load()
    w, h = fitted.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16 or (r < 20 and g < 20 and b < 20):
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (255, 255, 255, 255)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\segoeuib.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
        Path(r"C:\Windows\Fonts\segoeui.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def splash_full(src: Image.Image) -> Image.Image:
    width, height = 1284, 2778
    canvas = Image.new("RGBA", (width, height), BG)
    logo_w = int(width * 0.62)
    logo = ImageOps.contain(src, (logo_w, logo_w))
    lx = (width - logo.width) // 2
    ly = int(height * 0.34) - logo.height // 2
    canvas.paste(logo, (lx, ly), logo)

    draw = ImageDraw.Draw(canvas)
    label = "Server Gallery"
    fnt = font(72)
    bbox = draw.textbbox((0, 0), label, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (width - tw) // 2
    ty = int(height * 0.82) - th // 2
    draw.text((tx, ty), label, font=fnt, fill=(250, 250, 250, 255))
    return canvas


def splash_icon(src: Image.Image) -> Image.Image:
    """Centered mark for Android 12+ circular splash / plugin imageWidth."""
    return fit_on_canvas(src, 1024, pad_ratio=0.08)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = load_source()
    src.save(OUT / "brand-mark.png", "PNG")

    fit_on_canvas(src, 1024, 0.0).convert("RGB").save(OUT / "icon.png", "PNG")
    fit_on_canvas(src, 1024, 0.18).save(OUT / "android-icon-foreground.png", "PNG")
    Image.new("RGBA", (1024, 1024), BG).save(OUT / "android-icon-background.png", "PNG")
    monochrome(src, 1024, 0.18).save(OUT / "android-icon-monochrome.png", "PNG")
    splash_icon(src).convert("RGB").save(OUT / "splash-icon.png", "PNG")
    splash_full(src).convert("RGB").save(OUT / "splash.png", "PNG")
    fit_on_canvas(src, 196, 0.06).convert("RGB").save(OUT / "favicon.png", "PNG")
    print("wrote brand assets to", OUT)


if __name__ == "__main__":
    main()
