import { createContext, useCallback, useEffect, useMemo, useState } from "react";

export const colors = {
  light: {
    mainBg: "#ffffff",
    cardBg: "#f7fbf8",
    raisedBg: "#ffffff",
    subtleBg: "#eef6f0",
    text: "#1b2620",
    heading: "#060b08",
    secondaryText: "#5c6d63",
    btnBg: "#15803d",
    btnText: "#ffffff",
    btnHover: "#166534",
    linkColor: "#15803d",
    hoverBg: "#e9f5ed",
    activeBg: "rgba(21, 128, 61, 0.12)",
    border: "#dce9e0",
    borderStrong: "#b4cfbe",
    separator: "#e8f1ea",
    success: "#1f9d55",
    successBg: "#e0f5e8",
    error: "#c62828",
    errorBg: "#fdeceb",
    warning: "#a16207",
    warningBg: "#fef3c7",
    glassBg: "rgba(255, 255, 255, 0.88)",
    glassBorder: "rgba(220, 233, 224, 0.92)",
    shadow: "rgba(6, 30, 14, 0.08)",
    shadowStrong: "rgba(6, 30, 14, 0.18)",
    scrim: "rgba(0, 12, 6, 0.5)"
  },
  dark: {
    mainBg: "#000000",
    cardBg: "#0a0a0a",
    raisedBg: "#121212",
    subtleBg: "#050505",
    text: "#e4e4e4",
    heading: "#ffffff",
    secondaryText: "#9a9a9a",
    btnBg: "#22c55e",
    btnText: "#02130a",  
    btnHover: "#4ade80",
    linkColor: "#4ade80",
    hoverBg: "#171717",
    activeBg: "rgba(34, 197, 94, 0.16)",
    border: "#1f1f1f",
    borderStrong: "#333333",
    separator: "#141414",
    success: "#4ade80",
    successBg: "#0a1c11",
    error: "#f87171",
    errorBg: "#220e0e",
    warning: "#facc15",
    warningBg: "#211b07",
    glassBg: "rgba(8, 44, 24, 0.62)",
    glassBorder: "rgba(74, 222, 128, 0.30)",
    shadow: "rgba(0, 0, 0, 0.6)",
    shadowStrong: "rgba(0, 0, 0, 0.85)",
    scrim: "rgba(0, 0, 0, 0.75)"
  }

};

export const ThemeContext = createContext(undefined);
const tokenKeys = Object.keys(colors.light);

export function ThemeProvider({ children }) {
  const systemMode = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const [theme, setTheme] = useState({ mode: "light", system: false });
  const [ready, setReady] = useState(false);

  const applyTokens = useCallback((mode) => {
    const root = document.documentElement;
    tokenKeys.forEach((key) => root.style.setProperty(`--${key}`, colors[mode][key]));
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
  }, []);

  const updateTheme = useCallback((nextTheme) => {
    setTheme((current) => {
      const next = nextTheme || { mode: current.mode === "dark" ? "light" : "dark", system: false };
      const resolved = next.system ? { ...next, mode: systemMode() } : next;
      localStorage.setItem("datasite_theme", JSON.stringify(resolved));
      applyTokens(resolved.mode);
      return resolved;
    });
  }, [applyTokens]);

  useEffect(() => {
    let initial = { mode: "light", system: false };
    try {
      initial = JSON.parse(localStorage.getItem("datasite_theme")) || initial;
    } catch { }
    if (initial.system) initial.mode = systemMode();
    setTheme(initial);
    applyTokens(initial.mode);
    setReady(true);
  }, [applyTokens]);

  const value = useMemo(() => ({ theme, updateTheme, isThemeReady: ready, colors: colors[theme.mode] }), [theme, updateTheme, ready]);
  return <ThemeContext.Provider value={value}>{ready ? children : null}</ThemeContext.Provider>;
}
