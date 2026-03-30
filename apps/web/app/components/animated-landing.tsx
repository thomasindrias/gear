"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
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

// Duplicate for seamless loop
const marqueeAgents = [...agents, ...agents];

export function AnimatedHero() {
  return (
    <section className="pt-20 pb-16 md:pt-32 md:pb-24 text-center overflow-hidden">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-6xl md:text-8xl font-black tracking-tighter leading-none font-mono uppercase"
      >
        GEAR
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="text-neutral-500 text-lg md:text-xl leading-relaxed mt-4 max-w-xl mx-auto"
      >
        Share your AI agent setup. Discover others.
        <br />
        Install with a single command.
      </motion.p>

      {/* Command */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 inline-flex items-center gap-3 bg-neutral-900/60 border border-neutral-800 rounded-lg px-5 py-3"
      >
        <code className="text-sm text-neutral-300 font-mono">
          <span className="text-neutral-600">$ </span>
          npx gearsh switch @user/setup
        </code>
        <CopyButton text="npx gearsh switch @user/setup" />
      </motion.div>

      {/* Agent icons marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-10 relative"
      >
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

        <div className="overflow-hidden">
          <motion.div
            className="flex items-center gap-12 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 20,
                ease: "linear",
              },
            }}
          >
            {marqueeAgents.map((agent, i) => (
              <div
                key={`${agent.label}-${i}`}
                className="flex items-center gap-2.5 shrink-0"
              >
                <agent.Icon
                  className="text-neutral-600 group-hover:text-neutral-300 transition"
                  size={20}
                />
                <span className="text-xs font-mono text-neutral-600 whitespace-nowrap">
                  {agent.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

export function AnimatedQuickStart() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="pb-16 md:pb-20"
    >
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <div className="bg-neutral-900/40 px-5 py-3 border-b border-neutral-800">
          <h2 className="text-[11px] tracking-[0.2em] text-neutral-500 uppercase font-mono">
            Quick Start
          </h2>
        </div>
        <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {[
            {
              n: 1,
              title: "Install",
              cmd: "npm install -g gearsh",
            },
            {
              n: 2,
              title: "Browse & install",
              cmd: "gear switch @user/setup",
              description:
                "Pick a gear from the leaderboard below, or search for one.",
            },
            {
              n: 3,
              title: "Share yours",
              cmd: "gear push",
              description:
                "Scan your local agent config and publish it for others.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 20 }}
              animate={
                isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
              }
              transition={{
                duration: 0.5,
                delay: 0.15 + i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-600 bg-neutral-800 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {step.n}
                </span>
                <span className="text-sm font-medium text-neutral-300">
                  {step.title}
                </span>
              </div>
              {step.description && (
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {step.description}
                </p>
              )}
              <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded px-3 py-2 mt-auto">
                <code className="text-xs text-neutral-400 font-mono flex-1">
                  <span className="text-neutral-600">$ </span>
                  {step.cmd}
                </code>
                <CopyButton text={step.cmd} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

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
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
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
