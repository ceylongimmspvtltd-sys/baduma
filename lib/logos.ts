/**
 * Transparent logo asset registry with automatic sizing selection.
 *
 * The user supplies the transparent logo in multiple sizes; each candidate
 * carries its natural pixel dimensions so getLogoForSlot() can automatically
 * pick the most appropriately sized asset for each UI slot (nav, hero, footer).
 */

export type LogoSlot = 'nav' | 'hero' | 'footer';

export interface LogoAsset {
  src: string;
  width: number;
  height: number;
  slot: LogoSlot;
}

export const LOGO_CANDIDATES: LogoAsset[] = [
  // Compact asset — ideal for the top navigation bar badge and drawer
  { src: '/images/logo-nav.png', width: 172, height: 139, slot: 'nav' },
  // Large asset — ideal for the hero banner and footer brand panel
  { src: '/images/logo-large.png', width: 1299, height: 1049, slot: 'hero' },
  { src: '/images/logo-large.png', width: 1299, height: 1049, slot: 'footer' },
];

/**
 * Automatically select the best-fit transparent logo for a UI slot.
 * Falls back to the largest available candidate when no exact match exists.
 */
export function getLogoForSlot(slot: LogoSlot): LogoAsset {
  const fit = LOGO_CANDIDATES.filter((logo) => logo.slot === slot);
  return fit[0] ?? LOGO_CANDIDATES[LOGO_CANDIDATES.length - 1];
}
