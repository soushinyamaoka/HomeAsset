import { useEffect, useState } from 'react';

// 値の変化を delay ms 落ち着くまで遅延させる（検索入力のリクエスト間引き用）
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
