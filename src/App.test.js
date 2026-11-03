import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "./contexts/themeContext";
import { useTheme } from "./hooks/useTheme";

function ThemeProbe() {
  const { colors, theme } = useTheme();
  return <div data-testid="theme" data-mode={theme.mode} style={{ background: colors.mainBg }}>{colors.mainBg}</div>;
}

test("starts with the white light theme", async () => {
  render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
  const probe = await screen.findByTestId("theme");
  expect(probe).toHaveAttribute("data-mode", "light");
  expect(probe).toHaveTextContent("#ffffff");
});
