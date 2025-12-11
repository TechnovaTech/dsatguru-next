import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const features = [
  "Price",
  "Time of online access",
  "Live Classes",
  "25+ Multistage Adaptive Practice Tests",
  "Content Videos with practice Quizzes",
  "Video and Text Explanation of all Questions",
  "Increase Score Guarantee*",
  "Study Plan (Weekly, Monthly)",
  "Free 4 days (2 Free full length Included) Trial",
  "Approximate Score Predictor",
  "Support 24/7",
];

const providers = [
  {
    name: "DSATGURU",
    highlight: true,
    values: ["$20+", "1 Month +", true, true, true, true, "+200", true, true, true, true],
  },
  {
    name: "KAPLAN",
    values: ["$199", "6 months", false, false, false, false, "+1", false, false, false, false],
  },
  {
    name: "PRINCETON",
    values: ["$299", "12 months", false, false, false, false, "+160", false, false, false, false],
  },
  {
    name: "PrepScholar",
    values: ["$397", "12 months", false, false, false, false, "", false, false, false, false],
  },
  {
    name: "Testive",
    values: ["$1596", "4 months", false, false, false, false, "", false, false, false, false],
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
    },
  }),
};

const ComparisonSection = () => (
  <section className="w-full bg-white py-16 pt-4 px-4 sm:px-6 lg:px-8 font-[Poppins] text-gray-800">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={fadeInUp}
      className="max-w-7xl mx-auto text-center mb-10 px-4"
    >
      <h2 className="text-blue-600 text-3xl font-bold uppercase mb-2">Compare DSATGURU vs. Other Prep Services</h2>
      <h3 className="text-3xl md:text-4xl font-extrabold mb-4">Comprehensive and Intuitive</h3>
      <p className="max-w-3xl mx-auto text-base md:text-lg">
        We are committed to supporting our students in reaching their full potential, empowering them to achieve exceptional scores and confidently pursue admission to the colleges of their choice.
      </p>
    </motion.div>
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={fadeInUp}
      className="overflow-x-auto px-4 max-w-7xl mx-auto"
    >
      <table className="min-w-[800px] w-full border border-gray-200 rounded-xl overflow-hidden text-sm shadow-lg bg-white">
        <thead>
          <tr className="bg-blue-100 text-gray-800">
            <th className="p-4 text-left font-semibold break-words">Feature</th>
            {providers.map((provider, idx) => (
              <th
                key={idx}
                className={`p-4 font-bold text-center ${provider.highlight ? "bg-blue-200 text-blue-800" : "text-gray-700"}`}
              >
                {provider.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, idx) => (
            <tr
              key={idx}
              className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
            >
              <td className="p-4 font-medium text-left text-gray-700 min-w-[160px] whitespace-normal break-words">
                {feature}
              </td>
              {providers.map((provider, pIdx) => (
                <td
                  key={pIdx}
                  className={`text-center p-4 ${provider.highlight ? "bg-blue-50 font-semibold" : ""}`}
                >
                  {typeof provider.values[idx] === "boolean" ? (
                    provider.values[idx] ? (
                      <FaCheckCircle className="mx-auto text-green-500" />
                    ) : (
                      <FaTimesCircle className="mx-auto text-red-400" />
                    )
                  ) : (
                    <span>{provider.values[idx] ? provider.values[idx] : <FaTimesCircle className="mx-auto text-red-400" />}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  </section>
);

export default ComparisonSection;