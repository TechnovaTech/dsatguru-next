'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

export default function ComparisonManagement() {
  const [comparison, setComparison] = useState({
    title: 'Compare DSATGURU vs. Other Prep Services',
    subtitle: 'Comprehensive and Intuitive',
    description: 'We are committed to supporting our students in reaching their full potential.',
    features: ['Price'],
    providers: [
      { name: 'DSATGURU', highlight: true, values: ['$20+'] }
    ]
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComparison()
  }, [])

  const fetchComparison = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/comparison', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success && data.data) {
        setComparison(data.data)
      }
    } catch (error) {
      console.error('Error fetching comparison:', error)
    }
  }

  const saveComparison = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(comparison)
      })
      
      if (res.ok) {
        alert('Comparison saved successfully!')
      } else {
        alert('Failed to save comparison')
      }
    } catch (error) {
      alert('Error saving comparison')
    } finally {
      setLoading(false)
    }
  }

  const addFeature = () => {
    setComparison(prev => ({
      ...prev,
      features: [...prev.features, 'New Feature'],
      providers: prev.providers.map(provider => ({
        ...provider,
        values: [...(provider.values || []), '']
      }))
    }))
  }

  const addProvider = () => {
    setComparison(prev => ({
      ...prev,
      providers: [...prev.providers, {
        name: 'New Provider',
        highlight: false,
        values: new Array(prev.features.length).fill('')
      }]
    }))
  }

  const updateFeature = (index, value) => {
    setComparison(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }))
  }

  const updateProvider = (providerIndex, field, value) => {
    setComparison(prev => ({
      ...prev,
      providers: prev.providers.map((provider, i) => 
        i === providerIndex ? { ...provider, [field]: value } : provider
      )
    }))
  }

  const updateProviderValue = (providerIndex, valueIndex, value) => {
    setComparison(prev => ({
      ...prev,
      providers: prev.providers.map((provider, i) => {
        if (i === providerIndex) {
          const newValues = [...(provider.values || [])]
          while (newValues.length <= valueIndex) {
            newValues.push('')
          }
          newValues[valueIndex] = value
          return { ...provider, values: newValues }
        }
        return provider
      })
    }))
  }

  const removeFeature = (index) => {
    setComparison(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
      providers: prev.providers.map(provider => ({
        ...provider,
        values: (provider.values || []).filter((_, i) => i !== index)
      }))
    }))
  }

  const removeProvider = (index) => {
    setComparison(prev => ({
      ...prev,
      providers: prev.providers.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Comparison Management</h1>
          <button
            onClick={saveComparison}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Header Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Section Header</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={comparison.title}
                onChange={(e) => setComparison(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
              <input
                type="text"
                value={comparison.subtitle}
                onChange={(e) => setComparison(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={comparison.description}
                onChange={(e) => setComparison(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Features</h2>
            <button
              onClick={addFeature}
              className="bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-2"
            >
              <FiPlus /> Add Feature
            </button>
          </div>
          <div className="space-y-3">
            {comparison.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={() => removeFeature(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Providers */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Providers</h2>
            <button
              onClick={addProvider}
              className="bg-green-600 text-white px-3 py-1 rounded flex items-center gap-2"
            >
              <FiPlus /> Add Provider
            </button>
          </div>
          
          {comparison.providers.map((provider, providerIndex) => (
            <div key={providerIndex} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="text"
                  value={provider.name}
                  onChange={(e) => updateProvider(providerIndex, 'name', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 font-semibold"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={provider.highlight}
                    onChange={(e) => updateProvider(providerIndex, 'highlight', e.target.checked)}
                  />
                  <span className="text-sm">Highlight</span>
                </label>
                <button
                  onClick={() => removeProvider(providerIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FiTrash2 />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {comparison.features.map((feature, valueIndex) => {
                  const value = (provider.values || [])[valueIndex] || ''
                  return (
                    <div key={valueIndex} className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">{feature}</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={typeof value === 'boolean' ? (value ? 'true' : 'false') : 'text'}
                          onChange={(e) => {
                            let newValue
                            if (e.target.value === 'true') newValue = true
                            else if (e.target.value === 'false') newValue = false
                            else newValue = value || ''
                            updateProviderValue(providerIndex, valueIndex, newValue)
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                        >
                          <option value="text">Text</option>
                          <option value="true">✅ Yes</option>
                          <option value="false">❌ No</option>
                        </select>
                        {typeof value !== 'boolean' && (
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateProviderValue(providerIndex, valueIndex, e.target.value)}
                            className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                            placeholder="Enter value"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          <div className="text-center mb-6">
            <h3 className="text-blue-600 text-2xl font-bold mb-2">{comparison.title}</h3>
            <h4 className="text-xl font-bold mb-2">{comparison.subtitle}</h4>
            <p className="text-gray-600">{comparison.description}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-blue-100">
                  <th className="p-3 text-left font-semibold">Feature</th>
                  {comparison.providers.map((provider, idx) => (
                    <th
                      key={idx}
                      className={`p-3 text-center font-bold ${
                        provider.highlight ? 'bg-blue-200 text-blue-800' : 'text-gray-700'
                      }`}
                    >
                      {provider.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.features.map((feature, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 font-medium text-gray-700">{feature}</td>
                    {comparison.providers.map((provider, pIdx) => {
                      const value = (provider.values || [])[idx]
                      return (
                        <td
                          key={pIdx}
                          className={`text-center p-3 ${
                            provider.highlight ? 'bg-blue-50 font-semibold' : ''
                          }`}
                        >
                          {typeof value === 'boolean' ? (
                            value ? <FaCheckCircle className="text-green-500 mx-auto" /> : <FaTimesCircle className="text-red-400 mx-auto" />
                          ) : value ? (
                            <span className="text-sm">{value}</span>
                          ) : (
                            <FaTimesCircle className="text-red-400 mx-auto" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}