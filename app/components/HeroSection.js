'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaRegStar } from 'react-icons/fa'
import { BsCheck2Circle } from 'react-icons/bs'
import { SlGraph } from 'react-icons/sl'
import Image from 'next/image'
import FloatingContactButtons from './FloatingContactButtons'

const heroGradients = [
  "from-yellow-400/10 via-amber-600/90 to-orange-900",
  "from-blue-600/20 via-blue-800/70 to-blue-900",
  "from-emerald-900/10 via-teal-900/80 to-green-900",
]

const slidesData = [
  {
    title: "Maximize Your DSAT/PSAT Potential. Guaranteed*!",
    description: "Achieve 1420+ (1st-time students) or 200+ (repeat students).\nMost realistic and comprehensive SAT practice materials available.\nOur study plan targets gaps, boosting your score to the next level.\nReach your highest potential and secure your path to college of your choice.",
    features: [
      "Structured study plans tailored to your needs",
      "4000+ practice questions with explanations",
      "Real-time progress tracking and analytics",
    ],
    button: "Start your DSAT journey",
    note: "Limited Enrollment save your Spot now!!",
    image: "/hero-2.png",
    shimmer: {
      text: "Score Guarantee*",
      icon: <SlGraph size={16} className="text-white" />,
    },
    background: heroGradients[1],
    color: "blue",
  },
  {
    title: "Premium Prep\nAffordable Excellence",
    description: "High-quality DSAT preparation that fits your budget. Access the same elite resources used by top scorers without the premium price tag, making excellence accessible to all.",
    features: [
      "High-value practice resources",
      "Scholarship opportunities",
      "Flexible payment options",
    ],
    button: "View Course Options",
    note: "Limited Enrollment save your Spot now!!",
    image: "/hero-3.png",
    shimmer: {
      text: "Best Value",
      icon: <FaRegStar size={16} className="text-white" />,
    },
    background: heroGradients[2],
    color: "green",
  },
  {
    title: "Digital SAT Mastery\nTest Day Excellence",
    description: "Prepare for the Digital SAT format with confidence. Our specialized tools simulate the exact testing environment and question types you'll encounter on exam day.",
    features: [
      "Digital interface practice",
      "Timed section strategies",
      "Adaptive question training",
    ],
    button: "Begin your Prep Now",
    note: "Limited Enrollment save your Spot now!!",
    image: "/hero-1.png",
    shimmer: {
      text: "Test Day Ready",
      icon: <BsCheck2Circle size={16} className="text-white" />,
    },
    background: heroGradients[0],
    color: "amber",
  },
]

export default function HeroSection({ landingPlanRef }) {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  
  useEffect(() => {
    const timeout = setInterval(() => {
      setDirection(1)
      setCurrent((prev) => (prev + 1) % slidesData.length)
    }, current == 0 ? 6000 : 5000)
    return () => clearInterval(timeout)
  }, [])

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      position: "absolute",
      width: "100%",
    }),
    center: {
      x: 0,
      opacity: 1,
      position: "relative",
      width: "100%",
      transition: { duration: 1.3 },
    },
    exit: (direction) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      position: "absolute",
      width: "100%",
      transition: { duration: 1.3 },
    }),
  }

  return (
    <section className="relative w-full min-h-[70vh] h-auto overflow-hidden">
      <FloatingContactButtons />
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 min-h-[70vh] flex flex-col md:flex-row"
        >
          {/* Background */}
          <div className="absolute inset-0 flex md:justify-end justify-center">
            <Image
              src={slidesData[current].image}
              alt="Hero background"
              width={1600}
              height={900}
              className="w-full md:w-1/2 h-full object-cover object-center"
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
            />
            <div className={`absolute inset-0 bg-gradient-to-l ${slidesData[current].background}`}></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto w-full h-full flex items-center justify-center md:justify-start px-6 min-h-[70vh]">
            <div className={`w-full space-y-6 text-white text-center md:text-left md:w-2/3 ${current == 1 && "max-w-xl"}`}>
              <div className="relative inline-block uppercase tracking-wider text-xs px-4 py-3 border-2 border-white/80 rounded-full overflow-hidden bg-white/10">
                <span className="relative z-10 text-white flex items-center"><span className="mr-2">{slidesData[current].shimmer.icon}</span>{slidesData[current].shimmer.text}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
              <h1 className="text-2xl md:text-5xl font-bold whitespace-pre-line leading-tight">
                {slidesData[current].title}
              </h1>
              <p className="mt-4 text-gray-300 text-md md:text-lg whitespace-pre-line">
                {slidesData[current].description}
              </p>
              <ul className="mt-6 space-y-2 text-gray-300 text-sm">
                {slidesData[current].features?.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 justify-center md:justify-start">
                    <span className="text-blue-300">✔</span> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col items-center md:items-start">
                <button
                  onClick={() => {
                    landingPlanRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                  className={`bg-transparent border border-${slidesData[current].color}-200 hover:bg-white/10 cursor-pointer transition text-white px-6 py-3 rounded-md text-sm font-semibold shadow-lg`}
                >
                  {slidesData[current].button}
                </button>
                <p className="text-xs mt-2 text-gray-400">
                  {slidesData[current].note}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
