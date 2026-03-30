"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { CopyButton } from "./copy-button";
import {
  ClaudeIcon,
  GeminiIcon,
  CursorIcon,
  WindsurfIcon,
  CopilotIcon,
} from "./icons";

const agents = [
  { Icon: ClaudeIcon, label: "Claude Code" },
  { Icon: GeminiIcon, label: "Gemini CLI" },
  { Icon: CursorIcon, label: "Cursor" },
  { Icon: WindsurfIcon, label: "Windsurf" },
  { Icon: CopilotIcon, label: "Copilot" },
];

const marqueeAgents = [...agents, ...agents, ...agents];

/* ─── Typing terminal ─── */
const terminalLines = [
  { prompt: true, text: "gear switch @indrias/full-stack" },
  { prompt: false, text: "Downloading gearfile..." },
  { prompt: false, text: "Installing 4 plugins, 12 skills, 3 MCP servers" },
  { prompt: false, text: "Applying model override: claude-opus-4-20250514" },
  { prompt: false, text: "Done. Your agent is ready." },
];

function TypingTerminal() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<number>(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (isInView && !started) setStarted(true);
  }, [isInView, started]);

  useEffect(() => {
    if (!started) return;
    const currentLine = terminalLines[visibleLines];
    if (!currentLine) return;

    if (currentLine.prompt) {
      if (typedChars < currentLine.text.length) {
        const speed = 30 + Math.random() * 40;
        const timer = setTimeout(
          () => setTypedChars((c) => c + 1),
          typedChars === 0 ? 600 : speed,
        );
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setVisibleLines((l) => l + 1);
          setTypedChars(0);
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => {
        setVisibleLines((l) => l + 1);
        setTypedChars(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [started, visibleLines, typedChars]);

  return (
    <div ref={ref} className="w-full max-w-lg mx-auto relative">
      {/* Soft glow behind terminal */}
      <div
        className="absolute -inset-8 rounded-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16,185,129,0.04) 0%, transparent 70%)",
        }}
      />
      <div className="relative rounded-xl border border-neutral-800/80 bg-neutral-950 overflow-hidden shadow-2xl shadow-black/60">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800/50">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800/80" />
          </div>
          <span className="text-[10px] font-mono text-neutral-700 ml-2">
            terminal
          </span>
        </div>
        {/* Content */}
        <div className="p-4 font-mono text-[13px] leading-6 min-h-[180px]">
          {terminalLines.slice(0, visibleLines + 1).map((line, i) => (
            <div key={i} className="flex">
              {line.prompt ? (
                <>
                  <span className="text-emerald-500/70 mr-2 select-none">
                    $
                  </span>
                  <span className="text-neutral-200">
                    {i === visibleLines
                      ? line.text.slice(0, typedChars)
                      : line.text}
                    {i === visibleLines &&
                      typedChars < line.text.length && (
                        <span className="cursor-blink text-emerald-400 ml-px">
                          |
                        </span>
                      )}
                  </span>
                </>
              ) : i <= visibleLines ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={
                    line.text.startsWith("Done")
                      ? "text-emerald-400/80"
                      : "text-neutral-500"
                  }
                >
                  {line.text}
                </motion.span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Agent marquee ─── */
function AgentOrbit() {
  return (
    <div className="relative w-full overflow-hidden py-4">
      {/* Fade edges — match page bg exactly (neutral-950) */}
      <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-neutral-950 via-neutral-950/80 to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden">
        <motion.div
          className="flex items-center gap-14 w-max"
          animate={{ x: ["0%", "-33.333%"] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 25,
              ease: "linear",
            },
          }}
        >
          {marqueeAgents.map((agent, i) => (
            <div
              key={`${agent.label}-${i}`}
              className="flex items-center gap-2.5 shrink-0"
            >
              <agent.Icon className="text-neutral-600" size={16} />
              <span className="text-[11px] font-mono text-neutral-600 whitespace-nowrap">
                {agent.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Hero ─── */
export function AnimatedHero() {
  return (
    <section className="relative pt-20 pb-8 md:pt-32 md:pb-12 text-center overflow-hidden">
      {/* Subtle radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,255,255,0.02) 0%, transparent 100%)",
        }}
      />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none font-mono uppercase bg-gradient-to-b from-white via-neutral-300 to-neutral-700 bg-clip-text text-transparent pb-2 select-none">
          GEAR<span className="text-emerald-500/60">.</span>
        </h1>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-neutral-500 text-base md:text-lg leading-relaxed mt-4 max-w-md mx-auto"
      >
        The package manager for <span className="text-emerald-400/70">AI agent configs</span>.
        <br />
        <span className="text-neutral-400">
          Share, discover, and switch in seconds.
        </span>
      </motion.p>

      {/* Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10"
      >
        <TypingTerminal />
      </motion.div>

      {/* Agent marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="mt-12"
      >
        <div className="text-[10px] tracking-[0.3em] text-neutral-700 uppercase font-mono mb-3">
          Works with
        </div>
        <AgentOrbit />
      </motion.div>
    </section>
  );
}

/* ─── Quick Start ─── */
export function AnimatedQuickStart() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  const steps = [
    {
      n: 1,
      title: "Install the CLI",
      cmd: "npm install -g gearsh",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
    {
      n: 2,
      title: "Browse & install a gear",
      cmd: "gear switch @user/setup",
      description:
        "Pick a gear from below or search for the perfect agent config.",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    {
      n: 3,
      title: "Share your setup",
      cmd: "gear push",
      description:
        "Scan your local config and publish it for the community.",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <section ref={ref} className="py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center mb-10"
      >
        <h2 className="text-[11px] tracking-[0.3em] text-neutral-600 uppercase font-mono">
          Get started in 60 seconds
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.6,
              delay: 0.1 + i * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative rounded-xl border border-neutral-800/60 bg-neutral-900/20 p-5 hover:border-neutral-700/80 hover:bg-neutral-900/40 transition-all duration-300 flex flex-col"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800/60 flex items-center justify-center text-neutral-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all duration-300">
                {step.icon}
              </div>
              <div>
                <span className="text-[10px] font-mono text-neutral-700 uppercase">
                  Step {step.n}
                </span>
                <h3 className="text-sm font-medium text-neutral-300 group-hover:text-neutral-100 transition-colors">
                  {step.title}
                </h3>
              </div>
            </div>

            {step.description && (
              <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                {step.description}
              </p>
            )}

            {/* Command */}
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800/50 rounded-lg px-3 py-2.5 mt-auto group-hover:border-neutral-700/60 transition-colors">
              <code className="text-xs text-neutral-400 font-mono flex-1">
                <span className="text-neutral-600 group-hover:text-emerald-500/60 transition-colors">$ </span>
                {step.cmd}
              </code>
              <CopyButton text={step.cmd} />
            </div>

          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Generic scroll section ─── */
export function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
