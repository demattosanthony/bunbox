import { useState, useEffect } from "react";

type TerminalLine = {
  type: "comment" | "command" | "output";
  text: string;
  prefix?: string;
};

const terminalLines: TerminalLine[] = [
  { type: "comment", text: "# Create a new Bunbox app" },
  { type: "command", text: "bun create bunbox my-app", prefix: "$" },
  { type: "comment", text: "# Start the dev server" },
  { type: "command", text: "cd my-app && bun dev", prefix: "$" },
  {
    type: "output",
    text: "Ready in 4ms at http://localhost:3000",
  },
  { type: "comment", text: "# Deploy to production" },
  { type: "command", text: "bunx bunbox-deploy production", prefix: "$" },
  {
    type: "output",
    text: "Deployed to https://my-app.bunbox.dev",
  },
];

// Delay before typing starts (ms)
const TYPING_DELAY = 300;
// Speed per character (ms) - lower = faster
const CHAR_SPEED = 25;
// Pause after comment appears (ms)
const COMMENT_PAUSE = 50;
// Pause after output appears (ms)
const OUTPUT_PAUSE = 150;
// Pause after command finishes before next line (ms)
const COMMAND_PAUSE = 200;

export function TypingTerminal() {
  const [hasMounted, setHasMounted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Handle client-side mount
  useEffect(() => {
    setHasMounted(true);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Delay before typing starts
  useEffect(() => {
    if (!hasMounted) return;

    if (prefersReducedMotion) {
      setDisplayedLines(terminalLines.map((line) => line.text));
      setCurrentLineIndex(terminalLines.length);
      setHasStarted(true);
      return;
    }

    const timer = setTimeout(() => {
      setHasStarted(true);
      setIsTyping(true);
    }, TYPING_DELAY);

    return () => clearTimeout(timer);
  }, [hasMounted, prefersReducedMotion]);

  // Typing animation
  useEffect(() => {
    if (prefersReducedMotion || !hasStarted) return;
    if (currentLineIndex >= terminalLines.length) {
      setIsTyping(false);
      return;
    }

    const currentLine = terminalLines[currentLineIndex];
    if (!currentLine) return;

    const targetText = currentLine.text;

    // Comments and outputs appear instantly
    if (currentLine.type === "comment" || currentLine.type === "output") {
      setDisplayedLines((prev) => [...prev, targetText]);
      const pause = currentLine.type === "comment" ? COMMENT_PAUSE : OUTPUT_PAUSE;
      setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
        setCurrentCharIndex(0);
      }, pause);
      return;
    }

    // Commands type character by character
    if (currentCharIndex < targetText.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const newLines = [...prev];
          if (newLines.length <= currentLineIndex) {
            newLines.push(targetText.slice(0, currentCharIndex + 1));
          } else {
            newLines[currentLineIndex] = targetText.slice(
              0,
              currentCharIndex + 1
            );
          }
          return newLines;
        });
        setCurrentCharIndex((prev) => prev + 1);
      }, CHAR_SPEED);
      return () => clearTimeout(timer);
    } else {
      // Move to next line after command is done
      const timer = setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
        setCurrentCharIndex(0);
      }, COMMAND_PAUSE);
      return () => clearTimeout(timer);
    }
  }, [currentLineIndex, currentCharIndex, prefersReducedMotion, hasStarted]);

  const renderLine = (line: TerminalLine, index: number) => {
    const displayText = displayedLines[index] || "";
    const isCurrentLine = index === currentLineIndex;
    const showCursor =
      isTyping &&
      isCurrentLine &&
      line.type === "command" &&
      !prefersReducedMotion;

    if (line.type === "comment") {
      return (
        <div key={index} className="text-zinc-500">
          {displayText}
        </div>
      );
    }

    if (line.type === "command") {
      return (
        <div key={index} className="mt-1">
          <span className="text-green-400">{line.prefix}</span>{" "}
          <span className="text-white">
            {displayText}
            {showCursor && (
              <span className="animate-blink inline-block w-2 h-4 bg-white ml-0.5 align-middle" />
            )}
          </span>
        </div>
      );
    }

    if (line.type === "output") {
      const isReady = displayText.includes("Ready");
      const isDeployed = displayText.includes("Deployed");

      if (isReady) {
        return (
          <div key={index} className="mt-1">
            <span className="text-cyan-400">Ready</span>{" "}
            <span className="text-zinc-400">
              in <span className="text-white">4ms</span> at{" "}
              <span className="text-blue-400 underline">
                http://localhost:3000
              </span>
            </span>
          </div>
        );
      }

      if (isDeployed) {
        return (
          <div key={index} className="mt-1">
            <span className="text-cyan-400">Deployed</span>{" "}
            <span className="text-zinc-400">
              to{" "}
              <span className="text-blue-400 underline">
                https://my-app.bunbox.dev
              </span>
            </span>
          </div>
        );
      }

      return (
        <div key={index} className="mt-1 text-zinc-400">
          {displayText}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-xl bg-zinc-900 shadow-2xl overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </div>

      {/* Terminal Content */}
      <div className="p-6 font-mono text-sm leading-relaxed min-h-[280px]">
        {!hasStarted && !prefersReducedMotion ? (
          // Show waiting state with blinking cursor
          <div>
            <span className="text-green-400">$</span>{" "}
            <span className="animate-blink inline-block w-2 h-4 bg-white ml-0.5 align-middle" />
          </div>
        ) : (
          terminalLines.map((line, index) => {
            // Only render lines that have started displaying
            if (index > currentLineIndex && !prefersReducedMotion) return null;
            if (!displayedLines[index] && index !== currentLineIndex)
              return null;

            // Add spacing before comments (except first one)
            const needsSpacing =
              line.type === "comment" && index > 0 && displayedLines[index];

            return (
              <div key={index} className={needsSpacing ? "mt-4" : ""}>
                {renderLine(line, index)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
