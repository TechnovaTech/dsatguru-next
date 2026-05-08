'use client'
import { useState, useEffect } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer
} from '@livekit/components-react'
import '@livekit/components-styles'
import { FiX, FiLoader } from 'react-icons/fi'

export default function LiveKitMeeting({ roomName, displayName, onClose, isAdmin = false }) {
  const [token, setToken] = useState(null)
  const [wsUrl, setWsUrl] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const authToken = localStorage.getItem('token')
        const res = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(displayName)}`,
          { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
        )
        if (!res.ok) throw new Error('Failed to get meeting token')
        const data = await res.json()
        setToken(data.token)
        setWsUrl(data.wsUrl)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchToken()
  }, [roomName, displayName])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <FiLoader className="animate-spin w-10 h-10 mx-auto mb-4" />
          <p>Joining meeting...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-semibold mb-2">Failed to join meeting</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={onClose} className="bg-gray-800 text-white px-6 py-2 rounded">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <div>
          <span className="font-semibold">{roomName}</span>
          {isAdmin && (
            <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded">Host</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          title="Leave meeting"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={onClose}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  )
}
