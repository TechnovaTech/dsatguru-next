'use client'
import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiSave, FiMove, FiList, FiGrid } from 'react-icons/fi'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { useToast } from '../ui/UIProvider'

export default function ComparisonManagement() {
  const toast = useToast()
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
  const [error, setError] = useState('')
  const [draggedIndex, setDraggedIndex] = useState(null)

  useEffect(() => {
    fetchComparison()
  }, [])

  const fetchComparison = async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/comparison')
      const data = await res.json()

      if (data.success && data.data) {
        setComparison(data.data)
      }
    } catch (error) {
      console.error('Error fetching comparison:', error)
      setError('Could not load comparison data from the server.')
    }
  }

  const saveComparison = async () => {
    try {
      setLoading(true)

      const res = await fetch('/api/admin/comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(comparison)
      })

      const result = await res.json()

      if (res.ok && result.success) {
        toast.success('Comparison saved successfully!')
        fetchComparison() // Refresh data
      } else {
        console.error('Save failed:', result)
        toast.error('Failed to save: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error saving comparison: ' + error.message)
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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    setComparison(prev => {
      const newFeatures = [...prev.features]
      const draggedFeature = newFeatures[draggedIndex]

      // Remove dragged feature
      newFeatures.splice(draggedIndex, 1)
      // Insert at new position
      newFeatures.splice(dropIndex, 0, draggedFeature)

      // Reorder provider values to match new feature order
      const newProviders = prev.providers.map(provider => {
        const newValues = [...(provider.values || [])]
        const draggedValue = newValues[draggedIndex]
        newValues.splice(draggedIndex, 1)
        newValues.splice(dropIndex, 0, draggedValue)
        return { ...provider, values: newValues }
      })

      return { ...prev, features: newFeatures, providers: newProviders }
    })

    setDraggedIndex(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">Comparison Management</h1>
            <p className="mt-1 text-sm text-slate-500">Edit the homepage comparison table</p>
          </div>
          <button
            onClick={saveComparison}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              onClick={fetchComparison}
              className="self-start rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        {/* Header Settings */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Section Header</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="comparison-title" className="block text-sm font-medium text-slate-600 mb-2">Title</label>
              <input
                id="comparison-title"
                type="text"
                value={comparison.title}
                onChange={(e) => setComparison(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="comparison-subtitle" className="block text-sm font-medium text-slate-600 mb-2">Subtitle</label>
              <input
                id="comparison-subtitle"
                type="text"
                value={comparison.subtitle}
                onChange={(e) => setComparison(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="comparison-description" className="block text-sm font-medium text-slate-600 mb-2">Description</label>
              <textarea
                id="comparison-description"
                value={comparison.description}
                onChange={(e) => setComparison(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">Features</h2>
            <button
              onClick={addFeature}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <FiPlus /> Add Feature
            </button>
          </div>
          <div className="space-y-3">
            {comparison.features.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiList size={22} />
                </div>
                <p className="text-sm font-medium text-slate-500">No features yet</p>
                <p className="mt-1 text-sm text-slate-400">Add a feature to build your comparison table.</p>
              </div>
            ) : (
              comparison.features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 rounded-lg border border-slate-200 p-2 transition-colors ${draggedIndex === index ? 'bg-indigo-50' : 'bg-white'}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="cursor-move text-slate-400 hover:text-slate-600">
                    <FiMove />
                  </div>
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    aria-label={`Feature ${index + 1}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => removeFeature(index)}
                    aria-label={`Remove feature ${index + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Providers */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900">Providers</h2>
            <button
              onClick={addProvider}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <FiPlus /> Add Provider
            </button>
          </div>

          {comparison.providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FiGrid size={22} />
              </div>
              <p className="text-sm font-medium text-slate-500">No providers yet</p>
              <p className="mt-1 text-sm text-slate-400">Add a provider to compare against your service.</p>
            </div>
          ) : (
            comparison.providers.map((provider, providerIndex) => (
              <div key={providerIndex} className="rounded-lg border border-slate-200 p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={provider.name}
                    onChange={(e) => updateProvider(providerIndex, 'name', e.target.value)}
                    aria-label={`Provider ${providerIndex + 1} name`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={provider.highlight}
                      onChange={(e) => updateProvider(providerIndex, 'highlight', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600">Highlight</span>
                  </label>
                  <button
                    onClick={() => removeProvider(providerIndex)}
                    aria-label={`Remove provider ${providerIndex + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <FiTrash2 />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {comparison.features.map((feature, valueIndex) => {
                    const value = (provider.values || [])[valueIndex] || ''
                    return (
                      <div key={valueIndex} className="flex flex-col">
                        <label className="text-xs text-slate-500 mb-1">{feature}</label>
                        <div className="flex items-center gap-2">
                          <select
                            key={`${providerIndex}-${valueIndex}-${value}`}
                            value={value === true ? 'true' : value === false ? 'false' : 'text'}
                            onChange={(e) => {
                              const selectedValue = e.target.value
                              let newValue

                              if (selectedValue === 'true') {
                                newValue = true
                              } else if (selectedValue === 'false') {
                                newValue = false
                              } else {
                                newValue = ''
                              }

                              updateProviderValue(providerIndex, valueIndex, newValue)
                            }}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="text">Text</option>
                            <option value="true">✅ Yes</option>
                            <option value="false">❌ No</option>
                          </select>
                          {value !== true && value !== false && (
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) => updateProviderValue(providerIndex, valueIndex, e.target.value)}
                              className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              placeholder="Enter value"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Preview</h2>
          <div className="text-center mb-6">
            <h3 className="text-indigo-600 text-2xl font-bold mb-2">{comparison.title}</h3>
            <h4 className="text-xl font-bold text-slate-900 mb-2">{comparison.subtitle}</h4>
            <p className="text-slate-600">{comparison.description}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-lg border border-slate-200">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Feature</th>
                  {comparison.providers.map((provider, idx) => (
                    <th
                      key={idx}
                      className={`p-3 text-center text-xs font-bold uppercase tracking-wider ${
                        provider.highlight ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'
                      }`}
                    >
                      {provider.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.features.map((feature, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-indigo-50/40">
                    <td className="p-3 font-medium text-slate-700">{feature}</td>
                    {comparison.providers.map((provider, pIdx) => {
                      const value = (provider.values || [])[idx]
                      return (
                        <td
                          key={pIdx}
                          className={`text-center p-3 ${
                            provider.highlight ? 'bg-indigo-50 font-semibold' : ''
                          }`}
                        >
                          {value === true ? (
                            <FaCheckCircle className="text-emerald-500 mx-auto" />
                          ) : value === false ? (
                            <FaTimesCircle className="text-rose-400 mx-auto" />
                          ) : value ? (
                            <span className="text-sm text-slate-700">{value}</span>
                          ) : (
                            <FaTimesCircle className="text-rose-400 mx-auto" />
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
