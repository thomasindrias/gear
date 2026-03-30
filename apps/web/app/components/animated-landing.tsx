"use client";

import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
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
  { prompt: true, text: "gear switch @indrias/full-stack", delay: 0 },
  { prompt: false, text: "Downloading gearfile...", delay: 1800 },
  { prompt: false, text: "Installing 4 plugins, 12 skills, 3 MCP servers", delay: 2600 },
  { prompt: false, text: "Applying model override: claude-opus-4-20250514", delay: 3400 },
  { prompt: false, text: "Done. Your agent is ready.", delay: 4200 },
];

function TypingTerminal() {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<number>(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (isInView && !started) {
      setStarted(true);
    }
  }, [isInView, started]);

  useEffect(() => {
    if (!started) return;

    const currentLine = terminalLines[visibleLines];
    if (!currentLine) return;

    const startDelay = visibleLines === 0 ? 600 : 80;

    if (currentLine.prompt) {
      // Type character by character
      if (typedChars < currentLine.text.length) {
        const speed = 30 + Math.random() * 40;
        const timer = setTimeout(() => setTypedChars((c) => c + 1), typedChars === 0 ? startDelay : speed);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setVisibleLines((l) => l + 1);
          setTypedChars(0);
        }, 500);
        return () => clearTimeout(timer);
      }
    } else {
      // Appear instantly after delay
      const timer = setTimeout(() => {
        setVisibleLines((l) => l + 1);
        setTypedChars(0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [started, visibleLines, typedChars]);

  return (
    <div ref={ref} className="w-full max-w-lg mx-auto">
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800/60 bg-neutral-900/30">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
          </div>
          <span className="text-[10px] font-mono text-neutral-600 ml-2">terminal</span>
        </div>
        {/* Content */}
        <div className="p-4 font-mono text-[13px] leading-6 min-h-[180px]">
          {terminalLines.slice(0, visibleLines + 1).map((line, i) => (
            <div key={i} className="flex">
              {line.prompt ? (
                <>
                  <span className="text-emerald-500/70 mr-2 select-none">$</span>
                  <span className="text-neutral-200">
                    {i === visibleLines
                      ? line.text.slice(0, typedChars)
                      : line.text}
                    {i === visibleLines && typedChars < line.text.length && (
                      <span className="cursor-blink text-emerald-400 ml-px">|</span>
                    )}
                  </span>
                </>
              ) : i <= visibleLines ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={
                    i === visibleLines - 1 && line.text.startsWith("Done")
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

/* ─── Orbiting agent ring ─── */
function AgentOrbit() {
  return (
    <div className="relative w-full overflow-hidden py-6">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden">
        <motion.div
          className="flex items-center gap-16 w-max"
          animate={{ x: ["0%", "-33.333%"] }}
          transition={{
            x: { repeat: Infinity, repeatType: "loop", duration: 25, ease: "linear" },
          }}
        >
          {marqueeAgents.map((agent, i) => (
            <div key={`${agent.label}-${i}`} className="flex items-center gap-3 shrink-0 group">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-neutral-600 group-hover:bg-neutral-800/50 transition-all duration-300">
                <agent.Icon className="text-neutral-500 group-hover:text-neutral-200 transition-colors duration-300" size={18} />
              </div>
              <span className="text-xs font-mono text-neutral-600 group-hover:text-neutral-400 whitespace-nowrap transition-colors duration-300">
                {agent.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Counter animation ─── */
function AnimatedCounter({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold font-mono text-neutral-100">{value}</div>
      <div className="text-[11px] font-mono text-neutral-600 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ─── Hero ─── */
export function AnimatedHero() {
  return (
    <section className="relative pt-20 pb-8 md:pt-32 md:pb-12 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Title with gradient */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-none font-mono uppercase bg-gradient-to-b from-white via-neutral-200 to-neutral-600 bg-clip-text text-transparent pb-2 select-none">
          GEAR
        </h1>
      </motion.div>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-neutral-500 text-base md:text-lg leading-relaxed mt-4 max-w-md mx-auto"
      >
        The package manager for AI agent configs.
        <br />
        <span className="text-neutral-400">Share, discover, and switch in seconds.</span>
      </motion.p>

      {/* Terminal demo */}
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
        className="mt-10"
      >
        <div className="text-[10px] tracking-[0.3em] text-neutral-700 uppercase font-mono mb-4">
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
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      description: "Pick a gear from below or search for the perfect agent config.",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    {
      n: 3,
      title: "Share your setup",
      cmd: "gear push",
      description: "Scan your local config and publish it for the community.",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            className="group relative rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 hover:border-neutral-700 hover:bg-neutral-900/60 transition-all duration-300 flex flex-col"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-neutral-400 group-hover:text-neutral-200 group-hover:border-neutral-600 transition-all duration-300">
                {step.icon}
              </div>
              <div>
                <span className="text-[10px] font-mono text-neutral-600 uppercase">Step {step.n}</span>
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
            <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 rounded-lg px-3 py-2.5 mt-auto group-hover:border-neutral-700 transition-colors">
              <code className="text-xs text-neutral-400 font-mono flex-1">
                <span className="text-emerald-600/60">$ </span>
                {step.cmd}
              </code>
              <CopyButton text={step.cmd} />
            </div>

            {/* Connector line between cards (desktop) */}
            {i < 2 && (
              <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1" className="text-neutral-700" />
                </svg>
              </div>
            )}
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
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
