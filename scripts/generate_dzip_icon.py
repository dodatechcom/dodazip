import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

def create_dzip_icon(size=512):
    # Supersample at 2x for ultra smooth antialiased rendering
    S = size * 2
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Floor Drop Shadow
    shadow_box = [int(S * 0.16), int(S * 0.78), int(S * 0.84), int(S * 0.94)]
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.ellipse(shadow_box, fill=(15, 23, 42, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=int(S * 0.04)))
    img.alpha_composite(shadow)

    # 2. Main 3D Box / Vault Dimensions
    # A slightly angled 3D rounded vault container
    # Front face coordinates
    fx0, fy0, fx1, fy1 = int(S * 0.18), int(S * 0.22), int(S * 0.82), int(S * 0.86)
    corner_r = int(S * 0.09)

    # 3D Depth Extrusion (Back/Side layers)
    # Extrusion offset towards top-right
    ox, oy = int(S * 0.05), int(-S * 0.05)

    # Back depth shadow/body
    depth_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(depth_layer)
    # Top face polygon
    top_poly = [
        (fx0 + corner_r, fy0),
        (fx0 + corner_r + ox, fy0 + oy),
        (fx1 - corner_r + ox, fy0 + oy),
        (fx1 - corner_r, fy0),
    ]
    # Right face polygon
    right_poly = [
        (fx1, fy0 + corner_r),
        (fx1 + ox, fy0 + corner_r + oy),
        (fx1 + ox, fy1 - corner_r + oy),
        (fx1, fy1 - corner_r),
    ]
    
    # Draw side & top bevels for 3D isometric feel
    for i in range(ox, 0, -1):
        progress = i / ox
        shift_x = int(i)
        shift_y = int(-i)
        # Deep blue-metallic shading
        r_c = int(20 + 15 * progress)
        g_c = int(45 + 30 * progress)
        b_c = int(90 + 70 * progress)
        d_draw.rounded_rectangle(
            [fx0 + shift_x, fy0 + shift_y, fx1 + shift_x, fy1 + shift_y],
            radius=corner_r,
            fill=(r_c, g_c, b_c, 255)
        )
    img.alpha_composite(depth_layer)

    # 3. Main Vault Front Body (gradient from deep royal blue to midnight navy)
    front_body = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    fb_draw = ImageDraw.Draw(front_body)

    # Draw rounded rectangle with vertical gradient
    for y in range(fy0, fy1):
        ratio = (y - fy0) / (fy1 - fy0)
        # Top: brilliant electric blue (30, 90, 220), Bottom: dark titanium navy (10, 25, 60)
        r = int(30 * (1 - ratio) + 12 * ratio)
        g = int(100 * (1 - ratio) + 30 * ratio)
        b = int(230 * (1 - ratio) + 80 * ratio)
        fb_draw.line([(fx0, y), (fx1, y)], fill=(r, g, b, 255), width=1)

    # Create mask for rounded corners
    mask = Image.new("L", (S, S), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([fx0, fy0, fx1, fy1], radius=corner_r, fill=255)

    # Composite front body with mask
    front_cut = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    front_cut.paste(front_body, (0, 0), mask=mask)
    img.alpha_composite(front_cut)

    # 4. Metallic Chamfer & Glossy Highlight Rim
    rim_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    r_draw = ImageDraw.Draw(rim_layer)
    # Inner border (Cyan glow)
    r_draw.rounded_rectangle(
        [fx0 + 5, fy0 + 5, fx1 - 5, fy1 - 5],
        radius=corner_r - 4,
        outline=(56, 189, 248, 180),
        width=int(S * 0.008)
    )
    # Outer crisp rim
    r_draw.rounded_rectangle(
        [fx0, fy0, fx1, fy1],
        radius=corner_r,
        outline=(147, 197, 253, 220),
        width=int(S * 0.006)
    )
    img.alpha_composite(rim_layer)

    # 5. Top Glass Specular Arc / Gloss Reflection
    gloss = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(gloss)
    g_draw.ellipse(
        [fx0 - int(S * 0.1), fy0 - int(S * 0.25), fx1 + int(S * 0.1), fy0 + int((fy1 - fy0) * 0.55)],
        fill=(255, 255, 255, 45)
    )
    # Mask gloss to front face only
    gloss_masked = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gloss_masked.paste(gloss, (0, 0), mask=mask)
    img.alpha_composite(gloss_masked)

    # 6. Central 3D High-Tech Vault Door Dial / Mechanism
    cx = (fx0 + fx1) // 2
    cy = int(fy0 + (fy1 - fy0) * 0.42)
    dial_r = int((fx1 - fx0) * 0.24)

    # Dial Drop Shadow
    dial_shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ds_draw = ImageDraw.Draw(dial_shadow)
    ds_draw.ellipse(
        [cx - dial_r - 6, cy - dial_r + 8, cx + dial_r + 6, cy + dial_r + 14],
        fill=(5, 12, 30, 200)
    )
    dial_shadow = dial_shadow.filter(ImageFilter.GaussianBlur(radius=int(S * 0.015)))
    img.alpha_composite(dial_shadow)

    # Outer Gear / Notched Wheel
    dial_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(dial_layer)
    
    # Metallic Outer Ring
    for r in range(dial_r, dial_r - int(S * 0.03), -1):
        ratio = (dial_r - r) / (S * 0.03)
        g_val = int(220 * (1 - ratio) + 160 * ratio)
        d_draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(g_val, g_val + 10, g_val + 25, 255), width=2)

    # Outer Dial Notches (tick marks like a high-security safe dial)
    num_notches = 12
    for n in range(num_notches):
        angle = n * (2 * math.pi / num_notches)
        nx1 = cx + math.cos(angle) * (dial_r - 2)
        ny1 = cy + math.sin(angle) * (dial_r - 2)
        nx2 = cx + math.cos(angle) * (dial_r - int(S * 0.022))
        ny2 = cy + math.sin(angle) * (dial_r - int(S * 0.022))
        d_draw.line([(nx1, ny1), (nx2, ny2)], fill=(30, 41, 59, 230), width=int(S * 0.007))

    # Inner Dial Disc (Brushed Titanium Gradient)
    inner_r = dial_r - int(S * 0.028)
    for y in range(cy - inner_r, cy + inner_r + 1):
        dy = y - cy
        half_w = int(math.sqrt(max(0, inner_r * inner_r - dy * dy)))
        if half_w > 0:
            ratio = (dy + inner_r) / (2 * inner_r)
            # Metallic gradient top to bottom
            val = int(240 * (1 - ratio) + 130 * ratio)
            d_draw.line([(cx - half_w, y), (cx + half_w, y)], fill=(val, val + 5, val + 15, 255), width=1)

    # Cyan Glowing Core Ring
    core_r = int(inner_r * 0.62)
    d_draw.ellipse(
        [cx - core_r, cy - core_r, cx + core_r, cy + core_r],
        fill=(15, 23, 42, 255),
        outline=(56, 189, 248, 255),
        width=int(S * 0.008)
    )

    # 3D Golden / Neon Shield & Lock Icon in Center
    sh_w = int(core_r * 0.68)
    sh_h = int(core_r * 0.85)
    sh_y0 = cy - sh_h // 2
    sh_y1 = cy + sh_h // 2
    
    # Draw Shield Polygon
    shield_pts = [
        (cx - sh_w, sh_y0),
        (cx + sh_w, sh_y0),
        (cx + sh_w, sh_y0 + int(sh_h * 0.5)),
        (cx, sh_y1),
        (cx - sh_w, sh_y0 + int(sh_h * 0.5))
    ]
    d_draw.polygon(shield_pts, fill=(245, 158, 11, 255), outline=(254, 243, 199, 255))
    
    # Shield Inner Check / Keyhole
    d_draw.ellipse([cx - int(S * 0.015), cy - int(S * 0.015), cx + int(S * 0.015), cy + int(S * 0.015)], fill=(30, 27, 75, 255))
    d_draw.polygon([(cx - int(S * 0.01), cy), (cx + int(S * 0.01), cy), (cx, cy + int(S * 0.035))], fill=(30, 27, 75, 255))

    img.alpha_composite(dial_layer)

    # 7. Bold Embossed Metallic "DZIP" Badge at the Bottom
    badge_w = int((fx1 - fx0) * 0.72)
    badge_h = int((fy1 - fy0) * 0.22)
    bx0 = cx - badge_w // 2
    by0 = int(fy0 + (fy1 - fy0) * 0.73)
    bx1 = bx0 + badge_w
    by1 = by0 + badge_h
    badge_r = int(badge_h * 0.28)

    badge_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(badge_layer)

    # Badge Shadow
    b_draw.rounded_rectangle(
        [bx0, by0 + 4, bx1, by1 + 7],
        radius=badge_r,
        fill=(5, 10, 25, 180)
    )

    # Badge Plate (High-tech Dark Platinum Plate with Cyan Border)
    b_draw.rounded_rectangle(
        [bx0, by0, bx1, by1],
        radius=badge_r,
        fill=(15, 23, 42, 250),
        outline=(56, 189, 248, 240),
        width=int(S * 0.006)
    )

    # Top Bevel on Badge Plate
    b_draw.line(
        [(bx0 + badge_r, by0 + 2), (bx1 - badge_r, by0 + 2)],
        fill=(125, 211, 252, 200),
        width=int(S * 0.003)
    )

    # Text: "DZIP"
    # Find a bold font or draw pixel-perfect bold geometric letterforms
    font = None
    for font_name in ["segoeb.ttf", "arialbd.ttf", "calibrib.ttf", "tahoma.ttf", "verdana.ttf"]:
        try:
            font = ImageFont.truetype(font_name, size=int(badge_h * 0.65))
            break
        except Exception:
            pass

    text = "DZIP"
    if font:
        bbox = b_draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = cx - tw // 2
        ty = by0 + (badge_h - th) // 2 - bbox[1]
        # Text Drop Shadow
        b_draw.text((tx + 2, ty + 2), text, font=font, fill=(0, 0, 0, 180))
        # Text Main Glow / White with Cyan accent
        b_draw.text((tx, ty), text, font=font, fill=(255, 255, 255, 255))
    else:
        # Fallback high-contrast manual block drawing
        b_draw.text((cx - int(badge_w * 0.35), by0 + int(badge_h * 0.15)), text, fill=(255, 255, 255, 255))

    img.alpha_composite(badge_layer)

    # 8. Downsample to target size with high-quality Lanczos antialiasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

if __name__ == "__main__":
    out_dir = "src-tauri/icons"
    os.makedirs(out_dir, exist_ok=True)
    
    # Generate 512x512 master
    master = create_dzip_icon(512)
    png_path = os.path.join(out_dir, "dzip_file_512.png")
    master.save(png_path)
    print(f"Generated {png_path}")

    # Generate multi-resolution Windows ICO
    ico_path = os.path.join(out_dir, "dzip_file.ico")
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    master.save(ico_path, format="ICO", sizes=icon_sizes)
    print(f"Generated {ico_path} with sizes: {icon_sizes}")
