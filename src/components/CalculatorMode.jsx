import React, { useEffect, useMemo, useRef, useState } from 'react';
import { updateUser } from '../../db/users.js';

/**
 * カモフラージュ用電卓モード
 * パスコード入力で本体アプリをアンロック
 */
const CalculatorMode = ({ onUnlock, user }) => {
  const [display, setDisplay] = useState("0");
  // ユーザー設定のパスコードを使用（デフォルトは7777）
  const PASSCODE = useMemo(() => {
    return user?.calculator_passcode || "7777";
  }, [user?.calculator_passcode]);

  // Cボタンの長押し検出用
  const cButtonPressTimer = useRef(null);
  const cButtonPressStartTime = useRef(null);
  const [isResetting, setIsResetting] = useState(false);

  // Cボタンを押し始めた時
  const handleCDown = async () => {
    if (!user?.id) return;

    cButtonPressStartTime.current = Date.now();
    setIsResetting(true);

    // 7秒後にリセット
    cButtonPressTimer.current = setTimeout(async () => {
      try {
        // パスコードを7777にリセット
        await updateUser(user.id, { calculatorPasscode: '7777' });

        // 成功メッセージを表示
        alert('電卓パスコードを7777にリセットしました。\n画面をリロードします。');

        // 画面をリロードして新しいパスコードを反映
        window.location.reload();
      } catch (error) {
        alert('パスコードのリセットに失敗しました。もう一度お試しください。');
        setIsResetting(false);
      }
    }, 7000);
  };

  // Cボタンを離した時
  const handleCUp = () => {
    if (cButtonPressTimer.current) {
      clearTimeout(cButtonPressTimer.current);
      cButtonPressTimer.current = null;
    }
    cButtonPressStartTime.current = null;
    setIsResetting(false);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (cButtonPressTimer.current) {
        clearTimeout(cButtonPressTimer.current);
      }
    };
  }, []);

  // 安全な数式評価関数（eval/new Functionを使わない）
  const safeEvaluate = (expression) => {
    // 許可する文字のみをチェック（数字、演算子、小数点のみ）
    if (!/^[\d+\-*/.\s()]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }

    // トークン化
    const tokens = [];
    let numBuffer = '';

    for (const char of expression) {
      if (/\d|\./.test(char)) {
        numBuffer += char;
      } else if (['+', '-', '*', '/'].includes(char)) {
        if (numBuffer) {
          tokens.push(parseFloat(numBuffer));
          numBuffer = '';
        }
        tokens.push(char);
      }
    }
    if (numBuffer) {
      tokens.push(parseFloat(numBuffer));
    }

    // 乗算・除算を先に処理
    let i = 0;
    while (i < tokens.length) {
      if (tokens[i] === '*' || tokens[i] === '/') {
        const left = tokens[i - 1];
        const right = tokens[i + 1];
        const result = tokens[i] === '*' ? left * right : left / right;
        tokens.splice(i - 1, 3, result);
      } else {
        i++;
      }
    }

    // 加算・減算を処理
    let result = tokens[0];
    for (let j = 1; j < tokens.length; j += 2) {
      const op = tokens[j];
      const num = tokens[j + 1];
      if (op === '+') result += num;
      else if (op === '-') result -= num;
    }

    return result;
  };

  const handlePress = (val) => {
    if (val === "C") {
      setDisplay("0");
    } else if (val === "=") {
      if (display === PASSCODE) {
        onUnlock();
      } else {
        try {
          const result = safeEvaluate(display);
          if (isNaN(result) || !isFinite(result)) {
            setDisplay("Error");
          } else {
            setDisplay(result.toString());
          }
        } catch {
          setDisplay("Error");
        }
      }
    } else {
      setDisplay(display === "0" ? val : display + val);
    }
  };

  const buttons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "C", "0", "=", "+"
  ];

  return (
    <div
      className="h-full w-full flex flex-col bg-black text-white font-sans lg:max-w-md lg:h-auto lg:min-h-[600px] lg:mx-auto lg:shadow-2xl lg:rounded-xl lg:my-8 lg:p-4"
      style={{
        minHeight: '100dvh',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      <div
        className="flex-1 flex items-end justify-end p-6 text-6xl font-light font-mono break-all lg:min-h-[200px] min-h-0 overflow-hidden"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {display}
      </div>
      <div
        className="grid grid-cols-4 gap-4 flex-shrink-0 px-4 pb-4 lg:pb-8"
        style={{
          paddingBottom: 'max(80px, calc(1rem + env(safe-area-inset-bottom) + 3rem))',
          minHeight: 'fit-content',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {buttons.map((btn, i) => (
          <button
            key={i}
            onClick={() => handlePress(btn)}
            onMouseDown={btn === "C" ? handleCDown : undefined}
            onMouseUp={btn === "C" ? handleCUp : undefined}
            onMouseLeave={btn === "C" ? handleCUp : undefined}
            onTouchStart={btn === "C" ? handleCDown : undefined}
            onTouchEnd={btn === "C" ? handleCUp : undefined}
            className={`text-2xl rounded-full flex items-center justify-center shadow-lg
              ${btn === "=" || ["/", "*", "-", "+"].includes(btn) ? "bg-orange-500 text-white" : "bg-gray-800 text-white"}
              ${btn === "0" ? "col-span-2 aspect-[2/1]" : "aspect-square"}
              ${btn === "C" && isResetting ? "bg-red-600 animate-pulse" : ""}
              active:opacity-70 transition-opacity
            `}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none'
            }}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalculatorMode;
