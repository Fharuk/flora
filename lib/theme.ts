/**
 * Theme boot.
 *
 * This module is deliberately NOT a client module: the string below is inlined into
 * <head> by the server layout. Exporting it from a "use client" file would hand the
 * layout a client reference instead of the actual source text.
 */

/** Runs before first paint. Sets data-theme + color-scheme from the URL, else the OS. */
export const THEME_BOOT_SCRIPT = `(function(){try{
var p=new URLSearchParams(location.search).get("theme");
var d=p?p==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
document.documentElement.dataset.theme=d?"dark":"light";
document.documentElement.style.colorScheme=d?"dark":"light";
}catch(e){}})();`;

export type ThemeName = "light" | "dark";

/**
 * The theme a fresh page load should start on: an explicit `?theme=` wins, otherwise the
 * operating system preference. Kept in one place so the blocking script and the store
 * can never disagree about what "no theme in the URL" means.
 */
export function resolveInitialTheme(search: string, prefersDark: boolean): ThemeName {
  const explicit = new URLSearchParams(search).get("theme");
  if (explicit === "dark") return "dark";
  if (explicit === "light") return "light";
  return prefersDark ? "dark" : "light";
}
