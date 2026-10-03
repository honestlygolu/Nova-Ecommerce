import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme } = useTheme();
  const isNight = theme === "night";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isNight ? "day" : "night"} mode`}
      aria-pressed={isNight}
      title={`Switch to ${isNight ? "day" : "night"} mode`}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 text-neutral-700 transition hover:border-black/25 hover:bg-white ${compact ? "h-10 w-10" : "px-3 py-2 text-xs font-medium"}`}
    >
      {isNight ? <Sun size={17} /> : <Moon size={17} />}
      {!compact && <span>{isNight ? "Day" : "Night"}</span>}
    </button>
  );
}
