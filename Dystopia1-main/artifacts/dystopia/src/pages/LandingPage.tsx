import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";

const FEATURES = [
  {
    label: "10 Citizen Archetypes",
    description: "From transport workers to salaried professionals — every voice accounted for.",
  },
  {
    label: "Real-time Debates",
    description: "Watch AI citizens argue, agree, and organise in subreddit-style feeds.",
  },
  {
    label: "Protest Risk Index",
    description: "Quantified risk of public unrest before a policy is announced.",
  },
  {
    label: "Coalition Tracking",
    description: "Identify which demographic groups are forming against — or for — your policy.",
  },
  {
    label: "5 Indian Cities",
    description: "Mumbai, Delhi, Bengaluru, Chennai, Hyderabad — each with its own pulse.",
  },
  {
    label: "3D City Twin",
    description: "A living isometric city shows agents reacting to your decisions in real time.",
  },
];

const STATS = [
  { value: "10", label: "Citizen archetypes" },
  { value: "5", label: "Major metros" },
  { value: "100+", label: "Debate messages per run" },
  { value: "<60s", label: "Simulation time" },
];

function HeroGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[600px] opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, #f59e0b44 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute left-1/4 bottom-0 w-[500px] h-[400px] opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 30% 100%, #06b6d444 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.08 },
  }),
};

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050507] text-white overflow-x-hidden">
      <HeroGlow />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 backdrop-blur-xl border-b border-white/5 bg-[#050507]/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <span className="text-black text-xs font-black">D</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Dystopia</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <button className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2 rounded-full">
              Sign in
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="text-sm font-medium bg-amber-500 hover:bg-amber-400 text-black px-5 py-2 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]">
              Get started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        style={{ y: heroY }}
        className="relative flex flex-col items-center justify-center min-h-screen text-center px-6 pt-24"
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-8 backdrop-blur"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Now in private beta — India-first policy intelligence
          <ChevronRight className="w-3 h-3 opacity-60" />
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.03em] leading-[1.05] max-w-5xl"
          style={{ fontFamily: "-apple-system, 'SF Pro Display', Inter, sans-serif" }}
        >
          Know what India
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            will say
          </span>
          {" "}before{" "}
          <br className="hidden md:block" />
          you decide.
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="mt-8 text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed"
        >
          Dystopia simulates how real citizens — transport workers, students, traders, salaried professionals — react to your policy before it becomes law. Prevent protests. Build consensus. Govern with foresight.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="mt-12 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/sign-up">
            <button
              data-testid="button-get-started"
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-base px-8 py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-amber-500/20"
            >
              Open Consilium
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/sign-in">
            <button className="flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white font-medium text-base px-8 py-4 rounded-2xl border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur">
              Sign in
            </button>
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={4}
          className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-16"
        >
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight text-amber-400">{s.value}</div>
              <div className="mt-1 text-xs text-white/40 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20"
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/20" />
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        </motion.div>
      </motion.section>

      {/* Feature grid */}
      <section className="relative px-6 py-32 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-xs text-amber-400/80 uppercase tracking-widest font-medium mb-4">Platform Capabilities</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Everything you need to{" "}
            <span className="text-white/40">govern with confidence.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-3xl overflow-hidden border border-white/5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="bg-[#0a0b0f] p-8 hover:bg-[#0e1018] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-5 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.label}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative px-6 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4">How It Works</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Three steps. Total clarity.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: "01", title: "Define the policy", desc: "Describe your proposed policy in plain language. Select the target city." },
            { step: "02", title: "Run the simulation", desc: "AI agents embodying 10 citizen archetypes generate authentic reactions and debates." },
            { step: "03", title: "Read the Consilium", desc: "Get sentiment scores, protest risk indices, coalition maps, and key concerns — all before rollout." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-6xl font-black text-white/5 mb-4 leading-none">{item.step}</div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              {i < 2 && (
                <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 text-white/10">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center relative"
        >
          <div
            className="absolute inset-0 -z-10 rounded-3xl opacity-40"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 50%, #f59e0b22 0%, transparent 70%)",
            }}
          />
          <p className="text-xs text-amber-400/80 uppercase tracking-widest font-medium mb-6">Ready to start?</p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Stop guessing. Start governing.
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            The next policy failure isn't inevitable. It's predictable. Give your team the tools to see it coming.
          </p>
          <Link href="/sign-up">
            <button className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-lg px-10 py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-amber-500/30">
              Access Consilium — it's free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/20 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-500 flex items-center justify-center">
            <span className="text-black text-[9px] font-black">D</span>
          </div>
          <span>Dystopia Intelligence Platform</span>
        </div>
        <span>Built for India's policymakers</span>
      </footer>
    </div>
  );
}
