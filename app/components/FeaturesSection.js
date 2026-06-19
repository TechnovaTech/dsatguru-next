'use client'
import { motion } from 'framer-motion'
import { FaLaptopCode, FaVideo, FaUserGraduate } from 'react-icons/fa'
import Image from 'next/image'

const features = [
  {
    icon: <FaLaptopCode size={24} />,
    title: 'Realistic Immersive Interface',
    description:
      'Our interface mirrors the official DSAT exam, offering a realistic environment to build familiarity and confidence for peak test performance.',
    gradient: 'from-indigo-600 to-indigo-700',
  },
  {
    icon: <FaVideo size={24} />,
    title: 'Video and Text Questions and Answers',
    description:
      'We provide official-style questions with detailed explanations in both video and text, helping students understand concepts clearly and confidently.',
    gradient: 'from-blue-600 to-blue-700',
  },
  {
    icon: <FaUserGraduate size={24} />,
    title: 'Self-Study, Live Prep or One-on-One',
    description:
      "Whether it's self-paced learning, live classes, or 1-on-1 tutoring—DSATGURU supports every learning style with practice tests and personalized help.",
    gradient: 'from-emerald-500 to-teal-500',
  },
]

export default function FeaturesSection() {
  return (
    <section className="relative w-full bg-gradient-to-b from-white to-slate-50 px-6 pb-14 pt-24 text-slate-800 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        {/* Top: intro text + image, balanced */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              Study Smarter
            </span>
            <h3 className="mt-5 text-3xl font-extrabold text-slate-900 md:text-4xl">
              Elevate Your <span className="dg-gradient-text">SAT Preparation</span>
            </h3>
            <p className="mt-4 text-base text-slate-600 md:text-lg">
              SAT exam preparation becomes much easier if you follow the right method. At DSATGURU, we focus on effective
              and organized methods that actually work, helping you study smarter, not harder.
            </p>
            <p className="mt-3 text-base text-slate-600 md:text-lg">
              Our live online SAT study courses let you practice at your own pace while building strong fundamentals.
              With interactive SAT test prep methods, we guide you step by step to build your confidence and perform your
              best on the exam.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            viewport={{ once: true, amount: 0.3 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-indigo-400/25 to-blue-400/25 blur-2xl" />
            <Image
              src="/560aa162-2d99-44f3-86e2-0199644c37ab.png"
              alt="Elevate your SAT preparation with DSATGURU — smarter Digital SAT study methods"
              width={1536}
              height={1024}
              className="relative w-full rounded-2xl border border-white/60 object-contain shadow-2xl"
              sizes="(min-width: 1024px) 45vw, 90vw"
            />
          </motion.div>
        </div>

        {/* Below: feature cards in a row */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              viewport={{ once: true, amount: 0.3 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div
                className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg transition-transform group-hover:scale-110`}
              >
                {feature.icon}
              </div>
              <h4 className="mb-1 mt-5 text-base font-bold text-slate-800">{feature.title}</h4>
              <p className="text-sm leading-relaxed text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
