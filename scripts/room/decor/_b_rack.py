"""The homelab rack's gear (bible 3.28), unit by unit. Every unit is a
front plate with ears on the rails and a body behind it; the details on
the plate are what sells it: drive bays with cyan light pipes, ports,
perforated fronts, amber activity dots. LEDs are named led_* for the site.

Units count up from U1 at the bottom; a unit is 44.5 mm. The rack is
1.55 tall as the bible says, which holds 31U, so the bible's twelve units
are joined by matching gear (storage, a second 1U, mini PCs, a Pi
cluster) instead of being stretched.
"""

import math

from decor._b_util import cable, disc, led, matte

U = 0.0445
BOTTOM = 0.1  # the bottom of U1
FRONT = 0.66  # the face of every unit
CX, W = 4.62, 0.48  # units' centre and body width
EARS = 0.51  # plate width, ears included
CYAN, AMBER, WHITE, GREEN = "#3ff0c8", "#ffb340", "#f4f2ea", "#4cff7a"


def y_of(u):
    return BOTTOM + (u - 1) * U


def gear(k):
    return k.mat("b_gear", "#1b1b1b", 0.42, metal=0.45)


def silver(k):
    """Brushed grey fronts (the switch, the patch panel) the ports show on."""
    return k.mat("b_gear_silver", "#6f7275", 0.4, metal=0.6, bump=0.02, bump_scale=2500)


