"""The code editor on the left monitor (M1), drawn once into a PNG in
.room-cache/: a dark IDE with a file tree, tabs, a gutter of line numbers,
32 lines of highlighted TypeScript, a minimap and a green status bar.
Text is drawn with Blender's own font renderer (blf) into image buffers,
one white mask per colour, then coloured and laid over the panels."""

import os
import re

import bpy
import blf
import imbuf
import numpy as np

from assets import ROOT

W, H = 1024, 576
PATH = os.path.join(ROOT, ".room-cache", "a_code_editor.png")
TOP, STATUS, ACT, SIDE, GUTTER = 30, 22, 38, 200, 46
LINE = 16

C = {
    "bg": "#1b1d22", "side": "#16181c", "act": "#121418", "tabs": "#15171b", "cursor": "#262a33",
    "kw": "#7ec38a", "str": "#ffb86b", "com": "#5b6470", "num": "#f08d49", "fn": "#e8c47c",
    "txt": "#d7dae0", "dim": "#4b525c", "tree": "#9aa3ad", "status": "#1f4a32", "white": "#f4f1ea",
}

CODE = """import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { STORIES, OVERVIEW } from './layout'
// The About room: one baked GLB, seven stories to open.
export function Room({ active, onOpen }: RoomProps) {
  const mount = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(OVERVIEW.fov, 16 / 9, 0.1, 60)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    new GLTFLoader().load('/room/room.glb', (gltf) => {
      gltf.scene.traverse((node) => {
        const story = node.userData.story
        if (!story) return
        // the light is baked into the atlas; screens stay live
        if (node.userData.kind === 'live') node.renderOrder = 2
        pieces.set(story, [...(pieces.get(story) ?? []), node])
      })
      scene.add(gltf.scene)
      setReady(true)
    })

    const tick = () => {
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(frame)
  }, [])"""

TREE = [
    (0, "EXPLORER", "dim"), (0, "v portfolio-v2", "tree"), (1, "v src", "tree"), (2, "v components", "tree"),
    (3, "v about", "tree"), (4, "v room", "tree"), (5, "Room.tsx", "white"), (5, "layout.ts", "tree"),
    (5, "pins.tsx", "tree"), (4, "About.tsx", "tree"), (3, "> work", "tree"), (2, "> assets", "tree"),
    (2, "> app", "tree"), (1, "> scripts", "tree"), (2, "  room.py", "tree"), (1, "> public", "tree"),
    (1, "package.json", "tree"), (1, "tsconfig.json", "tree"), (1, "README.md", "tree"),
]

KEYWORDS = {"import", "from", "export", "const", "let", "function", "return", "if", "else", "new", "as", "true", "false", "null", "type"}
TOKEN = re.compile(r"(//.*$)|('[^']*'|\"[^\"]*\")|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)(?=\s*\()|(\b[A-Za-z_]\w*\b)|(.)")


def _rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def tokens(line):
    """A line of code as [(text, colour key)]."""
    out = []
    for m in TOKEN.finditer(line):
        com, s, num, fn, word, other = m.groups()
        if com:
            out.append((com, "com"))
        elif s:
            out.append((s, "str"))
        elif num:
            out.append((num, "num"))
        elif fn:
            out.append((fn, "kw" if fn in KEYWORDS else "fn"))
        elif word:
            out.append((word, "kw" if word in KEYWORDS else "txt"))
        else:
            out.append((other, "txt"))
    return out


def _font():
    path = os.path.join(bpy.utils.system_resource("DATAFILES"), "fonts", "DejaVuSansMono.woff2")
    fid = blf.load(path) if os.path.exists(path) else -1
    return fid if fid >= 0 else blf.load("/System/Library/Fonts/Menlo.ttc")


