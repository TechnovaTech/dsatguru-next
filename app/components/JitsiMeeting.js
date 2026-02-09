'use client'
import { useEffect, useRef, useState } from 'react'
import { FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi'

export default function JitsiMeeting({ roomName, displayName, email, onClose, isAdmin = false }) {
  const jitsiContainerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(true)
  const [isModerator, setIsModerator] = useState(false)

  useEffect(() => {
    // Load Jitsi script
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => {
      setLoading(false)
      initializeJitsi()
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup script
      document.body.removeChild(script)
      if (window.jitsiApi) {
        window.jitsiApi.dispose()
      }
    }
  }, [])

  const initializeJitsi = () => {
    if (!window.JitsiMeetExternalAPI) return

    const domain = 'meet.jit.si'
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: displayName,
        email: email
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
          'security'
        ]
      }
    }

    const api = new window.JitsiMeetExternalAPI(domain, options)
    window.jitsiApi = api

    api.addEventListeners({
      // videoConferenceLeft: () => {
      //   if (onClose) onClose()
      // },
      // readyToClose: () => {
      //   if (onClose) onClose()
      // },
      participantRoleChanged: (event) => {
        if (event.role === 'moderator') {
          setIsModerator(true)
          // Auto-hide help when they become moderator
          if (isAdmin) setShowHelp(false)
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="bg-gray-900 p-4 flex justify-between items-center text-white border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Live Class: {roomName}</h2>
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-2 text-sm bg-blue-900/50 hover:bg-blue-900 text-blue-200 px-3 py-1.5 rounded transition-colors"
          >
            <FiInfo /> {showHelp ? 'Hide Help' : 'Show Help'}
          </button>
        </div>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
        >
          Exit Class
        </button>
      </div>
      <div className="flex-1 relative bg-gray-900">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Loading Jitsi Meet...</p>
            </div>
          </div>
        )}
        
        {/* Help Overlay */}
        {showHelp && !loading && (
          <div className="absolute top-4 left-4 z-10 bg-white/95 p-5 rounded-lg shadow-xl max-w-md border-l-4 border-blue-500 text-gray-800 backdrop-blur-sm animate-fade-in">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2 text-blue-800">
                <FiAlertTriangle className="text-amber-500" /> 
                {isAdmin ? 'Teacher Instructions' : 'Student Instructions'}
              </h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="space-y-3 text-sm leading-relaxed">
              {isAdmin ? (
                /* Admin Instructions */
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <p className="font-bold text-blue-900 mb-1">👨‍🏫 You are the Host</p>
                  <p className="text-blue-800">
                    If you see <span className="font-semibold">"Waiting for moderator"</span>:
                    <br/>
                    1. Click the blue <span className="font-bold bg-blue-200 px-1 rounded text-blue-900">Log-in</span> button in the center.
                    <br/>
                    2. Sign in with Google/GitHub to claim host rights.
                    <br/>
                    3. Once logged in, the class will start automatically.
                  </p>
                  {isModerator && (
                    <div className="mt-2 p-2 bg-green-100 text-green-800 rounded font-bold text-center">
                      ✅ You are now the Moderator
                    </div>
                  )}
                </div>
              ) : (
                /* Student Instructions */
                <div className="bg-gray-50 p-3 rounded border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">👨‍🎓 Student Access</p>
                  <p className="text-gray-700">
                    Please wait for the teacher to join.
                    <br/>
                    You do <strong>NOT</strong> need to log in.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-gray-500 italic mt-2 border-t pt-2">
                * If the login popup is blocked, please check your browser's address bar.
              </p>
            </div>
          </div>
        )}

        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