def perforated(k, name="b_perf", base="#202020", pitch=0.0045, radius=0.32):
    """A steel front full of small round holes (object space, so any
    plate gets the same hole size)."""
    if name in k.mats:
        return k.mats[name]
    m = k.mat(name, base, 0.45, metal=0.4)
    nt = m.node_tree
    coord = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coord.outputs["Object"], sep.inputs["Vector"])
    dist = None
    for axis in ("X", "Z"):
        a = nt.nodes.new("ShaderNodeMath")
        a.operation = "DIVIDE"
        a.inputs[1].default_value = pitch
        nt.links.new(sep.outputs[axis], a.inputs[0])
        f = nt.nodes.new("ShaderNodeMath")
        f.operation = "FRACT"
        nt.links.new(a.outputs[0], f.inputs[0])
        c = nt.nodes.new("ShaderNodeMath")
        c.operation = "SUBTRACT"
        c.inputs[1].default_value = 0.5
        nt.links.new(f.outputs[0], c.inputs[0])
        sq = nt.nodes.new("ShaderNodeMath")
        sq.operation = "MULTIPLY"
        nt.links.new(c.outputs[0], sq.inputs[0])
        nt.links.new(c.outputs[0], sq.inputs[1])
        if dist is None:
            dist = sq
        else:
            add = nt.nodes.new("ShaderNodeMath")
            add.operation = "ADD"
            nt.links.new(dist.outputs[0], add.inputs[0])
            nt.links.new(sq.outputs[0], add.inputs[1])
            dist = add
    hole = nt.nodes.new("ShaderNodeMath")
    hole.operation = "LESS_THAN"
    hole.inputs[1].default_value = radius * radius
    nt.links.new(dist.outputs[0], hole.inputs[0])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = nt.nodes["Principled BSDF"].inputs["Base Color"].default_value
    mix.inputs["B"].default_value = (0.004, 0.004, 0.004, 1)
    nt.links.new(hole.outputs[0], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return m


def unit(k, name, u, n, face=None, depth=0.32):
    """The plate (with its ears and thumbscrews) and the body behind it.
    Returns (bottom y, height, centre y) of the plate."""
    y0, h = y_of(u), n * U - 0.0015
    cy = y0 + h / 2
    k.box(name, (EARS, h, 0.004), (CX, cy, FRONT - 0.002), face or gear(k), bevel=0.0008)
    k.box(f"{name}_body", (W - 0.02, h - 0.004, depth), (CX, cy, FRONT - 0.004 - depth / 2), matte(k, "#161616", 0.5), bevel=0.0)
    screw = k.mat("b_thumb", "#9a9a98", 0.35, metal=1.0)
    for i, sx in enumerate((-1, 1)):
        disc(k, f"{name}_screw{i}", 0.0032, 0.003, (CX + sx * (EARS / 2 - 0.0075), y0 + U * 0.5, FRONT), screw, bevel=0.0, verts=8)
    return y0, h, cy


def handles(k, name, cy, h):
    """Two silver pull handles near the ears."""
    m = k.mat("b_handle", "#8c8c8a", 0.35, metal=1.0)
    for i, sx in enumerate((-1, 1)):
        x = CX + sx * (W / 2 - 0.012)
        cable(k, f"{name}_handle{i}", [(x, cy - h * 0.32, FRONT), (x, cy - h * 0.3, FRONT + 0.012), (x, cy + h * 0.3, FRONT + 0.012), (x, cy + h * 0.32, FRONT)], 0.0025, m, res=3, sides=1)


def inset(k, name, size, x, y, color="#060606", proud=0.0006):
    k.box(name, (size[0], size[1], 0.001), (x, y, FRONT + proud), matte(k, color, 0.8), bevel=0.0)


def ups(k, u):
    y0, h, cy = unit(k, "ups", u, 2)
    k.box("ups_vent", (0.2, h * 0.7, 0.001), (CX - 0.12, cy, FRONT + 0.0005), perforated(k), bevel=0.0)
    inset(k, "ups_lcd_bezel", (0.052, 0.024), CX + 0.1, cy + 0.008)
    led(k, "ups_lcd", (0.04, 0.015, 0.001), (CX + 0.1, cy + 0.008, FRONT + 0.0012), "#bfe8ff", 6.0)
    led(k, "ups_power", (0.004, 0.004, 0.002), (CX + 0.16, cy + 0.012, FRONT + 0.001), GREEN)
    for i in range(3):
        disc(k, f"ups_button{i}", 0.0045, 0.002, (CX + 0.08 + i * 0.02, cy - 0.016, FRONT), matte(k, "#3a3a3a", 0.4), bevel=0.0008, verts=12)
    k.box("ups_badge", (0.05, 0.004, 0.0008), (CX - 0.12, y0 + h - 0.008, FRONT + 0.0008), matte(k, "#8a8a88", 0.4), bevel=0.0)


def battery(k, u):
    y0, h, cy = unit(k, "ups_battery", u, 2)
    k.box("ups_battery_vent", (0.36, h * 0.72, 0.001), (CX - 0.03, cy, FRONT + 0.0005), perforated(k), bevel=0.0)
    led(k, "ups_battery_ok", (0.004, 0.004, 0.002), (CX + 0.19, cy, FRONT + 0.001), GREEN)


def vent(k, name, u, n=1):
    unit(k, name, u, n, face=perforated(k, "b_perf_panel", "#1d1d1d", 0.006, 0.3))


def storage(k, u):
    """4U, twelve bays: each a tray with a handle and a cyan light pipe."""
    y0, h, cy = unit(k, "storage", u, 4)
    bw, bh = 0.104, 0.05
    for col in range(4):
        for r in range(3):
            x = CX - 0.165 + col * (bw + 0.006) + 0.01
            y = y0 + 0.012 + r * (bh + 0.006) + bh / 2
            k.box(f"storage_bay{col}{r}", (bw, bh, 0.006), (x, y, FRONT + 0.003), matte(k, "#252525", 0.45), bevel=0.0)
            k.box(f"storage_bay{col}{r}_pull", (bw * 0.7, 0.004, 0.003), (x, y - bh * 0.3, FRONT + 0.0075), k.mat("b_handle", "#8c8c8a", 0.35, metal=1.0), bevel=0.0)
            led(k, f"storage_pipe{col}{r}", (bw * 0.82, 0.004, 0.002), (x, y + bh * 0.22, FRONT + 0.0065), CYAN, 9.0)
            if (col * 3 + r) % 4 != 1:
                led(k, f"storage_act{col}{r}", (0.003, 0.003, 0.002), (x + bw * 0.4, y - bh * 0.05, FRONT + 0.0065), AMBER)
    k.box("storage_panel", (0.045, h - 0.02, 0.002), (CX - 0.21, cy, FRONT + 0.001), matte(k, "#2a2a2a", 0.4), bevel=0.0005)
    led(k, "storage_power", (0.004, 0.004, 0.002), (CX - 0.21, y0 + h - 0.02, FRONT + 0.0025), CYAN)
    handles(k, "storage", cy, h)


def nas(k, u):
    """2U NAS: four drive bays with amber activity LEDs (three blinking
    on, one off), a cyan power LED."""
    y0, h, cy = unit(k, "nas", u, 2)
    for i in range(4):
        x = CX + 0.02 + i * 0.056
        k.box(f"nas_bay{i}", (0.052, 0.07, 0.006), (x, cy, FRONT + 0.003), matte(k, "#262626", 0.45), bevel=0.0)
        k.box(f"nas_bay{i}_grip", (0.03, 0.05, 0.001), (x, cy - 0.004, FRONT + 0.0065), perforated(k, "b_perf_fine", "#2e2e2e", 0.003, 0.3), bevel=0.0)
        if i != 2:
            led(k, f"nas_act{i}", (0.004, 0.003, 0.002), (x + 0.018, cy + 0.028, FRONT + 0.0065), AMBER)
        else:
            inset(k, f"nas_act{i}_off", (0.004, 0.003), x + 0.018, cy + 0.028, "#3a2a14", proud=0.0065)
    led(k, "nas_power", (0.005, 0.005, 0.002), (CX - 0.2, cy + 0.02, FRONT + 0.001), CYAN)
    k.box("nas_logo", (0.06, 0.006, 0.0008), (CX - 0.15, cy + 0.02, FRONT + 0.0008), matte(k, "#7a7a78", 0.4), bevel=0.0)
    for i in range(2):
        inset(k, f"nas_usb{i}", (0.012, 0.005), CX - 0.19 + i * 0.02, cy - 0.022)


def server(k, name, u, n, bar=0.3):
    """A server: a perforated front, one long cyan LED bar, two white LEDs."""
    y0, h, cy = unit(k, name, u, n)
    k.box(f"{name}_mesh", (0.4, h - 0.012, 0.001), (CX - 0.02, cy, FRONT + 0.0005), perforated(k), bevel=0.0)
    led(k, f"{name}_bar", (bar, 0.004, 0.002), (CX - 0.02, y0 + h - 0.008, FRONT + 0.0012), CYAN, 14.0)
    for i in range(2):
        led(k, f"{name}_white{i}", (0.003, 0.003, 0.002), (CX + 0.2, cy - 0.006 + i * 0.01, FRONT + 0.0012), WHITE, 15.0)
    handles(k, name, cy, h)


def switch(k, u):
    """24 ports in two rows of twelve with link LEDs above and below:
    sixteen lit cyan-green, two amber."""
    y0, h, cy = unit(k, "switch", u, 1, face=silver(k))
    lit = set(range(24)) - {3, 7, 10, 15, 19, 22}
    for i in range(24):
        col, r = i % 12, i // 12
        x = CX - 0.19 + col * 0.0145 + (col // 6) * 0.008
        y = cy + (0.0065 if r == 0 else -0.0065)
        inset(k, f"switch_port{i}", (0.0118, 0.0095), x, y)
        ly = y + (0.0085 if r == 0 else -0.0085)
        if i in lit:
            led(k, f"switch_link{i}", (0.003, 0.0018, 0.002), (x, ly, FRONT + 0.001), AMBER if i in (5, 17) else CYAN)
    for i in range(4):
        inset(k, f"switch_sfp{i}", (0.014, 0.008), CX + 0.08 + i * 0.019, cy, "#0d0d0d")
    led(k, "switch_power", (0.004, 0.004, 0.002), (CX + 0.2, cy, FRONT + 0.001), CYAN)


def patch_panel(k, u):
    """24 keystone ports under a strip of white labels."""
    y0, h, cy = unit(k, "patch", u, 1, face=silver(k))
    k.box("patch_labels", (0.36, 0.006, 0.0008), (CX - 0.01, cy + 0.014, FRONT + 0.0008), matte(k, "#e6e2d8", 0.7), bevel=0.0)
    ports = []
    for i in range(24):
        x = CX - 0.18 + i * 0.0145 + (i // 12) * 0.01
        inset(k, f"patch_port{i}", (0.011, 0.0095), x, cy - 0.004)
        ports.append(x)
    return ports


def patch_cables(k, ports, switch_u, patch_u):
    """Twelve short patch leads looping from the panel down to the switch."""
    colors = ["#1f4a32", "#e07a2a", "#e8e6e0", "#8a8a88"]
    ys = y_of(patch_u) + U / 2 - 0.004
    yd = y_of(switch_u) + U / 2
    for i in range(12):
        src = ports[i * 2]
        dst = CX - 0.19 + (i % 12) * 0.0145 + ((i % 12) // 6) * 0.008
        top = yd + 0.0065 if i % 2 == 0 else yd - 0.0065
        bow = 0.018 + 0.006 * (i % 3)
        mat = k.mat(f"b_patch_{colors[i % 4].lstrip('#')}", colors[i % 4], 0.5)
        cable(k, f"patch_lead{i}", [(src, ys, FRONT + 0.002), (src, ys - 0.004, FRONT + bow), ((src + dst) / 2, (ys + top) / 2 - 0.01, FRONT + bow + 0.006), (dst, top + 0.004, FRONT + bow), (dst, top, FRONT + 0.002)], 0.0028, mat, res=3, sides=1)


def brush(k, name, u):
    y0, h, cy = unit(k, name, u, 1)
    k.box(f"{name}_brush", (0.42, 0.012, 0.004), (CX, cy, FRONT + 0.001), k.mat("b_brush", "#0e0e0e", 1.0, bump=0.6, bump_scale=3000), bevel=0.001)


def blank_sticker(k, u):
    y0, h, cy = unit(k, "blank", u, 1)
    k.box("blank_sticker", (0.06, 0.02, 0.0006), (CX - 0.14, cy, FRONT + 0.0003), matte(k, "#f2efe6", 0.6), bevel=0.0)
    k.box("blank_sticker_ink", (0.04, 0.003, 0.0004), (CX - 0.145, cy + 0.003, FRONT + 0.0008), matte(k, "#2a2a2a", 0.6), bevel=0.0)


def tray(k, name, u, n):
    """A cantilever shelf: a plate on the rails with a low front lip."""
    y0 = y_of(u)
    plate = k.mat("b_tray", "#1e1e1e", 0.5, metal=0.4)
    k.box(name, (W - 0.01, 0.003, 0.36), (CX, y0 + 0.0015, FRONT - 0.18), plate, bevel=0.0005)
    k.box(f"{name}_lip", (EARS, 0.02, 0.003), (CX, y0 + 0.01, FRONT - 0.0015), plate, bevel=0.0005)
    return y0 + 0.003


def mini_pcs(k, u):
    """Three mini PCs stacked flat on a shelf, white power LEDs on."""
    y = tray(k, "minis_tray", u, 3)
    for i in range(3):
        x, yy, z = CX - 0.1 + i * 0.004, y + 0.018 + i * 0.036, FRONT - 0.1
        k.box(f"minipc{i}", (0.18, 0.034, 0.18), (x, yy, z), matte(k, "#1a1a1a", 0.4), bevel=0.003)
        led(k, f"minipc{i}_power", (0.004, 0.004, 0.002), (x + 0.07, yy, z + 0.091), WHITE, 15.0)
        for j in range(2):
            k.box(f"minipc{i}_usb{j}", (0.012, 0.005, 0.002), (x - 0.06 + j * 0.018, yy, z + 0.0905), matte(k, "#0a0a0a", 0.8), bevel=0.0)
    k.box("minis_switch", (0.1, 0.026, 0.07), (CX + 0.15, y + 0.013, FRONT - 0.05), matte(k, "#202020", 0.45), bevel=0.003)
    for i in range(5):
        led(k, f"minis_switch_link{i}", (0.003, 0.002, 0.002), (CX + 0.115 + i * 0.016, y + 0.02, FRONT - 0.014), CYAN if i < 4 else AMBER)


def pi_cluster(k, u):
    """A three-board Raspberry Pi stack on brass standoffs, and a small
    white router with four aerials."""
    y = tray(k, "pi_tray", u, 5)
    x0, z0 = CX - 0.13, FRONT - 0.06
    pcb = matte(k, "#2d6b3a", 0.55)
    sink = k.mat("b_heatsink", "#141414", 0.4, metal=0.6)
    brass = k.mat("b_standoff", "#b08d57", 0.3, metal=1.0)
    plate = matte(k, "#2a2a2a", 0.3)
    for level in range(4):
        k.box(f"pi_plate{level}", (0.1, 0.003, 0.07), (x0, y + 0.004 + level * 0.032, z0), plate, bevel=0.001)
    for sx in (-1, 1):
        for sz in (-1, 1):
            k.cylinder(f"pi_standoff{sx}{sz}", 0.0025, 0.1, (x0 + sx * 0.044, y + 0.004, z0 + sz * 0.029), brass, 0.0, verts=8)
    for level in range(3):
        yy = y + 0.012 + level * 0.032
        k.box(f"pi{level}_pcb", (0.085, 0.002, 0.056), (x0, yy, z0), pcb, bevel=0.0)
        k.box(f"pi{level}_sink", (0.022, 0.009, 0.022), (x0 - 0.012, yy + 0.0055, z0 - 0.004), sink, bevel=0.0008)
        k.box(f"pi{level}_ports", (0.016, 0.014, 0.05), (x0 + 0.038, yy + 0.008, z0), k.mat("b_chrome", "#d0d0d0", 0.2, metal=1.0), bevel=0.001)
        led(k, f"pi{level}_power", (0.002, 0.0015, 0.002), (x0 - 0.035, yy + 0.0015, z0 + 0.027), "#ff4a3a", 12.0)
        led(k, f"pi{level}_act", (0.002, 0.0015, 0.002), (x0 - 0.03, yy + 0.0015, z0 + 0.027), GREEN, 12.0)
    rx, rz = CX + 0.11, FRONT - 0.08
    white = k.mat("b_white_plastic", "#f2f0ec", 0.35)
    k.box("router", (0.14, 0.03, 0.1), (rx, y + 0.015, rz), white, bevel=0.006)
    for i in range(2):
        led(k, f"router_led{i}", (0.004, 0.002, 0.002), (rx - 0.03 + i * 0.012, y + 0.02, rz + 0.0505), CYAN if i == 0 else WHITE, 15.0)
    black = matte(k, "#1a1a1a", 0.45)
    for i, ax in enumerate((-0.055, -0.02, 0.02, 0.055)):
        tilt = (-12, -4, 4, 12)[i]
        base = (rx + ax, y + 0.03, rz - 0.045)
        top = (base[0] + 0.07 * math.sin(math.radians(tilt)), base[1] + 0.07 * math.cos(math.radians(tilt)), base[2] - 0.01)
        cable(k, f"router_aerial{i}", [base, top], 0.0045, black, res=1, sides=1)


def stack(k):
    """Everything in the rack, bottom to top; returns the patch ports."""
    ups(k, 1)
    battery(k, 3)
    vent(k, "vent_a", 5)
    storage(k, 6)
    brush(k, "brush_a", 10)
    nas(k, 11)
    vent(k, "vent_b", 13)
    server(k, "server_2u", 14, 2, bar=0.3)
    server(k, "server_1u_a", 16, 1, bar=0.22)
    server(k, "server_1u_b", 17, 1, bar=0.16)
    blank_sticker(k, 18)
    switch(k, 19)
    ports = patch_panel(k, 20)
    patch_cables(k, ports, 19, 20)
    brush(k, "brush_b", 21)
    mini_pcs(k, 22)
    vent(k, "vent_c", 25)
    pi_cluster(k, 26)
    vent(k, "vent_top", 31)
