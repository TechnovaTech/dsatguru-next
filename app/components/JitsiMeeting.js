'use client'
import { useEffect, useRef, useState } from 'react'
import { FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi'

export default function JitsiMeeting({ roomName, displayName, email, onClose, isAdmin = false }) {
  const jitsiContainerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(true)
  const [isModerator, setIsModerator] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)

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
    
    // Define restricted buttons for students - Restored features
    const studentToolbarButtons = [
      'hangup', 'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
      'fodeviceselection', 'profile', 'chat',
      'settings', 'raisehand', 'videoquality', 'filmstrip', 
      'feedback', 'stats', 'shortcuts', 'tileview', 
      'videobackgroundblur', 'help', 'whiteboard'
    ]

    // Define full toolbar for admins with explicit buttons - Restored Security & Stats
    const adminToolbarButtons = [
      'hangup', 'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
      'fodeviceselection', 'profile', 'chat', 
      'security', 'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
      'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
      'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
    ]

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
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        enableClosePage: false,
        // Enable recording and file sharing
        fileRecordingServiceEnabled: true,
        liveStreamingEnabled: true,
        enableTranscription: true,
        enableFileSharing: true,
        hiddenPremeetingButtons: [],
        toolbarButtons: isAdmin ? adminToolbarButtons : studentToolbarButtons,
        
        // Critical for captions to appear
        transcription: {
          enabled: true,
          useAppLanguage: true,
          preferredLanguage: 'en-US',
          disableStartForAll: false,
          enableCaptionChange: true
        },
        
        localRecording: {
          enabled: true,
          format: 'flac'
        },
        
        // Force file sharing in chat
        enableFeaturesBasedOnToken: false,
        fileRecordingsEnabled: true,
        // dropbox: {
        //    appKey: 'dummy-key-to-force-ui' 
        // }
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        // Explicitly define toolbar buttons for both roles (Legacy support)
        TOOLBAR_BUTTONS: isAdmin ? adminToolbarButtons : studentToolbarButtons,
        SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar', 'sounds'],
        // Enable file sharing UI
        ENABLE_FILE_SHARING: true
      }
    }

    const api = new window.JitsiMeetExternalAPI(domain, options)
    window.jitsiApi = api

    // Handle redirection logic
    const handleExit = () => {
        // Only redirect if user has actually joined the conference to prevent
        // premature redirects during login/auth flow
        if (!hasJoined) {
            console.log('Ignored exit event - User has not joined yet')
            return
        }

        if (isAdmin) {
            // If admin is not yet moderator, they might be authenticating (clicking 'Login' on waiting screen).
            // In this case, we SHOULD NOT redirect, but let Jitsi handle the auth flow.
            if (!isModerator) {
                console.log('Admin not moderator yet - ignoring exit (likely login flow)')
                return
            }
            window.location.href = '/admin/manage-courses'
        } else {
            window.location.href = '/dashboard/live-classes'
        }
    }

    api.addEventListeners({
      videoConferenceJoined: () => {
        console.log('User joined conference')
        setHasJoined(true)
      },
      videoConferenceLeft: handleExit,
      readyToClose: handleExit,
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
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col top-0 left-0 h-screen w-screen">
      <div className="flex-1 relative bg-gray-900 h-full w-full">
        {/* Manual Exit Button - Safety net */}
        <button 
          onClick={() => {
             if (confirm('Are you sure you want to exit?')) {
                 if (onClose) onClose();
                 // Fallback redirect
                 if (isAdmin) window.location.href = '/admin/manage-courses';
                 else window.location.href = '/dashboard/live-classes';
             }
          }}
          className="absolute top-4 right-4 z-[60] bg-red-600/90 hover:bg-red-700 text-white px-3 py-1.5 rounded shadow-lg text-sm font-medium flex items-center gap-2 backdrop-blur-sm transition-all"
        >
          <FiX /> Exit
        </button>

        {/* Debug/Version Indicator - Proves file is updating */}
        <div className="absolute top-0 left-0 z-50 bg-green-400 text-black text-[10px] px-2 py-0.5 opacity-60 hover:opacity-100 pointer-events-none font-mono">
          v2.7 - Toolbar Fixed
        </div>

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
                    If you see <span className="font-semibold">&quot;Waiting for moderator&quot;</span>:
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
                * If the login popup is blocked, please check your browser&apos;s address bar.
              </p>
            </div>
          </div>
        )}

        <div ref={jitsiContainerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
