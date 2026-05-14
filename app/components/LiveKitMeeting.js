'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track, RoomEvent } from 'livekit-client'
import dynamic from 'next/dynamic'
const MeetingWhiteboard = dynamic(() => import('./MeetingWhiteboard'), { ssr: false })
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor,
  FiPhoneOff, FiUsers, FiMessageSquare, FiMoreVertical,
  FiLoader, FiMaximize, FiMinimize, FiGrid, FiUser,
  FiEdit3, FiType, FiFileText, FiDownload
} from 'react-icons/fi'

// ─── Inner room UI (must be inside <LiveKitRoom>) ───────────────────────────
function MeetingRoom({ roomName, displayName, isAdmin, onClose }) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const room = useRoomContext()

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [meetingTranscript, setMeetingTranscript] = useState('')
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [finalLines, setFinalLines] = useState([])
  const [captionLang, setCaptionLang] = useState('en-US')
  const [langSearch, setLangSearch] = useState('')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const captionRef = useRef(null)
  const recognitionRef = useRef(null)

  const LANGUAGES = [
    { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
    { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
    { code: 'es-ES', label: 'Spanish', flag: '🇪🇸' },
    { code: 'fr-FR', label: 'French', flag: '🇫🇷' },
    { code: 'de-DE', label: 'German', flag: '🇩🇪' },
    { code: 'it-IT', label: 'Italian', flag: '🇮🇹' },
    { code: 'pt-BR', label: 'Portuguese', flag: '🇧🇷' },
    { code: 'ru-RU', label: 'Russian', flag: '🇷🇺' },
    { code: 'ar-SA', label: 'Arabic', flag: '🇸🇦' },
    { code: 'zh-CN', label: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'zh-TW', label: 'Chinese (Traditional)', flag: '🇹🇼' },
    { code: 'ja-JP', label: 'Japanese', flag: '🇯🇵' },
    { code: 'ko-KR', label: 'Korean', flag: '🇰🇷' },
    { code: 'tr-TR', label: 'Turkish', flag: '🇹🇷' },
    { code: 'nl-NL', label: 'Dutch', flag: '🇳🇱' },
    { code: 'pl-PL', label: 'Polish', flag: '🇵🇱' },
    { code: 'sv-SE', label: 'Swedish', flag: '🇸🇪' },
    { code: 'da-DK', label: 'Danish', flag: '🇩🇰' },
    { code: 'fi-FI', label: 'Finnish', flag: '🇫🇮' },
    { code: 'nb-NO', label: 'Norwegian', flag: '🇳🇴' },
    { code: 'id-ID', label: 'Indonesian', flag: '🇮🇩' },
    { code: 'ms-MY', label: 'Malay', flag: '🇲🇾' },
    { code: 'th-TH', label: 'Thai', flag: '🇹🇭' },
    { code: 'vi-VN', label: 'Vietnamese', flag: '🇻🇳' },
    { code: 'uk-UA', label: 'Ukrainian', flag: '🇺🇦' },
    { code: 'cs-CZ', label: 'Czech', flag: '🇨🇿' },
    { code: 'ro-RO', label: 'Romanian', flag: '🇷🇴' },
    { code: 'hu-HU', label: 'Hungarian', flag: '🇭🇺' },
    { code: 'el-GR', label: 'Greek', flag: '🇬🇷' },
    { code: 'he-IL', label: 'Hebrew', flag: '🇮🇱' },
    { code: 'bn-BD', label: 'Bengali', flag: '🇧🇩' },
    { code: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
    { code: 'te-IN', label: 'Telugu', flag: '🇮🇳' },
    { code: 'mr-IN', label: 'Marathi', flag: '🇮🇳' },
    { code: 'gu-IN', label: 'Gujarati', flag: '🇮🇳' },
    { code: 'kn-IN', label: 'Kannada', flag: '🇮🇳' },
    { code: 'ml-IN', label: 'Malayalam', flag: '🇮🇳' },
    { code: 'pa-IN', label: 'Punjabi', flag: '🇮🇳' },
    { code: 'ur-PK', label: 'Urdu', flag: '🇵🇰' },
    { code: 'fa-IR', label: 'Persian', flag: '🇮🇷' },
    { code: 'af-ZA', label: 'Afrikaans', flag: '🇿🇦' },
    { code: 'sw-KE', label: 'Swahili', flag: '🇰🇪' },
  ]
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [pinnedParticipant, setPinnedParticipant] = useState(null)
  const [gridView, setGridView] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Live Captions via Web Speech API ──────────────────────────────────────
  const CAPTION_CHANNEL = 'caption'
  const captionsOnRef = useRef(false)
  const captionLangRef = useRef(captionLang)
  useEffect(() => { captionLangRef.current = captionLang }, [captionLang])

  const startCaptions = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Live captions need Chrome or Edge browser.'); return }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }

    const createRec = () => {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = captionLangRef.current  // ← always latest language

      rec.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript
          if (e.results[i].isFinal) {
            const text = transcript.trim()
            if (!text) continue
            setInterimText('')
            const id = Date.now()
            setFinalLines(prev => [...prev.slice(-2), { id, speaker: displayName, text }])
            setMeetingTranscript(prev => prev + `[${new Date().toLocaleTimeString()}] ${displayName}: ${text}\n`)
            setTimeout(() => setFinalLines(prev => prev.filter(l => l.id !== id)), 5000)
            if (room) {
              try {
                const payload = JSON.stringify({ type: CAPTION_CHANNEL, speaker: displayName, text })
                room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: false })
              } catch {}
            }
          } else {
            interim += transcript
          }
        }
        if (interim) setInterimText(interim)
      }

      rec.onerror = (e) => {
        if (e.error === 'aborted') return
      }

      rec.onend = () => {
        setInterimText('')
        if (!captionsOnRef.current) return
        // Restart with latest language (handles language change)
        setTimeout(() => {
          if (!captionsOnRef.current) return
          const newRec = createRec()
          try { newRec.start(); recognitionRef.current = newRec } catch {}
        }, 150)
      }

      return rec
    }

    const rec = createRec()
    try { rec.start(); recognitionRef.current = rec } catch {}
  }, [room, displayName])

  // Receive captions from others
  useEffect(() => {
    if (!room) return
    const handler = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type !== CAPTION_CHANNEL) return
        const id = Date.now()
        const speakerName = msg.speaker || participant?.identity || 'Guest'
        setFinalLines(prev => [...prev.slice(-2), { id, speaker: speakerName, text: msg.text }])
        setMeetingTranscript(prev => prev + `[${new Date().toLocaleTimeString()}] ${speakerName}: ${msg.text}\n`)
        setTimeout(() => setFinalLines(prev => prev.filter(l => l.id !== id)), 5000)
      } catch {}
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => room.off(RoomEvent.DataReceived, handler)
  }, [room])

  // Toggle captions
  const toggleCaptions = () => {
    if (!captionsOn) {
      captionsOnRef.current = true
      setCaptionsOn(true)
      startCaptions()
    } else {
      captionsOnRef.current = false
      setCaptionsOn(false)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
        recognitionRef.current = null
      }
      setInterimText('')
      setFinalLines([])
    }
  }

  // Chat via data channel
  useEffect(() => {
    if (!room) return
    const handler = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type === 'chat') {
          setChatMessages(prev => [...prev, {
            sender: participant?.identity || 'Unknown',
            text: msg.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }])
        }
      } catch {}
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => room.off(RoomEvent.DataReceived, handler)
  }, [room])

  const sendChat = () => {
    if (!chatInput.trim() || !room) return
    const msg = JSON.stringify({ type: 'chat', text: chatInput.trim() })
    room.localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true })
    setChatMessages(prev => [...prev, {
      sender: displayName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      self: true
    }])
    setChatInput('')
  }

  const downloadTranscript = () => {
    if (!meetingTranscript) return alert('No transcript captured yet.')
    const blob = new Blob([meetingTranscript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Transcript-${roomName}-${new Date().toLocaleDateString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleMic = async () => {
    await localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn(v => !v)
  }

  const toggleCam = async () => {
    await localParticipant.setCameraEnabled(!camOn)
    setCamOn(v => !v)
  }

  const toggleScreen = async () => {
    if (!screenSharing) {
      await localParticipant.setScreenShareEnabled(true)
      setScreenSharing(true)
    } else {
      await localParticipant.setScreenShareEnabled(false)
      setScreenSharing(false)
    }
  }

  const fmt = s => `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // All video tracks
  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true },
     { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  )

  const pinned = pinnedParticipant
    ? videoTracks.find(t => t.participant?.identity === pinnedParticipant)
    : null

  const others = videoTracks.filter(t => t.participant?.identity !== pinnedParticipant)

  const handleLeave = async () => {
    if (isAdmin && meetingTranscript) {
      try {
        const token = localStorage.getItem('token')
        await fetch('/api/admin/meetings/save-transcript', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ roomName, transcript: meetingTranscript })
        })
      } catch (e) {
        console.error('Failed to save transcript:', e)
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] z-50 flex flex-col select-none" style={{ fontFamily: 'Google Sans, sans-serif' }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">D</div>
          <div>
            <div className="text-white text-sm font-medium">{roomName}</div>
            <div className="text-gray-400 text-xs">{fmt(elapsed)}</div>
          </div>
          {isAdmin && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Host</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setGridView(v => !v)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors" title={gridView ? 'Speaker view' : 'Grid view'}>
            {gridView ? <FiUser size={18} /> : <FiGrid size={18} />}
          </button>
          <span className="text-gray-400 text-sm">{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video grid */}
        <div className={`flex flex-col overflow-hidden p-2 gap-2 ${showWhiteboard ? 'w-1/2' : 'flex-1'}`}>
          {(() => {
            // Separate screen share tracks from camera tracks
            const screenTracks = videoTracks.filter(t => t.source === Track.Source.ScreenShare && t.publication?.track)
            const camTracks    = videoTracks.filter(t => t.source !== Track.Source.ScreenShare)
            const hasScreen    = screenTracks.length > 0

            if (hasScreen) {
              // ── SCREEN SHARE LAYOUT ──
              // Main area = screen share, bottom strip = cameras
              return (
                <>
                  {/* Main screen share */}
                  <div className="flex-1 relative rounded-xl overflow-hidden bg-black">
                    <VideoTrack trackRef={screenTracks[0]} className="w-full h-full object-contain" />
                    <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <FiMonitor size={12} /> {screenTracks[0].participant?.name || screenTracks[0].participant?.identity} is sharing screen
                    </div>
                  </div>
                  {/* Camera strip */}
                  {camTracks.length > 0 && (
                    <div className="h-24 flex gap-2 overflow-x-auto flex-shrink-0">
                      {camTracks.map((trackRef, i) => {
                        const identity = trackRef.participant?.identity || ''
                        const isSelf   = identity === localParticipant?.identity
                        return (
                          <div key={i} className="relative flex-shrink-0 w-32 rounded-lg overflow-hidden bg-[#2d2d44]">
                            {trackRef.publication?.track
                              ? <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                                    {identity[0]?.toUpperCase() || '?'}
                                  </div>
                                </div>
                            }
                            <div className="absolute bottom-1 left-1 right-1">
                              <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded truncate block text-center">
                                {isSelf ? 'You' : (trackRef.participant?.name || identity)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            }

            // ── NORMAL GRID LAYOUT ──
            return (
              <>
                {/* Pinned speaker view */}
                {!gridView && pinned ? (
                  <div className="flex-1 relative rounded-xl overflow-hidden bg-[#2d2d44] cursor-pointer" onClick={() => setPinnedParticipant(null)}>
                    {pinned.publication?.track
                      ? <VideoTrack trackRef={pinned} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                            {(pinned.participant?.identity || '?')[0].toUpperCase()}
                          </div>
                        </div>
                    }
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {pinned.participant?.name || pinned.participant?.identity}
                    </div>
                  </div>
                ) : null}

                {/* Grid */}
                <div className={`${!gridView && pinned ? 'h-28 flex gap-2 overflow-x-auto' : 'flex-1 grid gap-2'}`}
                  style={gridView || !pinned ? {
                    gridTemplateColumns: camTracks.length <= 1 ? '1fr'
                      : camTracks.length <= 2 ? 'repeat(2,1fr)'
                      : camTracks.length <= 4 ? 'repeat(2,1fr)'
                      : 'repeat(3,1fr)'
                  } : {}}>
                  {(gridView || !pinned ? camTracks : camTracks.filter(t => t.participant?.identity !== pinnedParticipant)).map((trackRef, i) => {
                    const identity = trackRef.participant?.identity || ''
                    const isSelf   = identity === localParticipant?.identity
                    return (
                      <div key={i}
                        className={`relative rounded-xl overflow-hidden bg-[#2d2d44] cursor-pointer group ${!gridView && pinned ? 'flex-shrink-0 w-28' : ''}`}
                        onClick={() => !gridView && setPinnedParticipant(identity)}
                      >
                        {trackRef.publication?.track
                          ? <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center min-h-[120px]">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                {identity[0]?.toUpperCase() || '?'}
                              </div>
                            </div>
                        }
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded truncate max-w-[80%] block">
                            {isSelf ? `${trackRef.participant?.name || identity} (You)` : (trackRef.participant?.name || identity)}
                          </span>
                        </div>
                        {!gridView && (
                          <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <FiMaximize className="text-white" size={20} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        {/* ── WHITEBOARD PANEL ── */}
        {showWhiteboard && (
          <div className="w-1/2 bg-white flex flex-col border-l border-white/10">
            <div className="flex items-center justify-between px-4 py-2 bg-[#242438] border-b border-white/10">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <FiEdit3 size={16} /> Whiteboard
                {!isAdmin && <span className="text-xs text-yellow-400 ml-2">View only</span>}
              </span>
              <button onClick={() => setShowWhiteboard(false)} className="text-gray-400 hover:text-white text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MeetingWhiteboard isAdmin={isAdmin} />
            </div>
          </div>
        )}

        {/* ── SIDE PANEL ── */}
        {(showParticipants || showChat || showTranscript) && (
          <div className="w-72 bg-[#242438] border-l border-white/10 flex flex-col">
            {!showTranscript && (
              <div className="flex border-b border-white/10">
                <button onClick={() => { setShowParticipants(true); setShowChat(false) }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${showParticipants ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
                  People ({participants.length})
                </button>
                <button onClick={() => { setShowChat(true); setShowParticipants(false) }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${showChat ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
                  Chat
                </button>
              </div>
            )}

            {showTranscript && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#2d2d44]">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <FiFileText className="text-blue-400" /> Live Transcript
                  </h3>
                  <button onClick={downloadTranscript} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors flex items-center gap-1">
                    Save
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {meetingTranscript ? (
                    <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {meetingTranscript}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FiFileText className="text-gray-500" size={24} />
                      </div>
                      <p className="text-gray-500 text-sm">Transcript will appear here once someone starts speaking with captions enabled.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showParticipants && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {participants.map(p => {
                  let meta = {}
                  try { meta = JSON.parse(p.metadata || '{}') } catch {}
                  const displayRole = meta.role || 'Student'
                  const displayEmail = meta.email || ''
                  const displayName = meta.name || p.name || p.identity
                  const isHost = meta.isHost
                  const isSelf = p.identity === localParticipant?.identity
                  return (
                    <div key={p.identity} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isHost ? 'bg-blue-600' : 'bg-gradient-to-br from-green-500 to-teal-600'}`}>
                        {displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-white text-sm font-medium truncate">{displayName}</span>
                          {isSelf && <span className="text-gray-400 text-xs">(You)</span>}
                          {isHost
                            ? <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Host</span>
                            : <span className="text-xs bg-green-700 text-white px-1.5 py-0.5 rounded-full">{displayRole}</span>
                          }
                        </div>
                        {displayEmail && (
                          <div className="text-gray-400 text-xs truncate mt-0.5">{displayEmail}</div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {!p.isMicrophoneEnabled && <FiMicOff size={13} className="text-red-400" />}
                        {!p.isCameraEnabled && <FiVideoOff size={13} className="text-red-400" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {showChat && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-8">No messages yet</div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
                      <span className="text-gray-400 text-xs mb-1">{msg.self ? 'You' : msg.sender} · {msg.time}</span>
                      <div className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] break-words ${msg.self ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/10 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Send a message..."
                    className="flex-1 bg-white/10 text-white placeholder-gray-500 rounded-full px-4 py-2 text-sm outline-none focus:bg-white/15"
                  />
                  <button onClick={sendChat} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-sm transition-colors">
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── CAPTIONS OVERLAY ── */}
      {captionsOn && (finalLines.length > 0 || interimText) && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
          <div className="bg-black/75 rounded-xl px-5 py-3 max-w-2xl w-full backdrop-blur-sm">
            {finalLines.map(l => (
              <div key={l.id} className="text-white text-base leading-relaxed">
                <span className="text-blue-300 font-semibold mr-2">{l.speaker}:</span>
                {l.text}
              </div>
            ))}
            {interimText && (
              <div className="text-white/60 text-base leading-relaxed italic">
                <span className="text-blue-200 font-semibold mr-2">{displayName}:</span>
                {interimText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#1a1a2e] border-t border-white/10">

        {/* Left — time */}
        <div className="text-gray-400 text-sm w-32 hidden md:block">{fmt(elapsed)}</div>

        {/* Center — controls */}
        <div className="flex items-center gap-3">
          {/* Mic */}
          <button onClick={toggleMic}
            className={`flex flex-col items-center gap-1 p-3 rounded-full transition-all ${micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
            title={micOn ? 'Mute' : 'Unmute'}>
            {micOn ? <FiMic size={20} /> : <FiMicOff size={20} />}
          </button>

          {/* Camera */}
          <button onClick={toggleCam}
            className={`flex flex-col items-center gap-1 p-3 rounded-full transition-all ${camOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
            title={camOn ? 'Turn off camera' : 'Turn on camera'}>
            {camOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
          </button>

          {/* Screen share */}
          <button onClick={toggleScreen}
            className={`flex flex-col items-center gap-1 p-3 rounded-full transition-all ${screenSharing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title={screenSharing ? 'Stop sharing' : 'Share screen'}>
            <FiMonitor size={20} />
          </button>

          {/* Whiteboard */}
          <button onClick={() => setShowWhiteboard(v => !v)}
            className={`flex flex-col items-center gap-1 p-3 rounded-full transition-all ${showWhiteboard ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Whiteboard">
            <FiEdit3 size={20} />
          </button>

          {/* Leave */}
          <button onClick={handleLeave}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-full transition-all font-medium"
            title="Leave meeting">
            <FiPhoneOff size={20} />
            <span className="hidden md:inline text-sm">Leave</span>
          </button>
        </div>

        {/* Right — participants & chat */}
        <div className="flex items-center gap-2 w-32 justify-end">
          <button onClick={toggleCaptions}
            className={`px-3 py-2 rounded-full transition-all text-sm font-bold ${captionsOn ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title={captionsOn ? 'Turn off captions' : 'Turn on captions'}>
            CC
          </button>
          {captionsOn && (
            <div className="relative">
              <button
                onClick={() => setShowLangPicker(v => !v)}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full px-3 py-2 border border-white/20 transition-all"
              >
                <span>{LANGUAGES.find(l => l.code === captionLang)?.flag}</span>
                <span className="max-w-[70px] truncate">{LANGUAGES.find(l => l.code === captionLang)?.label}</span>
                <span className="text-gray-400">▾</span>
              </button>

              {showLangPicker && (
                <div className="absolute bottom-12 right-0 w-56 bg-[#1e1e2e] border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-white/10">
                    <input
                      autoFocus
                      value={langSearch}
                      onChange={e => setLangSearch(e.target.value)}
                      placeholder="Search language..."
                      className="w-full bg-white/10 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-1.5 outline-none focus:bg-white/15"
                    />
                  </div>
                  {/* List */}
                  <div className="max-h-52 overflow-y-auto">
                    {LANGUAGES
                      .filter(l => l.label.toLowerCase().includes(langSearch.toLowerCase()))
                      .map(l => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setCaptionLang(l.code)
                            captionLangRef.current = l.code  // update ref immediately
                            setShowLangPicker(false)
                            setLangSearch('')
                            // Restart recognition with new language immediately
                            if (recognitionRef.current) {
                              try { recognitionRef.current.abort() } catch {}
                              recognitionRef.current = null
                            }
                            if (captionsOnRef.current) {
                              setTimeout(() => startCaptions(), 200)
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors text-left ${captionLang === l.code ? 'bg-blue-600/30 text-blue-300' : 'text-white'}`}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span>{l.label}</span>
                          {captionLang === l.code && <span className="ml-auto text-blue-400">✓</span>}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => { setShowParticipants(v => !v); setShowChat(false); setShowTranscript(false) }}
            className={`p-3 rounded-full transition-all ${showParticipants ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Participants">
            <FiUsers size={18} />
          </button>
          <button onClick={() => { setShowTranscript(v => !v); setShowChat(false); setShowParticipants(false) }}
            className={`p-3 rounded-full transition-all ${showTranscript ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Meeting Transcript">
            <FiFileText size={18} />
          </button>
          <button onClick={() => { setShowChat(v => !v); setShowParticipants(false); setShowTranscript(false) }}
            className={`relative p-3 rounded-full transition-all ${showChat ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            title="Chat">
            <FiMessageSquare size={18} />
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
  )
}

// ─── Outer wrapper — handles token fetch ────────────────────────────────────
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
      <div className="fixed inset-0 bg-[#1a1a2e] z-50 flex items-center justify-center">
        <div className="text-white text-center">
          <FiLoader className="animate-spin w-10 h-10 mx-auto mb-4" />
          <p className="text-lg">Joining meeting...</p>
          <p className="text-gray-400 text-sm mt-1">{roomName}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] z-50 flex items-center justify-center">
        <div className="bg-[#242438] rounded-2xl p-8 max-w-md text-center border border-white/10">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiPhoneOff className="text-red-400" size={28} />
          </div>
          <p className="text-white font-semibold text-lg mb-2">Failed to join meeting</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-colors">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
    >
      <MeetingRoom
        roomName={roomName}
        displayName={displayName}
        isAdmin={isAdmin}
        onClose={onClose}
      />
    </LiveKitRoom>
  )
}
