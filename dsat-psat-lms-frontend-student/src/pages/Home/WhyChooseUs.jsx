// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";
import {
  MdScore,
  MdViewInAr,
  MdVerified,
  MdLiveTv,
  MdStars,
  MdQuiz,
  MdOutlineSchool,
  MdPerson,
  MdLibraryBooks,
  MdBuild,
  MdTimeline,
  MdArrowForward,
} from "react-icons/md";

const points = [
  "Comprehensive research-backed content specifically tailored for the Digital SAT",
  "Guaranteed score improvement backed by our confidence in our teaching methods",
  "Simple, efficient, affordable program that empowers students with resources to succeed",
  "Multiple learning options including live online courses, practice tests, and individual tutoring",
];

const highlightCards = [
  {
    icon: <MdScore size={28} className="text-blue-600" />,
    title: "Score Guarantee",
    description:
      "We guarantee a 200+ point boost if you're below 1220 or a score above 1420+ for first-time test takers*.",
  },
  {
    icon: <MdViewInAr size={28} className="text-purple-600" />,
    title: "Realistic Adaptive Tests",
    description:
      "Our questions mimic the DSAT/PSAT format, giving you test-day confidence.",
  },
  {
    icon: <MdVerified size={28} className="text-green-600" />,
    title: "Focused Topic Coverage",
    description:
      "We tailor our prep to exactly what's needed on the Digital SAT—nothing more, nothing less.",
  },
  {
    icon: <MdLiveTv size={28} className="text-rose-600" />,
    title: "Experienced Teachers",
    description: "Learn from instructors who know the Digital SAT inside out.",
  },
];

const featuresTop = [
  {
    icon: <MdLibraryBooks size={24} />,
    title: "4000+",
    subtitle: "Practice Questions",
  },
  { icon: <MdQuiz size={24} />, title: "25+", subtitle: "Adaptive Tests" },
  {
    icon: <MdLiveTv size={24} />,
    title: "Live Prep",
    subtitle: "Bootcamp & Intense",
  },
  { icon: <MdPerson size={24} />, title: "One-on-One", subtitle: "Tutoring" },
  { icon: <MdScore size={24} />, title: "Guaranteed", subtitle: "Score Boost" },
];

const featuresBottom = [
  {
    icon: <MdOutlineSchool size={36} className="text-blue-600" />,
    title: "Comprehensive SAT Material",
    description:
      "Detailed lessons and practice content that reflect the actual DSAT structure for optimal preparation.",
  },
  {
    icon: <MdBuild size={36} className="text-purple-600" />,
    title: "Custom Quiz Builder",
    description:
      "Build your own quizzes based on topics and difficulty to strengthen understanding and retention.",
  },
  {
    icon: <MdTimeline size={36} className="text-green-600" />,
    title: "Track Progress Effectively",
    description:
      "Visual dashboards and performance trends help guide your next study steps and goals.",
  },
];

const neomorphCards = [
  {
    icon: <MdViewInAr size={24} className="text-blue-600" />,
    title: "Realistic Adaptive Practice",
  },
  {
    icon: <MdVerified size={24} className="text-purple-600" />,
    title: "Focused Topic Coverage",
  },
  {
    icon: <MdLiveTv size={24} className="text-green-600" />,
    title: "Expert Instruction",
  },
];

