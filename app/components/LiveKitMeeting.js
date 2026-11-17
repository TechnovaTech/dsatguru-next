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
// The meeting theme. Scoped to `.studio`, so it cannot touch the rest of the app.
import './meeting.css'
import { Track, RoomEvent } from 'livekit-client'
import dynamic from 'next/dynamic'
import { useToast } from './ui/UIProvider'
const MeetingWhiteboard = dynamic(() => import('./MeetingWhiteboard'), { ssr: false })
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor,
  FiPhoneOff, FiUsers, FiMessageSquare, FiMoreVertical,
  FiLoader, FiMaximize, FiMinimize, FiGrid, FiUser,
  FiEdit3, FiType, FiFileText, FiDownload, FiImage, FiAlertTriangle
} from 'react-icons/fi'

// LiveKit `identity` is the Mongo user id — never show it. The token sets
// `name` to "Full Name (Role)" and stuffs the raw name into metadata.
function personName(participant, fallback = 'Participant') {
  if (!participant) return fallback
  if (participant.name) return participant.name
  try {
    const meta = participant.metadata ? JSON.parse(participant.metadata) : null
    if (meta?.name) return meta.name
  } catch { /* metadata is not always JSON */ }
  return fallback
}

// ─── Inner room UI (must be inside <LiveKitRoom>) ───────────────────────────
function MeetingRoom({ roomName, displayName, isAdmin, onClose, meetingTitle, meeting,
  authKey = 'token', guestApi = '/api/livekit/guest',
  transcriptApi = '/api/admin/meetings/save-transcript', boardsApi = '/api/meetings/boards',
  imagesApi = '/api/meetings/board-images', onEndClass }) {
  const toast = useToast()
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
  const [snapshots, setSnapshots] = useState([])
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // Tile columns must follow the viewport; an inline grid style cannot.
  const [boardCanDraw, setBoardCanDraw] = useState(false)
  // A half-width board is unusable for teaching, so it opens full.
  const [boardFull, setBoardFull] = useState(true)
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  // People who opened a guest link and are waiting to be let in (hosts only).
  const [lobby, setLobby] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    let stop = false
    const poll = async () => {
      try {
        const authToken = localStorage.getItem(authKey)
        const res = await fetch(`${guestApi}?room=${encodeURIComponent(roomName)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        })
        if (!res.ok) return
        const data = await res.json()
        if (!stop) setLobby(data.waiting || [])
      } catch { /* transient — try again on the next tick */ }
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => { stop = true; clearInterval(t) }
  }, [isAdmin, roomName, authKey, guestApi])

  const decideGuest = async (claimId, action) => {
    setLobby((l) => l.filter((g) => g.claimId !== claimId))   // optimistic
    try {
      const authToken = localStorage.getItem(authKey)
      await fetch(guestApi, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ claimId, action }),
      })
    } catch (e) {
      console.error('Could not update the guest request:', e)
    }
  }
  const [captionStatus, setCaptionStatus] = useState('idle') // idle, listening, error
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
  const captionErrorShownRef = useRef(false)

  // Hard stop on unmount — otherwise leaving the meeting leaves the mic hot in
  // the onend restart loop and keeps setState-ing an unmounted tree.
  useEffect(() => () => {
    captionsOnRef.current = false
    const rec = recognitionRef.current
    if (rec) {
      try { rec.onend = null; rec.onerror = null; rec.onresult = null } catch {}
      try { rec.stop() } catch {}
      try { rec.abort?.() } catch {}
      recognitionRef.current = null
    }
  }, [])
  const captionLangRef = useRef(captionLang)
  useEffect(() => { captionLangRef.current = captionLang }, [captionLang])

  const startCaptions = useCallback(() => {
    if (typeof window === 'undefined') return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setCaptionStatus('error')
      toast.error('Live captions need Chrome or Edge browser.')
      return
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }

    const createRec = () => {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = captionLang || 'en-US' // Use state directly

      rec.onstart = () => {
        console.log('Speech Recognition Started with lang:', rec.lang)
        setCaptionStatus('listening')
      }

      rec.onresult = (e) => {
        console.log('Recognition Result Received:', e.results)
        let interim = ''
        let hasFinal = false
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript
          if (e.results[i].isFinal) {
            hasFinal = true
            const text = transcript.trim()
            if (!text) continue
            
            const id = Date.now()
            const speakerName = displayName || personName(localParticipant, 'Host')
            
            setFinalLines(prev => [...prev.slice(-2), { id, speaker: speakerName, text }])
            setMeetingTranscript(prev => {
              const newLine = `[${new Date().toLocaleTimeString()}] ${speakerName}: ${text}\n`
              return prev + newLine
            })
            setTimeout(() => setFinalLines(prev => prev.filter(l => l.id !== id)), 5000)
            
            if (room && room.state === 'connected') {
              try {
                const payload = JSON.stringify({ type: CAPTION_CHANNEL, speaker: speakerName, text })
                room.localParticipant.publishData(new TextEncoder().encode(payload), { reliable: false })
              } catch (err) {
                console.warn('Failed to publish caption data:', err)
              }
            }
          } else {
            interim += transcript
          }
        }
        setInterimText(interim)
        if (hasFinal && !interim) {
          // If we got a final result and no interim is left, clear it explicitly
          setInterimText('')
        }
      }

      rec.onerror = (e) => {
        console.error('Speech Recognition Error:', e.error)
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          // Permission is not going to appear on a retry — stop the loop dead
          // and tell the user once.
          captionsOnRef.current = false
          setCaptionsOn(false)
          setCaptionStatus('error')
          if (!captionErrorShownRef.current) {
            captionErrorShownRef.current = true
            toast.error('Microphone access is blocked, so captions are off. Allow the mic in your browser to use them.')
          }
          try { recognitionRef.current?.stop() } catch {}
        } else if (e.error === 'network') {
          setCaptionStatus('error')
        }
      }

      rec.onend = () => {
        console.log('Speech Recognition Ended')
        setInterimText('')
        if (!captionsOnRef.current) {
          setCaptionStatus('idle')
          return
        }
        // Auto-restart if still enabled
        setTimeout(() => {
          if (!captionsOnRef.current) return
          try {
            const newRec = createRec()
            newRec.start()
            recognitionRef.current = newRec
          } catch (err) {
            console.error('Failed to restart recognition:', err)
          }
        }, 300)
      }

      return rec
    }

    try {
      const rec = createRec()
      rec.start()
      recognitionRef.current = rec
    } catch (err) {
      console.error('Failed to start recognition:', err)
      setCaptionStatus('error')
    }
  }, [room, displayName])

  // Receive captions from others
  useEffect(() => {
    if (!room) return
    const handler = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type !== CAPTION_CHANNEL) return
        const id = Date.now()
        const speakerName = msg.speaker || personName(participant, 'Guest')
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
      setShowTranscript(true)
      setShowChat(false)
      setShowParticipants(false)
      
      captionsOnRef.current = true
      captionErrorShownRef.current = false
      setCaptionsOn(true)
      setCaptionStatus('idle') // will update to listening onstart
      startCaptions()
    } else {
      captionsOnRef.current = false
      setCaptionsOn(false)
      setCaptionStatus('idle')
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
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
            sender: personName(participant, 'Unknown'),
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

  const downloadTranscript = async () => {
    if (!meetingTranscript) { toast.info('No transcript captured yet.'); return }
    try {
      const jsPDF = (await import('jspdf')).default
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.width
      const pageHeight = pdf.internal.pageSize.height
      
      // Modern Blue Header Background
      pdf.setFillColor(36, 36, 56)
      pdf.rect(0, 0, pageWidth, 50, 'F')
      
      // Title
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(24)
      pdf.setTextColor(255, 255, 255)
      pdf.text('SESSION REPORT', 20, 30)
      
      // Meta Info
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(200, 200, 200)
      pdf.text(`Meeting ID: ${roomName}`, 20, 42)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 80, 42)
      
      // Content Section
      let y = 65
      
      // Intelligent Summary if exists (optional future add)
      pdf.setFontSize(16)
      pdf.setTextColor(36, 36, 56)
      pdf.text('Class Transcript', 20, y)
      y += 10
      
      pdf.setDrawColor(230, 230, 230)
      pdf.line(20, y, pageWidth - 20, y)
      y += 10
      
      // Transcript with Speaker Highlighting
      pdf.setFontSize(10)
      pdf.setTextColor(60, 60, 60)
      
      const lines = meetingTranscript.split('\n').filter(Boolean)
      lines.forEach(line => {
        const match = line.match(/^\[(.*?)\] (.*?): (.*)$/)
        if (match) {
          const [_, time, speaker, text] = match
          
          if (y > pageHeight - 30) {
            pdf.addPage()
            y = 20
          }
          
          // Speaker & Time
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(66, 133, 244)
          pdf.text(`${speaker}`, 20, y)
          
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(150, 150, 150)
          pdf.text(`[${time}]`, 20 + pdf.getTextWidth(speaker) + 5, y)
          y += 6
          
          // Message text
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(40, 40, 40)
          const splitText = pdf.splitTextToSize(text, pageWidth - 40)
          
          splitText.forEach(tLine => {
            if (y > pageHeight - 20) {
              pdf.addPage()
              y = 20
            }
            pdf.text(tLine, 25, y)
            y += 5
          })
          y += 4 // Spacing between messages
        }
      })

      // Visual Recap (Snapshots)
      if (snapshots && snapshots.length > 0) {
        pdf.addPage()
        
        // Page Header
        pdf.setFillColor(36, 36, 56)
        pdf.rect(0, 0, pageWidth, 40, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(20)
        pdf.setTextColor(255, 255, 255)
        pdf.text('VISUAL HIGHLIGHTS', 20, 25)
        
        y = 55
        for (const snap of snapshots) {
          if (y > pageHeight - 110) {
            pdf.addPage()
            y = 25
          }
          
          // Card for image
          pdf.setDrawColor(240, 240, 240)
          pdf.setFillColor(252, 252, 252)
          pdf.roundedRect(15, y, pageWidth - 30, 105, 3, 3, 'FD')
          
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(100, 100, 100)
          pdf.text(`Screen Capture - ${snap.timestamp}`, 20, y + 8)
          
          try {
            // Add shadow effect or border to image
            pdf.addImage(snap.imageUrl, 'JPEG', 20, y + 12, pageWidth - 40, 85)
            y += 115
          } catch (e) {
            console.error('Failed to add image to PDF:', e)
            y += 10
          }
        }
      }
      
      pdf.save(`Report-${roomName}-${new Date().toLocaleDateString()}.pdf`)
    } catch (error) {
      console.error('PDF generation failed:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const toggleMic = async () => {
    if (!room) return
    const enabled = !micOn
    try {
      await room.localParticipant.setMicrophoneEnabled(enabled)
      setMicOn(enabled)
    } catch {
      // A denied or unavailable mic rejects here. The room already raises the
      // "Microphone blocked" card through onMediaDeviceFailure, so all this
      // has to do is keep the button honest - and swallow the rejection,
      // which otherwise surfaces as a dev-overlay crash over a live class.
      setMicOn(!!room.localParticipant.isMicrophoneEnabled)
    }
  }

  const captureManualSnapshot = () => {
    if (!room || !isAdmin) return;
    let capturedSomething = false;

    // 1. Capture Whiteboard if open
    if (showWhiteboard) {
      try {
        const wbCanvas = document.querySelector('.tldraw-canvas canvas') || document.querySelector('canvas');
        if (wbCanvas) {
          const imageUrl = wbCanvas.toDataURL('image/jpeg', 0.5);
          setSnapshots(prev => [
            ...prev,
            {
              timestamp: new Date().toLocaleTimeString(),
              imageUrl: imageUrl,
              title: `Whiteboard Snapshot`
            }
          ]);
          capturedSomething = true;
        }
      } catch (e) {
        console.warn('Manual Whiteboard capture failed:', e);
      }
    }

    // 2. Capture Screen Share if exists
    const allParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    let screenTrack = null;
    
    for (const p of allParticipants) {
      if (!p || !p.videoTracks) continue;
      const track = Array.from(p.videoTracks.values())
        .find(t => t.source === 'screen_share' || t.trackName?.includes('screen') || t.isScreenShare);
      if (track?.track?.mediaStreamTrack) {
        screenTrack = track.track.mediaStreamTrack;
        break;
      }
    }

    if (screenTrack) {
      try {
        const video = document.createElement('video');
        video.srcObject = new MediaStream([screenTrack]);
        video.muted = true;
        video.setAttribute('playsinline', '');
        
        // Use a promise to wait for the video to be ready
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            // Critical: Wait for at least 2 frames to ensure the buffer is not empty
            // Some browsers return a black frame if we capture too quickly
            await new Promise(resolve => setTimeout(resolve, 1500)); 

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            const ctx = canvas.getContext('2d');
            
            // Draw the current video frame to the canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Check if the captured frame is purely black
            const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let isBlack = true;
            for (let i = 0; i < pixelData.length; i += 4) {
              if (pixelData[i] > 10 || pixelData[i+1] > 10 || pixelData[i+2] > 10) {
                isBlack = false;
                break;
              }
            }

            if (isBlack) {
              console.warn('Captured frame is black, retrying once...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            const imageUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            setSnapshots(prev => [
              ...prev,
              {
                timestamp: new Date().toLocaleTimeString(),
                imageUrl: imageUrl,
                title: `Screen Share Snapshot`
              }
            ]);
            
            // Cleanup
            video.pause();
            video.srcObject = null;
            video.remove();
          } catch (e) {
            console.warn('Manual video play/capture failed:', e);
          }
        };
      } catch (err) {
        console.warn('Failed to setup manual screen capture:', err);
      }
    }

    if (!capturedSomething) {
      toast.info('No active screen share or whiteboard found to capture.');
    } else {
      // Optional: Add a brief visual feedback or sound
      console.log('Capture triggered for active components');
    }
  }

  const toggleCam = async () => {
    if (!room) return
    const enabled = !camOn
    try {
      await room.localParticipant.setCameraEnabled(enabled)
      setCamOn(enabled)
    } catch {
      // Same as the mic: onMediaDeviceFailure owns the message, this just
      // keeps the button in step with the room and stops the rejection.
      setCamOn(!!room.localParticipant.isCameraEnabled)
    }
  }

  const toggleScreen = async () => {
    if (!room) return
    const enabled = !screenSharing
    try {
      await room.localParticipant.setScreenShareEnabled(enabled)
      setScreenSharing(enabled)
    } catch (e) {
      // Dismissing the browser's "choose what to share" picker rejects right
      // here, with the same NotAllowedError a denied camera prompt gives.
      // That is someone changing their mind, not a fault: say nothing, and
      // read the button back off the room so it cannot drift out of step.
      setScreenSharing(!!room.localParticipant.isScreenShareEnabled)
      const name = e?.name || ''
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        toast.error('Could not start screen sharing. Please try again.')
      }
    }
  }

  const fmt = s => `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // All video tracks
  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true },
     { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  )

  // A muted camera keeps its publication, so "has a track" is not the same
  // question as "has a picture". Asking only the first renders a black video.
  const hasPicture = (t) => !!t?.publication?.track && !t.publication.isMuted

  const pinned = pinnedParticipant
    ? videoTracks.find(t => t.participant?.identity === pinnedParticipant)
    : null

  const others = videoTracks.filter(t => t.participant?.identity !== pinnedParticipant)

  const handleLeave = async (endForEveryone = false) => {
    setLeaving(true)
    if (isAdmin && endForEveryone) {
      // Closes the join window for students even before the scheduled end.
      try {
        if (onEndClass) {
          await onEndClass()
        } else {
          const token = localStorage.getItem(authKey)
          await fetch('/api/livekit/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ room: roomName, action: 'end' }),
          })
        }
      } catch (e) {
        console.error('Could not end the session:', e)
      }
    }
    if (isAdmin && transcriptApi) {
      try {
        const token = localStorage.getItem(authKey)
        const body = { 
          roomName, 
          transcript: meetingTranscript || '',
          snapshots: snapshots || [] 
        }
        
        console.log('Sending transcript to save:', body)

        // The server summarises with Gemini, which can take tens of seconds —
        // never hold the host hostage to it.
        const res = await fetch(transcriptApi, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
        })
        
        const data = await res.json()
        if (!res.ok) {
          console.error('Failed to save transcript:', data.error)
        } else {
          console.log('Transcript saved successfully:', data.message)
        }
      } catch (e) {
        console.error('Failed to save transcript error:', e)
      }
    }
    onClose()
  }

  return (
    <div className="studio st-stage fixed inset-0 z-50 flex select-none flex-col">

      {/* ── Waiting room (host only) ── */}
      {isAdmin && lobby.length > 0 && (
        <div className="st-pop absolute right-3 top-16 z-[55] w-[19rem] rounded-[16px] p-3 md:right-5">
          <p className="mb-2.5 flex items-center gap-2 px-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--st-warn)]">
            <span className="st-live-dot" style={{ background: 'var(--st-warn)' }} aria-hidden="true" />
            Waiting to join · {lobby.length}
          </p>
          <div className="space-y-1">
            {lobby.map((g) => (
              <div key={g.claimId} className="st-row flex items-center gap-2.5 p-1.5">
                <span className="st-avatar h-8 w-8 flex-shrink-0 text-[11px]"
                  style={{ color: 'var(--st-warn)', background: '#b4530914' }}>
                  {(g.name || '?')[0].toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{g.name}</span>
                <button onClick={() => decideGuest(g.claimId, 'approve')}
                  className="st-ctl st-ctl-on px-2.5 py-1.5 text-[11px] font-semibold">
                  Admit
                </button>
                <button onClick={() => decideGuest(g.claimId, 'deny')}
                  className="st-ctl st-ctl-ghost px-2.5 py-1.5 text-[11px] font-semibold">
                  Deny
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TOP BAR ──
          Two floating chips rather than a bar, so the wallpaper runs edge to
          edge behind them. */}
      <div className="relative z-20 flex flex-shrink-0 items-start justify-between gap-2 p-2.5 md:p-3.5">
        <div className="st-topbar flex min-w-0 items-center gap-2.5 py-1.5 pl-1.5 pr-3.5">
          {/* Brand mark. */}
          <div className="st-avatar h-8 w-8 flex-shrink-0 text-[13px]">D</div>
          <div className="min-w-0">
            {/* A room id is long and meaningless — clip it to one line. */}
            <div className="truncate text-[13px] font-semibold leading-tight">{meetingTitle || roomName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--st-dim)]">
              <span className="st-live-dot" />
              <span className="st-mono">{fmt(elapsed)}</span>
            </div>
          </div>
          {isAdmin && <span className="st-badge st-badge-host flex-shrink-0">Host</span>}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 md:gap-2">
          {/* Layout switcher, as a two-state segmented control so the current
              view is readable at a glance instead of implied by one icon. */}
          <div className="st-glass hidden items-center gap-1 p-1 sm:flex">
            <button onClick={() => setGridView(true)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                gridView ? 'bg-white/80 text-[var(--st-text)] shadow-sm' : 'text-[var(--st-dim)] hover:text-[var(--st-text)]'}`}
              title="Grid view">
              <FiGrid size={12} /> Grid
            </button>
            <button onClick={() => setGridView(false)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                !gridView ? 'bg-white/80 text-[var(--st-text)] shadow-sm' : 'text-[var(--st-dim)] hover:text-[var(--st-text)]'}`}
              title="Speaker view">
              <FiUser size={12} /> Speaker
            </button>
          </div>
          {/* The same toggle, collapsed to one button where there is no room. */}
          <button onClick={() => setGridView(v => !v)} className="st-ctl h-10 w-10 sm:hidden" title={gridView ? 'Speaker view' : 'Grid view'}>
            {gridView ? <FiUser size={16} /> : <FiGrid size={16} />}
          </button>
          <span className="st-glass flex items-center gap-1.5 px-3.5 py-[11px] text-[11px] font-semibold text-[var(--st-dim)]">
            <FiUsers size={13} />
            <span className="st-mono">{participants.length}</span>
            <span className="hidden md:inline font-medium">in room</span>
          </span>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* Video grid — hidden entirely while the board is full screen. */}
        <div className={`flex flex-col gap-2.5 overflow-hidden p-2.5 md:p-3 md:pt-0 ${
          showWhiteboard ? (boardFull ? 'hidden' : 'w-1/2') : 'flex-1'
        }`}>
          {(() => {
            // Separate screen share tracks from camera tracks
            const screenTracks = videoTracks.filter(t => t.source === Track.Source.ScreenShare && hasPicture(t))
            const camTracks    = videoTracks.filter(t => t.source !== Track.Source.ScreenShare)
            const hasScreen    = screenTracks.length > 0

            if (hasScreen) {
              // ── SCREEN SHARE LAYOUT ──
              // Main area = screen share, bottom strip = cameras
              return (
                <>
                  {/* Main screen share. The backing shows either side of a
                      contain-fitted feed, so it takes the stage colour. */}
                  <div className="st-tile flex-1">
                    <VideoTrack trackRef={screenTracks[0]} className="h-full w-full object-contain" />
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      style={{ background: 'var(--st-accent)' }}>
                      <FiMonitor size={12} />
                      <span className="max-w-[55vw] truncate">{personName(screenTracks[0].participant)} is presenting</span>
                    </div>
                  </div>
                  {/* Camera strip */}
                  {camTracks.length > 0 && (
                    <div className="flex h-24 flex-shrink-0 gap-2.5 overflow-x-auto pb-0.5">
                      {camTracks.map((trackRef, i) => {
                        const identity = trackRef.participant?.identity || ''
                        const isSelf   = identity === localParticipant?.identity
                        const label    = personName(trackRef.participant)
                        return (
                          <div key={i} className="st-tile w-32 flex-shrink-0" style={{ borderRadius: '14px' }}>
                            {hasPicture(trackRef)
                              ? <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
                              : <div className="flex h-full w-full items-center justify-center">
                                  <div className="st-avatar h-10 w-10 text-[15px]">
                                    {label[0]?.toUpperCase() || '?'}
                                  </div>
                                </div>
                            }
                            <div className="absolute bottom-1.5 left-1.5 right-1.5">
                              <span className="st-chip truncate" style={{ fontSize: '10.5px', padding: '3px 7px' }}>
                                {isSelf ? 'You' : label}
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
                  <div className="st-tile group flex-1 cursor-pointer" onClick={() => setPinnedParticipant(null)}>
                    {hasPicture(pinned)
                      ? <VideoTrack trackRef={pinned} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                          <div className="st-avatar h-24 w-24 text-[18px]">
                            {(personName(pinned.participant, '?')[0] || '?').toUpperCase()}
                          </div>
                          <p className="text-[15px] font-semibold text-[var(--st-dim)]">Camera is off</p>
                        </div>
                    }
                    <div className="absolute bottom-3 left-3">
                      <span className="st-chip">{personName(pinned.participant)}</span>
                    </div>
                    {/* Say how to get out of the pin, rather than leaving the
                        click to be discovered. */}
                    <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="st-chip"><FiMinimize size={11} /> Click to unpin</span>
                    </div>
                  </div>
                ) : null}

                {/* Grid */}
                <div className={`${!gridView && pinned ? 'flex h-28 gap-2.5 overflow-x-auto pb-0.5' : 'grid flex-1 gap-2.5'}`}
                  style={gridView || !pinned ? {
                    // On a phone: one tile per row up to two people, then two
                    // columns — three would be unreadable slivers.
                    gridTemplateColumns: isNarrow
                      ? (camTracks.length <= 2 ? '1fr' : 'repeat(2,1fr)')
                      : camTracks.length <= 1 ? '1fr'
                      : camTracks.length <= 4 ? 'repeat(2,1fr)'
                      : 'repeat(3,1fr)',
                    gridAutoRows: '1fr'
                  } : {}}>
                  {(gridView || !pinned ? camTracks : camTracks.filter(t => t.participant?.identity !== pinnedParticipant)).map((trackRef, i) => {
                    const identity = trackRef.participant?.identity || ''
                    const isSelf   = identity === localParticipant?.identity
                    const label    = personName(trackRef.participant)
                    return (
                      <div key={i}
                        className={`st-tile group cursor-pointer ${!gridView && pinned ? 'w-28 flex-shrink-0' : ''}`}
                        style={!gridView && pinned ? { borderRadius: '14px' } : undefined}
                        onClick={() => !gridView && setPinnedParticipant(identity)}
                      >
                        {hasPicture(trackRef)
                          ? <VideoTrack trackRef={trackRef} className="h-full w-full object-cover" />
                          : <div className="flex h-full min-h-[120px] w-full flex-col items-center justify-center gap-3 p-4">
                              <div className="st-avatar h-16 w-16 text-[18px]">
                                {label[0]?.toUpperCase() || '?'}
                              </div>
                              {isSelf && (
                                <p className="text-center text-[13px] font-medium text-[var(--st-dim)]">
                                  Your camera is off
                                </p>
                              )}
                            </div>
                        }
                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                          <span className="st-chip truncate">
                            {isSelf ? `${label} (You)` : label}
                          </span>
                        </div>
                        {!gridView && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ background: 'rgb(10 13 20 / .45)' }}>
                            <span className="st-chip"><FiMaximize size={12} /> Pin</span>
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
        {/* Mounted for the whole meeting, not just while the panel is open:
            the strokes live in here, and someone has to be listening to answer
            a late viewer's sync request. Closing the panel only hides it. */}
        <div className={`${showWhiteboard
            ? `absolute inset-2.5 z-30 flex w-auto flex-col md:relative md:inset-auto md:mb-3 md:mr-3 ${boardFull ? 'md:w-full' : 'md:w-1/2'}`
            : 'hidden'} st-panel overflow-hidden bg-white`}>
            <div className="st-rail flex flex-shrink-0 items-center justify-between gap-2 px-3 py-2.5 md:px-4">
              <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-semibold">
                <span className="st-ctl st-ctl-on h-7 w-7 flex-shrink-0" style={{ borderRadius: '9px' }}>
                  <FiEdit3 size={13} />
                </span>
                <span className="truncate">Whiteboard</span>
                {!boardCanDraw && <span className="st-badge st-badge-warn flex-shrink-0">View only</span>}
                {boardCanDraw && !isAdmin && <span className="st-badge st-badge-live flex-shrink-0">You can draw</span>}
              </span>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {/* Full screen hides the tiles; the split view keeps faces visible. */}
                <button
                  onClick={() => setBoardFull((v) => !v)}
                  className="st-ctl st-ctl-ghost hidden items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold md:inline-flex"
                  title={boardFull ? 'Show the video tiles beside the board' : 'Use the whole screen for the board'}
                >
                  {boardFull ? <FiMinimize size={12} /> : <FiMaximize size={12} />}
                  {boardFull ? 'Split view' : 'Full screen'}
                </button>
                <button onClick={() => setShowWhiteboard(false)}
                  className="st-ctl st-ctl-ghost px-2.5 py-1.5 text-[11px] font-semibold">
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <MeetingWhiteboard
                isAdmin={isAdmin}
                authKey={authKey}
                boardsApi={boardsApi}
                imagesApi={imagesApi}
                roomName={roomName}
                meetingTitle={meetingTitle}
                // Real students in the room, so the host can share the board
                // with specific people. Identity IS the Mongo user id.
                participants={participants
                  .filter(pp => pp.identity !== localParticipant?.identity)
                  .map(pp => ({ id: pp.identity, name: personName(pp) }))}
                onCanDrawChange={setBoardCanDraw}
              />
            </div>
        </div>

        {/* ── SIDE PANEL ── */}
        {(showParticipants || showChat || showTranscript) && (
          <div className="st-panel absolute inset-2.5 z-30 flex w-auto flex-col overflow-hidden md:relative md:inset-auto md:z-auto md:mb-3 md:mr-3 md:mt-0 md:w-[19rem]">
            {!showTranscript && (
              <div className="flex flex-shrink-0 border-b border-[var(--st-line)]">
                <button onClick={() => { setShowParticipants(true); setShowChat(false) }}
                  className={`st-tab flex-1 py-3.5 text-[13px] font-semibold tracking-wide ${showParticipants ? 'st-tab-on' : ''}`}>
                  People <span className="st-mono text-[var(--st-faint)]">({participants.length})</span>
                </button>
                <button onClick={() => { setShowChat(true); setShowParticipants(false) }}
                  className={`st-tab flex-1 py-3.5 text-[13px] font-semibold tracking-wide ${showChat ? 'st-tab-on' : ''}`}>
                  Chat
                </button>
              </div>
            )}

            {showTranscript && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-[var(--st-line)] px-3.5 py-3">
                  <h3 className="flex min-w-0 items-center gap-2.5 text-[13px] font-semibold">
                    <span className="st-ctl st-ctl-on h-7 w-7 flex-shrink-0" style={{ borderRadius: '9px' }}>
                      <FiFileText size={13} />
                    </span>
                    <span className="truncate">Live transcript</span>
                  </h3>
                  <button onClick={downloadTranscript}
                    className="st-ctl flex flex-shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold">
                    <FiDownload size={12} /> PDF
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
                {meetingTranscript ? (
                  <div className="space-y-3.5">
                    {meetingTranscript.split('\n').filter(Boolean).map((line, i) => {
                      const match = line.match(/^\[(.*?)\] (.*?): (.*)$/)
                      if (match) {
                        const [_, time, speaker, text] = match
                        const isSelf = speaker === displayName
                        return (
                          <div key={i} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                            <div className="mb-1.5 flex items-center gap-2 px-0.5">
                              {!isSelf && (
                                <div className="st-avatar h-[22px] w-[22px] text-[11px]">
                                  {speaker.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-[11px] font-bold" style={{ color: 'var(--st-accent-text)' }}>{speaker}</span>
                              <span className="st-mono text-[11px] text-[var(--st-faint)]">{time}</span>
                              {isSelf && (
                                <div className="st-avatar h-[22px] w-[22px] text-[11px]">
                                  {speaker.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className={`max-w-[90%] px-3 py-2 text-[13px] leading-relaxed ${isSelf ? 'st-bubble-self' : 'st-bubble text-[var(--st-dim)]'}`}>
                              {text}
                            </div>
                          </div>
                        )
                      }
                      return <div key={i} className="text-[11px] italic text-[var(--st-faint)]">{line}</div>
                    })}
                  </div>
                ) : (
                    <div className="px-6 py-12 text-center">
                      <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-[16px]"
                        style={{ background: 'rgb(255 255 255 / .6)', border: '1px solid var(--st-edge)' }}>
                        <FiFileText className="text-[var(--st-faint)]" size={20} />
                      </div>
                      <p className="text-[13px] leading-relaxed text-[var(--st-faint)]">Turn on captions and the transcript will build itself here as people speak.</p>
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
                    <div key={p.identity} className="st-row flex items-start gap-3 p-2">
                      <div className="st-avatar h-9 w-9 flex-shrink-0 text-[13px]"
                        style={isHost ? undefined : { color: 'var(--st-dim)' }}>
                        {displayName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold">{displayName}</span>
                          {isSelf && <span className="text-[11px] text-[var(--st-faint)]">(You)</span>}
                          {isHost
                            ? <span className="st-badge st-badge-host">Host</span>
                            : <span className="st-badge st-badge-role">{displayRole}</span>
                          }
                        </div>
                        {displayEmail && (
                          <div className="mt-0.5 truncate text-[11px] text-[var(--st-faint)]">{displayEmail}</div>
                        )}
                      </div>
                      <div className="mt-1 flex gap-1.5">
                        {!p.isMicrophoneEnabled && <FiMicOff size={13} style={{ color: 'var(--st-danger)' }} />}
                        {!p.isCameraEnabled && <FiVideoOff size={13} style={{ color: 'var(--st-danger)' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {showChat && (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
                  {chatMessages.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-[16px]"
                        style={{ background: 'rgb(255 255 255 / .6)', border: '1px solid var(--st-edge)' }}>
                        <FiMessageSquare className="text-[var(--st-faint)]" size={20} />
                      </div>
                      <p className="text-[13px] text-[var(--st-faint)]">No messages yet. Say hello.</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
                      <span className="mb-1.5 px-0.5 text-[11px] text-[var(--st-faint)]">
                        <span className="font-semibold text-[var(--st-dim)]">{msg.self ? 'You' : msg.sender}</span>
                        <span className="st-mono"> · {msg.time}</span>
                      </span>
                      <div className={`max-w-[90%] break-words px-3 py-2 text-[13px] leading-relaxed ${msg.self ? 'st-bubble-self' : 'st-bubble'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-shrink-0 gap-2 border-t border-[var(--st-line)] p-3">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Message everyone…"
                    className="st-input min-w-0 flex-1 px-3.5 py-2.5 text-[13px]"
                  />
                  <button onClick={sendChat} className="st-ctl st-ctl-on flex-shrink-0 px-4 py-2.5 text-[13px] font-semibold">
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── CAPTIONS OVERLAY ──
          Sits clear of the dock, which is taller on a phone because the
          secondary controls wrap onto their own row. */}
      {captionsOn && (
        <div className="pointer-events-none absolute bottom-[8.5rem] left-0 right-0 z-30 flex justify-center px-4 md:bottom-[7rem]">
          <div className="st-cc flex min-h-[62px] w-full max-w-2xl flex-col justify-center gap-1 px-5 py-3.5">
            {(finalLines.length > 0 || interimText) ? (
              <>
                {finalLines.map(l => (
                  <div key={l.id} className="animate-fadeIn flex gap-2 text-[18px] leading-snug">
                    <span className="shrink-0 font-bold" style={{ color: 'var(--st-accent-text)' }}>{l.speaker}:</span>
                    <span>{l.text}</span>
                  </div>
                ))}
                {interimText && (
                  <div className="flex gap-2 text-[18px] leading-snug text-[var(--st-dim)]">
                    <span className="shrink-0 font-bold" style={{ color: 'var(--st-faint)' }}>{displayName || 'Host'}:</span>
                    <span>{interimText}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2.5 text-[13px] font-medium text-[var(--st-faint)]">
                <span className="st-live-dot" />
                {captionStatus === 'listening' ? 'Listening…' : 'Starting captions…'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS ──
          Two capsules. Below lg they stack - tools on top, core controls (and
          Leave) underneath where the thumb is. From lg the tools lift out to
          the right edge, so the core dock stays dead centre however many extra
          buttons a host has. lg, not md: at tablet width the centred dock and
          a right-pinned group would run into each other. */}
      <div className="relative z-20 flex flex-shrink-0 flex-col items-center gap-2 px-2 pb-2 pt-1 lg:flex-row lg:justify-center lg:px-5 lg:pb-4 lg:pt-2">

        {/* Tools: captions, people, snapshot, transcript, chat. */}
        <div className="st-dock order-first flex w-full items-center justify-center gap-1.5 overflow-x-auto p-2 lg:absolute lg:bottom-4 lg:right-5 lg:order-none lg:w-auto lg:overflow-visible">
          <button onClick={toggleCaptions}
            className={`st-ctl relative h-11 flex-shrink-0 px-3.5 text-[13px] font-extrabold tracking-wider ${captionsOn ? 'st-ctl-on' : ''}`}
            title="Toggle Live Captions (CC)">
            CC
            {captionsOn && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
                style={{
                  background: captionStatus === 'listening' ? 'var(--st-live)'
                    : captionStatus === 'error' ? 'var(--st-danger)' : 'var(--st-warn)',
                  boxShadow: '0 0 0 2px rgb(255 255 255 / .9)',
                }} />
            )}
          </button>
          {captionsOn && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowLangPicker(v => !v)}
                className="st-ctl flex h-11 items-center gap-1.5 px-3 text-[11px] font-semibold"
              >
                <span className="text-sm leading-none">{LANGUAGES.find(l => l.code === captionLang)?.flag}</span>
                <span className="max-w-[70px] truncate">{LANGUAGES.find(l => l.code === captionLang)?.label}</span>
                <span className="text-[var(--st-dim)]">▾</span>
              </button>

              {showLangPicker && (
                <div className="st-pop absolute bottom-[3.25rem] right-0 z-50 w-60 overflow-hidden rounded-[16px]">
                  {/* Search */}
                  <div className="border-b border-[var(--st-line)] p-2">
                    <input
                      autoFocus
                      value={langSearch}
                      onChange={e => setLangSearch(e.target.value)}
                      placeholder="Search language…"
                      className="st-input w-full px-3 py-2 text-[13px]"
                    />
                  </div>
                  {/* List */}
                  <div className="max-h-52 overflow-y-auto p-1">
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
                          className={`st-row flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-[13px] ${captionLang === l.code ? 'font-semibold' : ''}`}
                          style={captionLang === l.code
                            ? { background: 'var(--st-accent-soft)', color: 'var(--st-accent-text)' }
                            : undefined}
                        >
                          <span className="text-base leading-none">{l.flag}</span>
                          <span className="truncate">{l.label}</span>
                          {captionLang === l.code && <span className="ml-auto" style={{ color: 'var(--st-accent-text)' }}>✓</span>}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => { setShowParticipants(v => !v); setShowChat(false); setShowTranscript(false) }}
            className={`st-ctl h-11 w-11 flex-shrink-0 ${showParticipants ? 'st-ctl-on' : ''}`}
            title="Participants">
            <FiUsers size={17} />
          </button>
          <button onClick={captureManualSnapshot}
            className="st-ctl h-11 w-11 flex-shrink-0"
            title="Capture Screen to Transcript">
            <FiImage size={17} />
          </button>
          <button onClick={() => { setShowTranscript(v => !v); setShowChat(false); setShowParticipants(false) }}
            className={`st-ctl h-11 w-11 flex-shrink-0 ${showTranscript ? 'st-ctl-on' : ''}`}
            title="Meeting Transcript">
            <FiFileText size={17} />
          </button>
          <button onClick={() => { setShowChat(v => !v); setShowParticipants(false); setShowTranscript(false) }}
            className={`st-ctl relative h-11 w-11 flex-shrink-0 ${showChat ? 'st-ctl-on' : ''}`}
            title="Chat">
            <FiMessageSquare size={17} />
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full"
                style={{ background: 'var(--st-danger)', boxShadow: '0 0 0 2px rgb(255 255 255 / .9)' }} />
            )}
          </button>
        </div>

        {/* Core controls. flex-wrap so a host on a narrow laptop (every
            control plus "End class") wraps rather than clipping. */}
        <div className="st-dock flex w-full flex-wrap items-center justify-center gap-1.5 p-2 lg:w-auto lg:max-w-full">
          {/* Mic */}
          <button onClick={toggleMic}
            className={`st-ctl h-11 w-11 ${micOn ? '' : 'st-ctl-off'}`}
            title={micOn ? 'Mute' : 'Unmute'}>
            {micOn ? <FiMic size={18} /> : <FiMicOff size={18} />}
          </button>

          {/* Camera */}
          <button onClick={toggleCam}
            className={`st-ctl h-11 w-11 ${camOn ? '' : 'st-ctl-off'}`}
            title={camOn ? 'Turn off camera' : 'Turn on camera'}>
            {camOn ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
          </button>

          {/* Screen share */}
          <button onClick={toggleScreen}
            className={`st-ctl h-11 w-11 ${screenSharing ? 'st-ctl-on' : ''}`}
            title={screenSharing ? 'Stop sharing' : 'Share screen'}>
            <FiMonitor size={18} />
          </button>

          {/* Whiteboard */}
          <button onClick={() => setShowWhiteboard(v => !v)}
            className={`st-ctl h-11 w-11 ${showWhiteboard ? 'st-ctl-on' : ''}`}
            title="Whiteboard">
            <FiEdit3 size={18} />
          </button>

          {/* Leave (hosts can also close the class for everyone) */}
          <button onClick={() => handleLeave(false)} disabled={leaving}
            className="st-leave ml-1.5 flex h-11 items-center gap-2 px-5 font-semibold disabled:opacity-60 md:ml-3 md:px-6"
            title="Leave call">
            {leaving ? <FiLoader size={17} className="animate-spin" /> : <FiPhoneOff size={17} />}
            <span className="text-[13px]">{leaving ? 'Leaving…' : 'Leave'}</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                if (window.confirm('End this class for everyone? Students will no longer be able to join.')) handleLeave(true)
              }}
              disabled={leaving}
              className="st-danger-ghost flex h-11 items-center gap-2 px-4 text-[13px] font-semibold disabled:opacity-60"
              title="End the class for everyone">
              <span className="md:hidden">End</span><span className="hidden md:inline">End class</span>
            </button>
          )}
        </div>

      </div>

      <RoomAudioRenderer />
    </div>
  )
}

// ─── Outer wrapper — handles token fetch ────────────────────────────────────
export default function LiveKitMeeting({ roomName, displayName, onClose, isAdmin = false, meetingTitle, meeting, session,
  authKey = 'token', tokenApi = '/api/livekit/token',
  guestApi = '/api/livekit/guest', transcriptApi = '/api/admin/meetings/save-transcript',
  boardsApi = '/api/meetings/boards', imagesApi = '/api/meetings/board-images', onEndClass }) {
  const [token, setToken] = useState(null)
  const [wsUrl, setWsUrl] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  // Connection / device failures used to be swallowed into a console warning
  // while the UI rendered a normal-looking (but dead) meeting.
  const [roomError, setRoomError] = useState(null)
  const [startMuted, setStartMuted] = useState(false)
  const [serverIsHost, setServerIsHost] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    // A guest arrives with a token already minted by the waiting-room flow.
    if (session?.token) {
      setToken(session.token)
      setWsUrl(session.wsUrl)
      setStartMuted(!!session.startMuted)
      setServerIsHost(!!session.userInfo?.isHost)
      setLoading(false)
      return () => { cancelled = true }
    }
    const fetchToken = async () => {
      setLoading(true); setError(null); setRoomError(null)
      try {
        const authToken = localStorage.getItem(authKey)
        const res = await fetch(
          `${tokenApi}?room=${encodeURIComponent(roomName)}&name=${encodeURIComponent(displayName || '')}`,
          { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
        )
        const data = await res.json().catch(() => ({}))
        // Surface the server's actual reason (not enrolled / expired / not
        // started yet) instead of a generic failure.
        if (!res.ok) throw new Error(data?.error || `Could not join this meeting (${res.status}).`)
        if (cancelled) return
        setToken(data.token)
        setWsUrl(data.wsUrl)
        setStartMuted(!!data.startMuted)
        setServerIsHost(!!data?.userInfo?.isHost)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (roomName) fetchToken()
    else { setError('This meeting has no room yet. Please contact your tutor.'); setLoading(false) }
    return () => { cancelled = true }
  }, [roomName, displayName, attempt, session, authKey, tokenApi])

  if (loading) {
    return (
      <div className="studio st-stage fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="st-glass mx-auto mb-5 flex h-14 w-14 items-center justify-center text-[18px] font-bold"
            style={{ color: 'var(--st-accent-text)' }}>
            D
          </div>
          <p className="text-[15px] font-semibold">Joining your class…</p>
          <p className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-[var(--st-faint)]">
            <FiLoader className="animate-spin" size={12} />
            <span className="st-mono max-w-[60vw] truncate">{roomName}</span>
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="studio st-stage fixed inset-0 z-50 flex items-center justify-center p-5">
        <div className="st-pop w-full max-w-md rounded-[16px] p-7 text-center md:p-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[16px]"
            style={{ background: '#b91c1c14' }}>
            <FiPhoneOff style={{ color: 'var(--st-danger)' }} size={24} />
          </div>
          <p className="mb-2 text-[18px] font-semibold">Can&apos;t join this class</p>
          <p className="mb-7 text-[13px] leading-relaxed text-[var(--st-dim)]">{error}</p>
          <div className="flex items-center justify-center gap-2.5">
            <button onClick={() => setAttempt(a => a + 1)}
              className="st-ctl st-ctl-on px-6 py-2.5 text-[13px] font-semibold">
              Try again
            </button>
            <button onClick={onClose} className="st-ctl px-6 py-2.5 text-[13px] font-semibold">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {roomError && (
        <div className="studio fixed inset-0 z-[60] flex items-center justify-center p-5"
          style={{ background: 'rgb(10 10 11 / .5)' }}>
          <div className="st-pop w-full max-w-md rounded-[16px] p-7 text-center md:p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[16px]"
              style={{ background: '#b4530914' }}>
              <FiAlertTriangle style={{ color: 'var(--st-warn)' }} size={24} />
            </div>
            <p className="mb-2 text-[18px] font-semibold">{roomError.title}</p>
            <p className="mb-7 text-[13px] leading-relaxed text-[var(--st-dim)]">{roomError.message}</p>
            <div className="flex items-center justify-center gap-2.5">
              <button onClick={() => { setRoomError(null); setAttempt(a => a + 1) }}
                className="st-ctl st-ctl-on px-6 py-2.5 text-[13px] font-semibold">
                Rejoin
              </button>
              <button onClick={onClose} className="st-ctl px-6 py-2.5 text-[13px] font-semibold">
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        video={!startMuted}
        audio={!startMuted}
        options={{ adaptiveStream: true, dynacast: true }}
        onError={(e) => setRoomError({
          title: 'Connection problem',
          message: (e && e.message) || 'We could not reach the class server. Check your internet and try again.',
        })}
        // livekit reports which device kind failed: 'videoinput' for the
        // camera, 'audioinput' for the mic, and undefined for screen share,
        // which has no device kind at all (sourceToKind() in livekit-client).
        // Without that check, cancelling the screen picker threw a
        // "Camera / microphone blocked" modal over a perfectly healthy room
        // every single time someone changed their mind about sharing.
        onMediaDeviceFailure={(failure, kind) => {
          if (kind !== 'videoinput' && kind !== 'audioinput') return
          const device = kind === 'videoinput' ? 'camera' : 'microphone'
          setRoomError({
            title: kind === 'videoinput' ? 'Camera blocked' : 'Microphone blocked',
            message: String(failure).includes('Permission')
              ? `Allow ${device} access in your browser, then rejoin.`
              : `We could not start your ${device}. Check that no other app is using it, then rejoin.`,
          })
        }}
        onConnected={() => setRoomError(null)}
        // Covers both leaving and the host closing the room out from under us.
        onDisconnected={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      >
        <MeetingRoom
          roomName={roomName}
          displayName={displayName}
          meetingTitle={meetingTitle}
          meeting={meeting}
          authKey={authKey}
          guestApi={guestApi}
          transcriptApi={transcriptApi}
          boardsApi={boardsApi}
          imagesApi={imagesApi}
          onEndClass={onEndClass}
          isAdmin={serverIsHost ?? isAdmin}
          onClose={onClose}
        />
      </LiveKitRoom>
    </>
  )
}
