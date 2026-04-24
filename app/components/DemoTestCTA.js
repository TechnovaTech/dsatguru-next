'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { FiZap, FiArrowRight, FiClock, FiCheckCircle } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi'

export default function DemoTestCTA() {
  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 overflow-hidden">
      {/* Animated background orbs */}
      <motion.div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl"
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-3xl"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6"
            animate={{ boxShadow: ['0 0 20px rgba(59,130,246,0.3)', '0 0 40px rgba(139,92,246,0.5)', '0 0 20px rgba(59,130,246,0.3)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <HiSparkles className="text-yellow-300" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">100% Free · Instant Access</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Try a <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">Free DSAT Demo Test</span>
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto text-base md:text-lg">
            Experience the real DSAT interface. Two adaptive-style modules — Math + Reading & Writing — with instant scoring, detailed review and explanations.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative group"
        >
          {/* Glow ring */}
          <motion.div
            className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 transition duration-500"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            style={{ backgroundSize: '200% 200%' }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="relative bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { icon: <FiZap className="text-cyan-400" size={24} />, title: 'Instant start', desc: 'No signup. Just name + email.' },
                { icon: <FiClock className="text-purple-400" size={24} />, title: 'Real exam feel', desc: 'Timer, navigator, modules.' },
                { icon: <FiCheckCircle className="text-emerald-400" size={24} />, title: 'Full review', desc: 'Every question, explained.' }
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{f.title}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo-test" className="group/btn relative inline-flex items-center">
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-full blur-md opacity-75"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white font-semibold rounded-full shadow-2xl hover:shadow-cyan-500/50 transition-all">
                  <FiZap className="group-hover/btn:rotate-12 transition-transform" />
                  Start Free Demo Test
                  <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
                </span>
              </Link>
              <span className="text-sm text-gray-400">Takes just 20–40 min</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
