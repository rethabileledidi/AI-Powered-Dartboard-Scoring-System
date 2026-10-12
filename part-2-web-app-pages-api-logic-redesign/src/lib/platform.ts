export function detectRaspberryPiBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const u = (navigator.userAgent + ' ' + (navigator as any).platform).toLowerCase();
  return /raspberry|raspi|aarch64|armv7|armv6|linux; arm|chromium.*arm/.test(u);
}