const WhyChooseUsSection = ({ landingPlanRef }) => (
  <section className="w-full bg-gradient-to-br from-blue-50 via-white to-indigo-100 py-20 px-4 sm:px-6 lg:px-16 font-[Poppins] text-gray-800 relative">
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
      <div className="grid sm:grid-cols-2 gap-6">
        {highlightCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            viewport={{ once: true, amount: 0.3 }}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 mb-4">
              {card.icon}
            </div>
            <h4 className="text-md font-semibold mb-1 text-gray-800">
              {card.title}
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {card.description}
            </p>
          </motion.div>
        ))}
      </div>
      <div>
        <motion.h2
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-blue-600 text-3xl font-bold uppercase mb-2"
        >
          WHY CHOOSE US
        </motion.h2>
        <motion.h3
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-extrabold mb-4"
        >
          Why Choose DSATGURU?
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-base md:text-lg text-gray-700 mb-6"
        >
          SAT prep typically covers limited topics in Math and English. DSATGURU
          has researched the Digital SAT extensively and created a comprehensive
          preparation system that helps you perform better than your best.
        </motion.p>
        <ul className="space-y-3 mb-6">
          {points.map((point, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              viewport={{ once: true }}
              className="flex items-start gap-3 text-sm text-gray-700"
            >
              <FaCheckCircle className="text-green-500 mt-1" />
              <span>{point}</span>
            </motion.li>
          ))}
        </ul>
        <motion.button
          whileHover={{ scale: 1.03 }}
          onClick={() =>
            landingPlanRef.current.scrollIntoView({ behavior: "smooth" })
          }
          className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-md shadow hover:bg-blue-700 transition"
        >
          Start Your DSAT Prep Journey
        </motion.button>
      </div>
    </div>

    {/* Neomorphism Rectangle moved here */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      viewport={{ once: true }}
      className="mt-20 mx-auto max-w-7xl rounded-2xl bg-white/30 backdrop-blur-md border border-gray-300 shadow-inner shadow-gray-200 w-full"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white flex items-center justify-center shadow-lg">
            <MdStars size={24} />
          </div>
          <h4 className="text-xl font-bold mt-4 mb-2 text-gray-800">
            We Guarantee a Higher Score
          </h4>
          <p className="text-sm md:text-base text-gray-700 text-center max-w-3xl">
            We are confident in the quality of our content and teaching methods.
            DSATGURU guarantees an improvement in your score. Our platform is
            simple, efficient, and affordable.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 max-w-4xl mx-auto">
          {neomorphCards.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-white rounded-xl shadow p-4"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                {item.icon}
              </div>
              <p className="text-sm font-semibold text-gray-800 text-center">
                {item.title}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center mt-6">
          *Score improvement guarantee applies to students who complete the
          recommended program requirements.
        </p>
      </div>
    </motion.div>

    {/* Feature Section Heading */}
    <div className="max-w-3xl mx-auto text-center mt-24 mb-10">
      <h3 className="text-blue-600 text-3xl font-bold uppercase mb-1">
        Features That Make the Difference
      </h3>
      <h4 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
        Effective Tools for a Great Score
      </h4>
      <p className="text-sm md:text-base text-gray-600">
        Our comprehensive toolkit is designed to optimize your study time and
        maximize your results.
      </p>
    </div>

    {/* Top Feature Summary */}
    <div className="mt-6 max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 px-4 text-center">
      {featuresTop.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true }}
          className="flex flex-col items-center bg-white shadow rounded-lg py-6 px-4 hover:shadow-md transition"
        >
          <div className="mb-2 text-blue-600">{f.icon}</div>
          <h5 className="text-sm font-bold text-gray-700">{f.title}</h5>
          <p className="text-xs text-gray-500">{f.subtitle}</p>
        </motion.div>
      ))}
    </div>

    {/* Bottom Full-Width Feature Cards */}
    <div className="mt-20 max-w-6xl mx-auto grid gap-6 px-4">
      {[...featuresBottom].map((item, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.2 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center bg-white rounded-xl shadow-md p-6 gap-6"
        >
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            {item.icon}
          </div>
          <div className="text-center sm:text-left">
            <h5 className="text-md font-bold text-gray-800 mb-1">
              {item.title}
            </h5>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="mt-20 max-w-7xl mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white px-8 py-12 shadow-lg text-center relative overflow-hidden"
    >
      <h4 className="text-2xl md:text-3xl font-extrabold mb-3">
        Experience our power learning tool
      </h4>
      <p className="text-sm md:text-base mb-6 max-w-xl mx-auto">
        Our comprehensive DSAT/PSAT prep tools are designed to maximize your
        score and ensure your success.
      </p>
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={() => {
          landingPlanRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
        className="inline-flex cursor-pointer items-center gap-2 bg-white text-blue-600 font-bold px-6 py-3 rounded-full shadow hover:shadow-xl transition"
      >
        Let's Start <MdArrowForward className="text-lg animate-pulse" />
      </motion.button>
      <p className="text-xs text-white/80 mt-6 max-w-md mx-auto">
        *Score improvement guarantee applies to students who complete the
        recommended program requirements.
      </p>
    </motion.div>
  </section>
);

export default WhyChooseUsSection;
