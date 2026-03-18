'use client'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function IntroSection() {
  return (
    <section className="w-full bg-gradient-to-br from-blue-50 to-white py-16 px-4 sm:px-6 lg:px-16">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="w-full lg:w-1/2 flex justify-center"
        >
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="/hero-2.png"
              alt="SAT Preparation - DSATGURU"
              width={600}
              height={480}
              className="w-full h-auto object-cover"
              priority
            />
            <div className="absolute bottom-5 left-5 bg-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">10+</div>
              <div>
                <div className="text-xs font-bold text-gray-800">Years of Experience</div>
                <div className="text-xs text-gray-500">Trusted SAT Prep</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          viewport={{ once: true }}
          className="w-full lg:w-1/2"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-5">
            Get Closer to Your Dream College with{' '}
            <span className="text-blue-600">Smarter SAT Preparation</span>
          </h1>
          <p className="text-base text-gray-600 leading-relaxed mb-5">
            An innovative SAT preparation platform, empowering students with personalized SAT exam prep, advanced study tools, and proven strategies. We offer structured courses, live and online classes, adaptive practice tests, and over 4,000 realistic questions to strengthen your weak areas and maximize your score.
          </p>
          <p className="text-base text-gray-600 leading-relaxed mb-8">
            With over 10 years of experience, we focus on what truly matters — helping students make the most of their limited time and achieve their highest college-bound potential.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { number: '4,000+', label: 'Practice Questions' },
              { number: '10+', label: 'Years Experience' },
              { number: '99%+', label: 'Success Rate' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 text-center">
                <div className="text-2xl font-extrabold text-blue-600">{stat.number}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
