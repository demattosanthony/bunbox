"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        // Pure client-side logic
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        const newTheme = isDark ? "light" : "dark";

        root.classList.remove("light", "dark");
        root.classList.add(newTheme);
        localStorage.setItem("bunbox-ui-theme", newTheme);
      }}
      title="Toggle theme"
    >
      {/* 
        Using CSS classes to toggle visibility based on parent .dark class 
        This avoids needing React state which causes SSR issues
      */}
      <div className="relative">
        <Sun className="h-[1.2rem] w-[1.2rem] transition-all dark:scale-0 scale-100 rotate-0 dark:-rotate-90" />
        <Moon className="absolute top-0 left-0 h-[1.2rem] w-[1.2rem] transition-all dark:scale-100 scale-0 rotate-90 dark:rotate-0" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
