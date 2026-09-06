/**
 * ZIndexManager - Centralized z-index layering hierarchy for modals, dropdowns, headers, and overlays.
 */

export const ZIndexManager = {
  modal: 100,
  dropdown: 90,
  header: 80,
  overlay: 70,
  dropdownBackdrop: 65,
  background: 0,
  base: 10,
  sticky: 20,
  toast: 110,
  scannerOverlay: 9999,
  scannerNotification: 10000,
} as const;

export type ZIndexLayer = keyof typeof ZIndexManager;

export function getZIndexClass(layer: ZIndexLayer): string {
  const val = ZIndexManager[layer];
  switch (val) {
    case 100:
      return 'z-[100]';
    case 90:
      return 'z-[90]';
    case 80:
      return 'z-[80]';
    case 70:
      return 'z-[70]';
    case 65:
      return 'z-[65]';
    case 0:
      return 'z-0';
    case 10:
      return 'z-10';
    case 20:
      return 'z-20';
    case 110:
      return 'z-[110]';
    case 9999:
      return 'z-[9999]';
    case 10000:
      return 'z-[10000]';
    default:
      return `z-[${val}]`;
  }
}
