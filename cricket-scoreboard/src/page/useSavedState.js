
import { useEffect, useState } from 'react';

export function useSavedState(
  key,
  defaultValue,
  initialState,
  onStateChange
) {
  const [value, setValue] = useState(() =>
    Object.prototype.hasOwnProperty.call(initialState, key)
      ? initialState[key]
      : defaultValue
  );

  useEffect(() => {
    if (typeof onStateChange !== 'function') return;

    // Keep the latest 30 undo points in the database.
    // The current session retains its complete local undo history.
    const savedValue =
      key === 'history' && Array.isArray(value)
        ? value.slice(-30)
        : value;

    onStateChange(key, savedValue);
  }, [key, value, onStateChange]);

  return [value, setValue];
}
