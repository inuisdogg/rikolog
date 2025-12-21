// プレミアムプランテスト用のセットアップスクリプト
// ブラウザのコンソール（F12）で実行してください

// プレミアムプランに設定（1ヶ月有効）
function enablePremiumTest() {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1); // 1ヶ月後
  
  const premiumData = {
    subscribedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    planPrice: 450,
    status: 'active'
  };
  
  localStorage.setItem('riko_premium', JSON.stringify(premiumData));
  console.log('✅ プレミアムプランに設定しました！');
  console.log('有効期限:', expiresAt.toLocaleString('ja-JP'));
  console.log('ページをリロードしてください。');
  
  return premiumData;
}

// プレミアムプランを無期限に設定（テスト用）
function enablePremiumTestUnlimited() {
  const premiumData = {
    subscribedAt: new Date().toISOString(),
    expiresAt: null, // 無期限
    planPrice: 450,
    status: 'active'
  };
  
  localStorage.setItem('riko_premium', JSON.stringify(premiumData));
  console.log('✅ プレミアムプラン（無期限）に設定しました！');
  console.log('ページをリロードしてください。');
  
  return premiumData;
}

// プレミアムプランを解除（無料プランに戻す）
function disablePremiumTest() {
  localStorage.removeItem('riko_premium');
  console.log('✅ プレミアムプランを解除しました（無料プランに戻りました）');
  console.log('ページをリロードしてください。');
}

// 現在のプレミアム状態を確認
function checkPremiumStatus() {
  try {
    const premium = localStorage.getItem('riko_premium');
    if (!premium) {
      console.log('❌ プレミアムプラン未加入（無料プラン）');
      return false;
    }
    const data = JSON.parse(premium);
    if (!data.expiresAt) {
      console.log('✅ プレミアムプラン（無期限）');
      return true;
    }
    const expires = new Date(data.expiresAt);
    const now = new Date();
    if (expires > now) {
      const daysRemaining = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
      console.log(`✅ プレミアムプラン（残り${daysRemaining}日）`);
      console.log('有効期限:', expires.toLocaleString('ja-JP'));
      return true;
    } else {
      console.log('❌ プレミアムプランの有効期限が切れています');
      return false;
    }
  } catch (error) {
    console.error('エラー:', error);
    return false;
  }
}

// 使用方法を表示
console.log(`
📋 プレミアムプランテスト用コマンド:

1. プレミアムプランを有効化（1ヶ月）:
   enablePremiumTest()

2. プレミアムプランを有効化（無期限）:
   enablePremiumTestUnlimited()

3. プレミアムプランを解除:
   disablePremiumTest()

4. 現在の状態を確認:
   checkPremiumStatus()

⚠️ 設定後はページをリロード（F5）してください。
`);

// 現在の状態を確認
checkPremiumStatus();

