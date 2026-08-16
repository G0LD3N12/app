import { useEffect, useState } from 'react';

/**
 * Boolean state persisted in localStorage as 'true' / 'false'
 * (same wire format the app has always used).
 */
export function usePersistentBoolean(
  storageKey: string
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [value, setValue] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(storageKey, value.toString());
  }, [storageKey, value]);

  return [value, setValue];
}
