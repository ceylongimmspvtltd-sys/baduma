/**
 * Ambient declarations for non-code imports.
 *
 * `next build` generates `next-env.d.ts` (git-ignored, as Next.js recommends),
 * which is what normally makes `import "./globals.css"` type-check. Without a
 * build, a fresh clone therefore failed `npm run typecheck` with
 * `TS2882: Cannot find module or type declarations for side-effect import`.
 * These declarations keep typecheck green before the first build.
 */

declare module "*.css";
declare module "*.scss";
declare module "*.sass";

declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
