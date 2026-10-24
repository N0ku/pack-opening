/** Short vibration on devices that support it. Only ever called from a user gesture. */
export function vibrate(ms = 15): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(ms);
}
