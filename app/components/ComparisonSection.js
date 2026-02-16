'use client'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

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
}

export default function ComparisonSection() {
  const [comparisonData, setComparisonData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComparison()
  }, [])

  const fetchComparison = async () => {
    try {
      const res = await fetch('/api/admin/comparison')
      const data = await res.json()
      console.log('API Response:', data)
      
      if (data.success && data.data) {
        console.log('Using database data')
        setComparisonData(data.data)
      } else {
        console.log('No database data found')
        setComparisonData(null)
      }
    } catch (error) {
      console.error('Error fetching comparison:', error)
      setComparisonData(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="w-full bg-white py-16 pt-4 px-4 sm:px-6 lg:px-8 font-[Poppins] text-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
          </div>
        </div>
      </section>
    )
  }

  if (!comparisonData) {
    return (
      <section className="w-full bg-white py-16 pt-4 px-4 sm:px-6 lg:px-8 font-[Poppins] text-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600">No comparison data available. Please add data from admin panel.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full bg-white py-16 pt-4 px-4 sm:px-6 lg:px-8 font-[Poppins] text-gray-800">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInUp}
        className="max-w-7xl mx-auto text-center mb-10 px-4"
      >
        <h3 className="text-blue-600 text-3xl font-bold uppercase mb-2">{comparisonData.title}</h3>
        <h3 className="text-3xl md:text-4xl font-extrabold mb-4">{comparisonData.subtitle}</h3>
        <p className="max-w-3xl mx-auto text-base md:text-lg">
          {comparisonData.description}
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
              {comparisonData.providers.map((provider, idx) => (
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
            {comparisonData.features.map((feature, idx) => (
              <tr
                key={idx}
                className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <td className="p-4 font-medium text-left text-gray-700 min-w-[160px] whitespace-normal break-words">
                  {feature}
                </td>
                {comparisonData.providers.map((provider, pIdx) => {
                  const value = (provider.values || [])[idx]
                  return (
                    <td
                      key={pIdx}
                      className={`text-center p-4 ${provider.highlight ? "bg-blue-50 font-semibold" : ""}`}
                    >
                      {typeof value === 'boolean' ? (
                        value ? <FaCheckCircle className="mx-auto text-green-500" /> : <FaTimesCircle className="mx-auto text-red-400" />
                      ) : value ? (
                        <span className="text-sm">{value}</span>
                      ) : (
                        <FaTimesCircle className="mx-auto text-red-400" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}
