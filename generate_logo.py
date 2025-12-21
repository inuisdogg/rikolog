import os
from PIL import Image, ImageDraw, ImageFont

def create_logo(text, font_path, text_color, bg_color, output_filename, is_icon=False):
    """
    指定されたフォントと色でロゴ画像を生成する関数
    """
    try:
        # フォントサイズの設定
        font_size = 150
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        print(f"Error: Font file not found at {font_path}")
        return

    # テキストのサイズを計測
    dummy_img = Image.new('RGBA', (1, 1))
    draw = ImageDraw.Draw(dummy_img)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # 画像サイズを決定（余白を追加）
    padding = 40
    if is_icon:
        # アイコンの場合は正方形にする
        size = max(text_width, text_height) + padding * 2
        img_width = size
        img_height = size
    else:
        img_width = text_width + padding * 2
        img_height = text_height + padding * 2

    # 画像を作成 (RGBAで透過対応)
    img = Image.new('RGBA', (img_width, img_height), bg_color)
    draw = ImageDraw.Draw(img)

    # テキストを描画（中央寄せ）
    x = (img_width - text_width) / 2 - bbox[0]
    y = (img_height - text_height) / 2 - bbox[1]
    
    # アイコンの場合は少し上に調整（視覚的重心のため）
    if is_icon:
        y -= 10

    draw.text((x, y), text, font=font, fill=text_color)

    # 保存
    img.save(output_filename)
    print(f"Generated: {output_filename}")

# 設定
font_file = "AKACHAN/AKACHANk.TTF"
text = "リコログ"

# カラー定義 (Tailwind CSSに近い色味)
color_pink = (219, 39, 119)   # Pink-600 #db2777
color_slate = (15, 23, 42)    # Slate-900 #0f172a
color_white = (255, 255, 255) # White
color_transparent = (255, 255, 255, 0) # 透明

# 1. ピンク文字 (背景透明)
create_logo(text, font_file, color_pink, color_transparent, "rikolog_logo_pink.png")

# 2. スレート文字 (背景透明)
create_logo(text, font_file, color_slate, color_transparent, "rikolog_logo_slate.png")

# 3. アプリアイコン風 (ピンク背景・白文字)
create_logo(text, font_file, color_white, color_pink, "rikolog_logo_icon.png", is_icon=True)




