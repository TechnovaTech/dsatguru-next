'use client'
import { useEffect, useRef, useCallback } from 'react'
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw'
import 'tldraw/tldraw.css'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent } from 'livekit-client'

const WB_CHANNEL = 'whiteboard-sync'

export default function MeetingWhiteboard({ isAdmin }) {
  const room = useRoomContext()
  const storeRef = useRef(null)
  const suppressRef = useRef(false) // prevent echo loop

  // When admin changes the board → broadcast to all via LiveKit data channel
  const handleStoreChange = useCallback(() => {
    if (!isAdmin || !room || suppressRef.current) return
    try {
      const snapshot = storeRef.current?.getSnapshot()
      if (!snapshot) return
      const payload = JSON.stringify({ type: WB_CHANNEL, snapshot })
      const encoded = new TextEncoder().encode(payload)
      // Only send if small enough (< 15KB to avoid fragmentation)
      if (encoded.length < 15000) {
        room.localParticipant.publishData(encoded, { reliable: true })
      }
    } catch {}
  }, [isAdmin, room])

  // Receive board updates (students receive from admin)
  useEffect(() => {
    if (!room || isAdmin) return
    const handler = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type !== WB_CHANNEL || !msg.snapshot) return
        suppressRef.current = true
        storeRef.current?.loadSnapshot(msg.snapshot)
        suppressRef.current = false
      } catch {}
    }
    room.on(RoomEvent.DataReceived, handler)
    return () => room.off(RoomEvent.DataReceived, handler)
  }, [room, isAdmin])

  return (
    <div className="w-full h-full relative">
      {/* Read-only overlay for students */}
      {!isAdmin && (
        <div className="absolute inset-0 z-10 cursor-not-allowed" title="View only" />
      )}
      <Tldraw
        onMount={(editor) => {
          storeRef.current = editor.store
          if (isAdmin) {
            // Listen for any change and broadcast
            editor.store.listen(handleStoreChange, { scope: 'document' })
          }
          if (!isAdmin) {
            // Hide toolbar for students
            editor.updateInstanceState({ isReadonly: true })
          }
        }}
        hideUi={!isAdmin}
      />
    </div>
  )
}
