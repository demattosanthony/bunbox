import { Moon, Sun } from "lucide-react";
import { useTheme } from "@ademattos/bunbox/theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title="Toggle theme"
    >
      <div className="relative">
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all dark:scale-0 scale-100 rotate-0 dark:-rotate-90" />
        <Moon className="absolute top-0 left-0 h-[1.2rem] w-[1.2rem] transition-all dark:scale-100 scale-0 rotate-90 dark:rotate-0" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