def _mask(fid, items):
    """White text on black for `items` [(x, y from top, text, size)], as an
    (H, W) coverage array (row 0 at the top)."""
    ib = imbuf.new((W, H))
    with blf.bind_imbuf(fid, ib):
        blf.color(fid, 1, 1, 1, 1)
        for x, y, text, size in items:
            blf.size(fid, size)
            blf.position(fid, x, H - y, 0)
            blf.draw_buffer(fid, text)
    tmp = PATH + ".mask.png"
    imbuf.write(ib, filepath=tmp)
    img = bpy.data.images.load(tmp, check_existing=False)
    px = np.empty(W * H * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    os.remove(tmp)
    # blf leaves the colour flat and puts the glyph's coverage in alpha
    return np.flipud(px.reshape(H, W, 4)[..., 3])


def _panels():
    img = np.zeros((H, W, 3), dtype=np.float32)
    img[:] = _rgb(C["bg"])
    img[:, :ACT] = _rgb(C["act"])
    img[:, ACT:SIDE] = _rgb(C["side"])
    img[:TOP, SIDE:] = _rgb(C["tabs"])
    img[:TOP, SIDE : SIDE + 120] = _rgb(C["bg"])
    img[TOP - 2 : TOP, SIDE : SIDE + 120] = _rgb(C["kw"])
    img[H - STATUS :] = _rgb(C["status"])
    cursor = TOP + 8 + 20 * LINE
    img[cursor - 3 : cursor + LINE - 3, SIDE:] = _rgb(C["cursor"])
    img[TOP + 8 + 6 * 18 - 4 : TOP + 8 + 6 * 18 + 14, ACT:SIDE] = _rgb(C["cursor"])
    for i in range(5):
        y = 14 + i * 40
        img[y : y + 18, 10:28] = _rgb(C["dim"]) * (1.6 if i == 0 else 1.0)
    img[TOP + 4 :, W - 14 : W - 4] = _rgb(C["side"])
    img[TOP + 40 : TOP + 120, W - 12 : W - 6] = _rgb(C["dim"])
    return img


def _minimap(img, lines):
    x0 = W - 92
    for i, line in enumerate(lines):
        x = x0 + (len(line) - len(line.lstrip())) * 1
        y = TOP + 10 + i * 3
        for text, key in tokens(line.lstrip()):
            w = len(text)
            if text.strip():
                img[y : y + 2, x : min(x + w, W - 18)] = _rgb(C[key]) * 0.55 + _rgb(C["bg"]) * 0.45
            x += w


def draw():
    """Write the editor PNG (once) and return its path."""
    if os.path.exists(PATH):
        return PATH
    fid = _font()
    lines = CODE.split("\n")
    layers = {}
    blf.size(fid, 12.5)
    cw = blf.dimensions(fid, "M")[0]
    for i, line in enumerate(lines):
        y = TOP + 8 + i * LINE + 11
        layers.setdefault("dim", []).append((SIDE + 8, y, f"{i + 1:>3}", 11))
        x = SIDE + GUTTER + 8
        for text, key in tokens(line):
            if text.strip():
                layers.setdefault(key, []).append((x, y, text, 12.5))
            x += cw * len(text)
    for i, (depth, name, key) in enumerate(TREE):
        layers.setdefault(key, []).append((ACT + 10 + depth * 9, TOP + 8 + i * 18 + 10, name, 11 if i else 10))
    for x, name, key in ((SIDE + 14, "Room.tsx", "white"), (SIDE + 134, "layout.ts", "tree"), (SIDE + 244, "room.py", "tree")):
        layers.setdefault(key, []).append((x, 20, name, 11))
    layers.setdefault("white", []).append((ACT - 30, H - 6, "  main    0 errors    Ln 21, Col 48    Spaces: 2    UTF-8    TypeScript JSX", 11))
    img = _panels()
    _minimap(img, lines)
    for key, items in layers.items():
        m = _mask(fid, items)[..., None]
        img = img * (1 - m) + _rgb(C[key]) * m
    out = bpy.data.images.new("a_code_editor", W, H)
    rgba = np.concatenate([np.flipud(img), np.ones((H, W, 1), dtype=np.float32)], axis=2)
    out.pixels.foreach_set(np.clip(rgba, 0, 1).ravel())
    out.filepath_raw = PATH
    out.file_format = "PNG"
    out.save()
    bpy.data.images.remove(out)
    return PATH
