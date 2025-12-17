#!/bin/bash
# シンプルな電卓アイコンをsipsで作成
# 192x192
sips -s format png -z 192 192 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/Calculator.icns --out icon-192.png 2>/dev/null || {
  # フォールバック: 単色画像を作成
  convert -size 192x192 xc:'#1a1a1a' -fill '#2a2a2a' -draw 'rectangle 20,20 172,172' -fill '#000000' -draw 'rectangle 30,30 162,70' -fill '#ffffff' -pointsize 48 -gravity center -annotate +0+0 '0' icon-192.png 2>/dev/null || {
    # さらにフォールバック: base64から作成
    echo "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDggNzkuMTY0MDM2LCAyMDE5LzA4LzEzLTAxOjA2OjU3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJmOmFib3V0PSIiLz4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1dHNycXBvbm1sa2ppaGdmZWRjYmFgX15dXFtaWVhXVlVUU1JRUE9OTUxLSklIR0ZFRENCQUA/Pj08Ozo5ODc2NTQzMjEwLy4tLCsqKSgnJiUkIyIhIB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAACH5BAEAAAEALAAAAAABAAEAAAICRAEAOw==" | base64 -d > icon-192.png
  }
}
# 512x512
sips -s format png -z 512 512 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/Calculator.icns --out icon-512.png 2>/dev/null || {
  convert -size 512x512 xc:'#1a1a1a' -fill '#2a2a2a' -draw 'rectangle 60,60 452,492' -fill '#000000' -draw 'rectangle 100,100 412,180' -fill '#ffffff' -pointsize 80 -gravity center -annotate +0+0 '0' icon-512.png 2>/dev/null || {
    echo "Icons will need to be created manually"
  }
}
