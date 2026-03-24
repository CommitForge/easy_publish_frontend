import type { MouseEvent } from 'react';

export async function copyTextToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function copyToClipboard(
  event: MouseEvent<HTMLElement | SVGElement>,
  text: string
): void {
  void copyTextToClipboard(text).catch(() => alert('Copy failed!'));

  const target = event.currentTarget;
  target.classList.remove('ripple');
  if ('offsetWidth' in target) {
    void target.offsetWidth;
  }
  target.classList.add('ripple');
}
