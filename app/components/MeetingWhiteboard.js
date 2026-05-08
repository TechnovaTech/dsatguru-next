'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then(m => m.Excalidraw),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-white"><span className="text-gray-400">Loading whiteboard...</span></div> }
)

const WB_CHANNEL = 'whiteboard-sync'

export default function MeetingWhiteboard({ isAdmin }) {
  const room = useRoomContext()
  const excalidrawApiRef = useRef(null)
  const suppressRef = useRef(false)
  const [ready, setReady] = useState(false)

  // Admin: broadcast changes to all participants
  const handleChange = useCallback((elements, appState) => {
    if (!isAdmin || !room || suppressRef.current || !ready) return
    try {
      const payload = JSON.stringify({
        type: WB_CHANNEL,
        elements: elements.filter(el => !el.isDeleted),
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
        }
      })
      const encoded = new TextEncoder().encode(payload)
      if (encoded.length < 60000) {
        room.localParticipant.publishData(encoded, { reliable: true })
      }
    } catch {}
  }, [isAdmin, room, ready])

  // Students: receive and render admin's board
  useEffect(() => {
    if (!room || isAdmin) return
    const handler = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type !== WB_CHANNEL || !excalidrawApiRef.current) return
        suppressRef.current = true
        excalidrawApiRef.current.updateScene({
          elements: msg.elements || [],
          appState: msg.appState || {}
        })
        suppressRef.current = false
      } catch {}
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => room.off(RoomEvent.DataReceived, handler)
  }, [room, isAdmin])

  return (
    <div className="w-full h-full relative bg-white">
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawApiRef.current = api
          setReady(true)
        }}
        onChange={isAdmin ? handleChange : undefined}
        viewModeEnabled={!isAdmin}
        zenModeEnabled={false}
        gridModeEnabled={false}
        theme="light"
        UIOptions={{
          canvasActions: {
            export: false,
            loadScene: isAdmin,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          tools: { image: false }
        }}
      />
      {!isAdmin && (
        <div className="absolute top-2 right-2 bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs px-3 py-1 rounded-full z-10">
          👁 View only
        </div>
      )}
    </div>
  )
}
