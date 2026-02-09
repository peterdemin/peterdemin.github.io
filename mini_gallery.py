import argparse
from pathlib import Path
from typing import Iterable

from PIL import Image
from pillow_heif import register_heif_opener


def main():
    register_heif_opener()
    parser = argparse.ArgumentParser(
        "mini_gallery.py",
        description="Import image folder as a mini gallery",
    )
    parser.add_argument(
        "source",
        help="Path to the directory with source image files",
    )
    parser.add_argument(
        "name",
        help="Markdown file name",
    )
    parser.add_argument(
        "-s",
        "--max-side",
        default=2048,
        help="Maximum side length in pixels",
    )
    parser.add_argument(
        "-t",
        "--max-thumbnail-side",
        default=256,
        help="Maximum side length in pixels",
    )
    args = parser.parse_args()
    directory = Path(args.source)
    assert directory.is_dir()
    gallery = Gallery(
        name=args.name,
        side=args.max_side,
        thumbnail_side=args.max_thumbnail_side,
    )
    for f in directory.glob("*.*"):
        if f.is_file():
            gallery.append(f)
    gallery.save()


class Gallery:
    def __init__(self, name: str, side: int, thumbnail_side: int) -> None:
        self._name = name
        self._images = []
        self._dir = Path("images")
        self._side = side
        self._thumbnail_side = thumbnail_side

    def append(self, path: Path) -> None:
        self._images.append(path)

    def save(self) -> None:
        Path(f"{self._name}.md").write_text(self.markdown(), encoding="utf-8")
        self.export_images()
        self.export_thumbnails()

    def markdown(self) -> str:
        lines = []
        for i, _ in self._iter_paths():
            target = self._target(i)
            lines.extend([
                f"```{{figure}} /16_life/{self._thumbnail(i)}",
                f":alt: {target.name}",
                f":target: /16_life/{target}",
                "```",
            ])
        return "\n".join(lines)

    def export_images(self) -> None:
        for i, path in self._iter_paths():
            im = Image.open(path)
            im.thumbnail((self._side, self._side))
            im.save(self._target(i))

    def export_thumbnails(self) -> None:
        for i, path in self._iter_paths():
            im = self._crop(Image.open(path))
            im.thumbnail((self._thumbnail_side, self._thumbnail_side))
            im.save(self._thumbnail(i))

    def _crop(self, im: Image.Image) -> Image.Image:
        w, h = im.size
        cw = w // 2
        ch = h // 2
        if w >= h:
            left, right = cw - ch, cw + ch
            top, bottom = 0, h
        else:
            left, right = 0, w
            top, bottom = ch - cw, ch + cw
        return im.crop((left, top, right, bottom))

    def _iter_paths(self) -> Iterable[tuple[int, Path]]:
        return enumerate(sorted(self._images), 1)

    def _target(self, i: int) -> Path:
        return self._dir / f"{self._name}_{i}.webp"

    def _thumbnail(self, i: int) -> Path:
        return self._dir / f"{self._name}_{i}_t.webp"


if __name__ == "__main__":
    main()
