// デバイス情報の取得と判定

/**
 * デバイスタイプを判定
 * @returns {string} 'iPhone' | 'Android' | 'iPad' | 'Desktop' | 'Tablet' | 'Unknown'
 */
export function getDeviceType() {
  const ua = navigator.userAgent || '';
  
  // iPhone
  if (/iPhone/.test(ua) && !window.MSStream) {
    return 'iPhone';
  }
  
  // iPad
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iPad';
  }
  
  // Android
  if (/Android/.test(ua)) {
    // タブレットかスマホかを判定
    if (/Mobile/.test(ua)) {
      return 'Android';
    } else {
      return 'Android Tablet';
    }
  }
  
  // その他のタブレット
  if (/Tablet|iPad|PlayBook|Silk/.test(ua)) {
    return 'Tablet';
  }
  
  // デスクトップ
  if (/Windows|Mac|Linux/.test(ua) && !/Mobile|Android|iPhone|iPad/.test(ua)) {
    return 'Desktop';
  }
  
  return 'Unknown';
}

/**
 * ブラウザタイプを判定
 * @returns {string} 'Chrome' | 'Safari' | 'Firefox' | 'Edge' | 'Other'
 */
export function getBrowserType() {
  const ua = navigator.userAgent || '';
  
  if (/Chrome/.test(ua) && !/Edg|OPR/.test(ua)) {
    return 'Chrome';
  }
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    return 'Safari';
  }
  if (/Firefox/.test(ua)) {
    return 'Firefox';
  }
  if (/Edg/.test(ua)) {
    return 'Edge';
  }
  if (/OPR/.test(ua)) {
    return 'Opera';
  }
  
  return 'Other';
}

/**
 * OSタイプを判定
 * @returns {string} 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Unknown'
 */
export function getOSType() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  
  if (/iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iOS';
  }
  if (/Android/.test(ua)) {
    return 'Android';
  }
  if (/Win/.test(platform)) {
    return 'Windows';
  }
  if (/Mac/.test(platform)) {
    return 'macOS';
  }
  if (/Linux/.test(platform)) {
    return 'Linux';
  }
  
  return 'Unknown';
}

/**
 * デバイス情報を取得（オブジェクト形式）
 * @returns {Object} デバイス情報
 */
export function getDeviceInfo() {
  return {
    deviceType: getDeviceType(),
    browserType: getBrowserType(),
    osType: getOSType(),
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    language: navigator.language || '',
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true,
    timestamp: new Date().toISOString(),
  };
}

