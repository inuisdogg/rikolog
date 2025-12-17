const fs = require('fs');
const { createCanvas } = require('canvas');

// canvasが使えない場合はシンプルなPNGを作成
function createSimplePNG(size) {
  // 最小限のPNG（黒背景）
  const width = size;
  const height = size;
  const data = Buffer.alloc(width * height * 4);
  
  // 黒背景
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 26;     // R
    data[i + 1] = 26; // G
    data[i + 2] = 26; // B
    data[i + 3] = 255; // A
  }
  
  // PNG形式で保存（簡易版）
  // 実際には適切なPNGエンコーダーが必要ですが、ここではBase64で作成
  return Buffer.from(data);
}

// 192x192と512x512のアイコンを作成
try {
  const canvas192 = createCanvas(192, 192);
  const ctx192 = canvas192.getContext('2d');
  
  // 背景
  ctx192.fillStyle = '#1a1a1a';
  ctx192.fillRect(0, 0, 192, 192);
  
  // 電卓の本体
  ctx192.fillStyle = '#2a2a2a';
  ctx192.fillRect(20, 20, 152, 152);
  ctx192.strokeStyle = '#444';
  ctx192.lineWidth = 3;
  ctx192.strokeRect(20, 20, 152, 152);
  
  // ディスプレイ
  ctx192.fillStyle = '#000000';
  ctx192.fillRect(30, 30, 132, 40);
  
  // 数字0
  ctx192.fillStyle = '#ffffff';
  ctx192.font = 'bold 30px Arial';
  ctx192.textAlign = 'center';
  ctx192.fillText('0', 96, 55);
  
  // ボタン
  ctx192.fillStyle = '#333333';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx192.beginPath();
      ctx192.arc(50 + col * 30, 90 + row * 25, 10, 0, Math.PI * 2);
      ctx192.fill();
    }
  }
  
  // 演算子ボタン
  ctx192.fillStyle = '#ff9500';
  for (let row = 0; row < 3; row++) {
    ctx192.beginPath();
    ctx192.arc(150, 90 + row * 25, 10, 0, Math.PI * 2);
    ctx192.fill();
  }
  
  const buffer192 = canvas192.toBuffer('image/png');
  fs.writeFileSync('icon-192.png', buffer192);
  
  // 512x512も同様に作成
  const canvas512 = createCanvas(512, 512);
  const ctx512 = canvas512.getContext('2d');
  
  ctx512.fillStyle = '#1a1a1a';
  ctx512.fillRect(0, 0, 512, 512);
  
  ctx512.fillStyle = '#2a2a2a';
  ctx512.fillRect(60, 60, 392, 392);
  ctx512.strokeStyle = '#444';
  ctx512.lineWidth = 8;
  ctx512.strokeRect(60, 60, 392, 392);
  
  ctx512.fillStyle = '#000000';
  ctx512.fillRect(100, 100, 312, 80);
  
  ctx512.fillStyle = '#ffffff';
  ctx512.font = 'bold 80px Arial';
  ctx512.textAlign = 'center';
  ctx512.fillText('0', 256, 150);
  
  ctx512.fillStyle = '#333333';
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx512.beginPath();
      ctx512.arc(140 + col * 80, 220 + row * 80, 25, 0, Math.PI * 2);
      ctx512.fill();
    }
  }
  
  ctx512.fillStyle = '#ff9500';
  for (let row = 0; row < 3; row++) {
    ctx512.beginPath();
    ctx512.arc(380, 220 + row * 80, 25, 0, Math.PI * 2);
    ctx512.fill();
  }
  
  const buffer512 = canvas512.toBuffer('image/png');
  fs.writeFileSync('icon-512.png', buffer512);
  
  console.log('Icons created successfully');
} catch (error) {
  console.log('Canvas not available, creating placeholder icons');
  // フォールバック: シンプルなPNGを作成
  const createPlaceholder = (size) => {
    // Base64エンコードされた最小限のPNG
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return Buffer.from(base64, 'base64');
  };
  fs.writeFileSync('icon-192.png', createPlaceholder(192));
  fs.writeFileSync('icon-512.png', createPlaceholder(512));
  console.log('Placeholder icons created');
}
