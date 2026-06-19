'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../components/AuthContext'
import { useConfirm, useToast } from '../../components/ui/UIProvider'
import {
  FiSearch, FiPlus, FiTrash2, FiSend, FiPaperclip, FiX, FiCheck,
  FiDownload, FiSmile, FiMessageSquare, FiUsers, FiInbox, FiArrowLeft
} from 'react-icons/fi'
import { BsCheckAll } from 'react-icons/bs'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const POLL_INTERVAL = 3000

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString()
}

function fullTimestamp(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

function groupMessagesByDate(messages) {
  const groups = []
  let lastDate = null
  for (const msg of messages) {
    const dateStr = formatDate(msg.createdAt)
    if (dateStr !== lastDate) {
      groups.push({ type: 'date', label: dateStr })
      lastDate = dateStr
    }
    groups.push({ type: 'message', data: msg })
  }
  return groups
}

export default function TutorMessagesPage() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkUsers, setBulkUsers] = useState([])
  const [bulkSelected, setBulkSelected] = useState(new Set())
  const [bulkMessage, setBulkMessage] = useState('')
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkDone, setBulkDone] = useState('')
  const [typingUsers, setTypingUsers] = useState([])
  const [reactionMenu, setReactionMenu] = useState(null) // messageId
  const [contextMenu, setContextMenu] = useState(null) // { messageId, x, y }
  const [uploading, setUploading] = useState(false)
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const pollRef = useRef(null)
  const activeConvoRef = useRef(null)

  activeConvoRef.current = activeConvo

  const authHeaders = { Authorization: `Bearer ${token}` }

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages', { headers: authHeaders })
      const data = await res.json()
      if (data.conversations) setConversations(data.conversations)
    } catch {}
  }, [token])

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (convoId) => {
    if (!convoId) return
    try {
      const res = await fetch(`/api/messages/${convoId}`, { headers: authHeaders })
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch {}
  }, [token])

  // Poll for new messages and typing
  const poll = useCallback(async () => {
    const convoId = activeConvoRef.current?._id
    await fetchConversations()
    if (convoId) {
      await fetchMessages(convoId)
      try {
        const res = await fetch(`/api/messages/typing?conversationId=${convoId}`, { headers: authHeaders })
        const data = await res.json()
        setTypingUsers(data.typingUsers || [])
      } catch {}
    }
  }, [fetchConversations, fetchMessages, token])

  useEffect(() => {
    if (!token) return
    fetchConversations().finally(() => setLoadingConvos(false))
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [token])

  useEffect(() => {
    if (activeConvo) {
      setLoadingMsgs(true)
      fetchMessages(activeConvo._id).finally(() => setLoadingMsgs(false))
    }
  }, [activeConvo?._id])

  // Typing indicator
  const sendTyping = async (isTyping) => {
    if (!activeConvo) return
    try {
      await fetch('/api/messages/typing', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConvo._id, isTyping })
      })
    } catch {}
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    sendTyping(true)
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000)
  }

  // Send message
  const sendMessage = async (fileData = null) => {
    if (!activeConvo || (!text.trim() && !fileData)) return
    const body = fileData
      ? { ...fileData, text: '' }
      : { text: text.trim() }
    setText('')
    sendTyping(false)
    try {
      await fetch(`/api/messages/${activeConvo._id}`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      await fetchMessages(activeConvo._id)
      await fetchConversations()
    } catch {}
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // File upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/messages/upload', { method: 'POST', headers: authHeaders, body: fd })
      const data = await res.json()
      if (data.fileUrl) await sendMessage({ fileUrl: data.fileUrl, fileName: data.fileName, fileType: data.fileType })
      else if (data.error) toast.error(data.error)
    } catch {
      toast.error('Failed to upload file')
    }
    setUploading(false)
    e.target.value = ''
  }

  // Start new chat
  const startChat = async (targetUserId) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      })
      const data = await res.json()
      if (data.conversationId) {
        await fetchConversations()
        // Find or create convo object
        const convo = conversations.find(c => c._id === data.conversationId)
        if (convo) setActiveConvo(convo)
        else {
          // Refresh and find
          const res2 = await fetch('/api/messages', { headers: authHeaders })
          const d2 = await res2.json()
          if (d2.conversations) {
            setConversations(d2.conversations)
            const found = d2.conversations.find(c => c._id.toString() === data.conversationId.toString())
            if (found) setActiveConvo(found)
          }
        }
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch {
      toast.error('Failed to start conversation')
    }
    setShowNewChat(false)
    setUserSearch('')
  }

  // Delete conversation
  const deleteConversation = async (convoId) => {
    if (!(await confirm({ message: 'Delete this conversation?', tone: 'danger', confirmText: 'Delete' }))) return
    try {
      await fetch('/api/messages', {
        method: 'DELETE',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convoId })
      })
      setConversations(prev => prev.filter(c => String(c._id) !== String(convoId)))
      if (String(activeConvo?._id) === String(convoId)) { setActiveConvo(null); setMessages([]) }
    } catch {
      toast.error('Failed to delete conversation')
    }
  }

  // React to message
  const reactToMessage = async (messageId, emoji) => {
    if (!activeConvo) return
    try {
      await fetch(`/api/messages/${activeConvo._id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reaction: emoji })
      })
      await fetchMessages(activeConvo._id)
    } catch {}
    setReactionMenu(null)
  }

  // Delete message
  const deleteMessage = async (messageId) => {
    if (!activeConvo) return
    try {
      await fetch(`/api/messages/${activeConvo._id}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, deleteMsg: true })
      })
      await fetchMessages(activeConvo._id)
    } catch {}
    setContextMenu(null)
  }

  // Load available users for new chat
  const openNewChat = async () => {
    setShowNewChat(true)
    try {
      const res = await fetch('/api/messages/users', { headers: authHeaders })
      const data = await res.json()
      if (data.users) setAvailableUsers(data.users)
    } catch {}
  }

  const openBulkModal = async () => {
    setShowBulkModal(true)
    setBulkMessage('')
    setBulkSearch('')
    setBulkDone('')
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders })
      if (res.ok) {
        const data = await res.json()
        const users = Array.isArray(data) ? data : (data.users || [])
        setBulkUsers(users)
        setBulkSelected(new Set(users.map(u => u._id)))
      }
    } catch {}
  }

  const handleSendBulk = async () => {
    if (!bulkMessage.trim() || bulkSelected.size === 0) return
    setBulkSending(true)
    try {
      const res = await fetch('/api/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ userIds: Array.from(bulkSelected), message: bulkMessage.trim() })
      })
      const data = await res.json()
      setBulkDone(`Sent to ${data.sent} users successfully!`)
      setBulkMessage('')
      fetchConversations()
    } catch {
      setBulkDone('Failed to send.')
    } finally {
      setBulkSending(false)
    }
  }

  const filteredConvos = conversations.filter(c =>
    c.otherUser?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredUsers = availableUsers.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const grouped = groupMessagesByDate(messages)

  const roleColor = (role) => {
    if (role === 'Admin') return 'bg-purple-100 text-purple-700'
    if (role === 'Tutor' || role === 'TutorAdmin') return 'bg-emerald-100 text-emerald-700'
    if (role === 'Student') return 'bg-indigo-100 text-indigo-700'
    return 'bg-slate-100 text-slate-600'
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0)

  return (
    <div className="min-h-screen bg-slate-50" onClick={() => { setReactionMenu(null); setContextMenu(null) }}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 lg:text-3xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <FiMessageSquare className="h-5 w-5" />
              </span>
              Messages
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Chat with admins, tutors and students in real time
              {totalUnread > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {totalUnread} unread
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {['Admin', 'TutorAdmin'].includes(user?.role) && (
              <button
                onClick={openBulkModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <FiUsers className="h-4 w-4" /> Bulk Message
              </button>
            )}
            <button
              onClick={openNewChat}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <FiPlus className="h-4 w-4" /> New Chat
            </button>
          </div>
        </div>

        {/* Chat shell */}
        <div className="flex h-[calc(100vh-11rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Sidebar / conversation list */}
          <div className={`flex w-full flex-shrink-0 flex-col border-r border-slate-100 sm:w-80 ${activeConvo ? 'hidden sm:flex' : 'flex'}`}>
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                <div className="flex h-full items-center justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                </div>
              ) : filteredConvos.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <FiInbox className="h-6 w-6" />
                  </span>
                  <p className="text-sm font-semibold text-slate-700">
                    {search ? 'No matches found' : 'No conversations yet'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {search ? 'Try a different search.' : 'Click "New Chat" to start messaging.'}
                  </p>
                </div>
              ) : (
                filteredConvos.map(convo => (
                  <div
                    key={convo._id}
                    onClick={() => setActiveConvo(convo)}
                    className={`group flex cursor-pointer items-start gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 ${activeConvo?._id === convo._id ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {convo.otherUser?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{convo.otherUser?.name || 'Unknown'}</span>
                        <span className="flex-shrink-0 text-xs text-slate-400" title={fullTimestamp(convo.lastMessageAt)}>
                          {formatTime(convo.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-slate-500">{convo.lastMessage || 'No messages yet'}</span>
                        {convo.unread > 0 && (
                          <span className="flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                            {convo.unread}
                          </span>
                        )}
                      </div>
                      {convo.otherUser?.role && (
                        <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${roleColor(convo.otherUser?.role)}`}>
                          {convo.otherUser.role}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteConversation(convo._id) }}
                      className="flex-shrink-0 rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Delete conversation"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          {activeConvo ? (
            <div className={`flex min-w-0 flex-1 flex-col ${activeConvo ? 'flex' : 'hidden sm:flex'}`}>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
                <button
                  onClick={() => setActiveConvo(null)}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 sm:hidden"
                  title="Back to conversations"
                >
                  <FiArrowLeft size={18} />
                </button>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                  {activeConvo.otherUser?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{activeConvo.otherUser?.name || 'Unknown'}</p>
                  {activeConvo.otherUser?.role && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${roleColor(activeConvo.otherUser?.role)}`}>
                      {activeConvo.otherUser.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-1 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6">
                {loadingMsgs ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <FiMessageSquare className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                    <p className="mt-1 text-xs text-slate-500">Say hello to start the conversation.</p>
                  </div>
                ) : (
                  grouped.map((item, idx) => {
                    if (item.type === 'date') {
                      return (
                        <div key={`date-${idx}`} className="my-3 flex justify-center">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">{item.label}</span>
                        </div>
                      )
                    }
                    const msg = item.data
                    const isMine = String(msg.senderId) === String(user?.id || user?._id)
                    const isSeen = msg.seenBy?.some(id => id.toString() !== user?._id?.toString())
                    const myReaction = msg.reactions?.find(r => r.userId?.toString() === user?._id?.toString())

                    return (
                      <div
                        key={msg._id}
                        className={`group mb-1 flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        onDoubleClick={() => setReactionMenu(reactionMenu === msg._id ? null : msg._id)}
                      >
                        <div className="relative max-w-xs lg:max-w-md xl:max-w-lg">
                          {/* Reaction menu on double click */}
                          {reactionMenu === msg._id && (
                            <div
                              className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-10 z-20 flex gap-1 rounded-full border border-slate-100 bg-white px-2 py-1 shadow-lg`}
                              onClick={e => e.stopPropagation()}
                            >
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => reactToMessage(msg._id, emoji)}
                                  className={`text-lg transition-transform hover:scale-125 ${myReaction?.emoji === emoji ? 'opacity-100' : 'opacity-70'}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`relative rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                              isMine
                                ? 'rounded-br-sm bg-indigo-600 text-white'
                                : 'rounded-bl-sm bg-slate-100 text-slate-800'
                            }`}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ messageId: msg._id, x: e.clientX, y: e.clientY }) }}
                          >
                            {/* File attachment */}
                            {msg.fileUrl && (
                              <div className="mb-1">
                                {msg.fileType?.startsWith('image/') ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={msg.fileUrl} alt={msg.fileName || 'attachment'} className="max-h-48 max-w-full rounded-lg object-cover" />
                                  </a>
                                ) : (
                                  <a
                                    href={msg.fileUrl}
                                    download={msg.fileName}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${isMine ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-white hover:bg-slate-50'}`}
                                  >
                                    <FiPaperclip size={14} className={isMine ? 'text-indigo-100' : 'text-slate-500'} />
                                    <span className={`max-w-[180px] truncate text-xs underline ${isMine ? 'text-white' : 'text-indigo-600'}`}>{msg.fileName || 'Download file'}</span>
                                    <FiDownload size={12} className={`flex-shrink-0 ${isMine ? 'text-indigo-100' : 'text-slate-400'}`} />
                                  </a>
                                )}
                              </div>
                            )}

                            {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                            {/* Time + seen ticks */}
                            <div className={`mt-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <span
                                className={`text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}
                                title={fullTimestamp(msg.createdAt)}
                              >
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMine && (
                                isSeen
                                  ? <BsCheckAll size={14} className="text-sky-200" title="Seen" />
                                  : <FiCheck size={12} className="text-indigo-200" title="Sent" />
                              )}
                            </div>
                          </div>

                          {/* Reactions display */}
                          {msg.reactions?.length > 0 && (
                            <div className={`mt-0.5 flex gap-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {msg.reactions.map((r, i) => (
                                <span key={i} className="rounded-full border border-slate-100 bg-white px-1.5 text-sm shadow-sm">{r.emoji}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="flex items-end gap-2 border-t border-slate-100 bg-white px-4 py-3">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                  title="Attach file"
                >
                  {uploading
                    ? <span className="block h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-500" />
                    : <FiPaperclip size={20} />}
                </button>
                <textarea
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="max-h-32 flex-1 resize-none overflow-y-auto rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ minHeight: '40px' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!text.trim()}
                  className="flex-shrink-0 rounded-full bg-indigo-600 p-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
                  title="Send"
                >
                  <FiSend size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden flex-1 items-center justify-center bg-slate-50 sm:flex">
              <div className="text-center">
                <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <FiMessageSquare className="h-8 w-8" />
                </span>
                <p className="text-lg font-semibold text-slate-700">Select a conversation</p>
                <p className="mt-1 text-sm text-slate-500">or click &quot;New Chat&quot; to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context menu (right-click on message) */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-lg border border-slate-100 bg-white py-1 shadow-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setReactionMenu(contextMenu.messageId); setContextMenu(null) }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FiSmile size={14} /> React
          </button>
          <button
            onClick={() => deleteMessage(contextMenu.messageId)}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <FiTrash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowNewChat(false)}>
          <div className="flex max-h-[80vh] w-96 max-w-full flex-col rounded-2xl border border-slate-100 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h3 className="text-lg font-bold text-slate-900">New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="text-slate-400 transition-colors hover:text-slate-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search users by name, email or role..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <FiUsers className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-slate-600">No users found</p>
                </div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u._id}
                    onClick={() => startChat(u._id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-indigo-50"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{u.name || 'Unknown'}</p>
                      {u.email && <p className="truncate text-xs text-slate-500">{u.email}</p>}
                    </div>
                    {u.role && (
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${roleColor(u.role)}`}>{u.role}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowBulkModal(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-100 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <FiUsers className="h-4 w-4" />
                  </span>
                  Bulk Message
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">{bulkSelected.size} of {bulkUsers.length} users selected</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 transition-colors hover:text-slate-600"><FiX size={20} /></button>
            </div>

            {/* User list */}
            <div className="border-b border-slate-100">
              <div className="border-b border-slate-100 p-3">
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    value={bulkSearch}
                    onChange={e => setBulkSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2">
                <span className="text-xs font-medium text-slate-600">Select / Deselect All</span>
                <button
                  onClick={() => {
                    if (bulkSelected.size === bulkUsers.length) setBulkSelected(new Set())
                    else setBulkSelected(new Set(bulkUsers.map(u => u._id)))
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  {bulkSelected.size === bulkUsers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {bulkUsers
                  .filter(u => !bulkSearch || u.name?.toLowerCase().includes(bulkSearch.toLowerCase()) || u.email?.toLowerCase().includes(bulkSearch.toLowerCase()))
                  .map(u => {
                    const checked = bulkSelected.has(u._id)
                    return (
                      <label key={u._id} className={`flex cursor-pointer items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0 hover:bg-slate-50 ${checked ? 'bg-indigo-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setBulkSelected(prev => {
                              const n = new Set(prev)
                              n.has(u._id) ? n.delete(u._id) : n.add(u._id)
                              return n
                            })
                          }}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{u.name || 'Unknown'}</p>
                          <p className="truncate text-xs text-slate-500">{u.email || ''}</p>
                        </div>
                        {u.role && (
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${roleColor(u.role)}`}>{u.role}</span>
                        )}
                      </label>
                    )
                  })}
              </div>
            </div>

            {/* Message input */}
            <div className="flex flex-col gap-3 p-4">
              {bulkDone && (
                <div className={`rounded-lg px-3 py-2 text-sm ${bulkDone.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {bulkDone}
                </div>
              )}
              <textarea
                value={bulkMessage}
                onChange={e => setBulkMessage(e.target.value)}
                placeholder="Write your message to all selected users..."
                className="w-full resize-none rounded-lg border border-slate-300 p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
              <button
                onClick={handleSendBulk}
                disabled={bulkSending || !bulkMessage.trim() || bulkSelected.size === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <FiSend size={14} /> {bulkSending ? `Sending to ${bulkSelected.size} users...` : `Send to ${bulkSelected.size} Users`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
