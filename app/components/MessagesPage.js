'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { FiSearch, FiPlus, FiTrash2, FiSend, FiPaperclip, FiX, FiCheck, FiMoreVertical, FiDownload, FiSmile } from 'react-icons/fi'
import { BsCheckAll } from 'react-icons/bs'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const POLL_INTERVAL = 3000

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString()
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

export default function MessagesPage() {
  const { user } = useAuth()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
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
    } catch {}
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
      }
    } catch {}
    setShowNewChat(false)
    setUserSearch('')
  }

  // Delete conversation
  const deleteConversation = async (convoId) => {
    if (!confirm('Delete this conversation?')) return
    try {
      await fetch('/api/messages', {
        method: 'DELETE',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convoId })
      })
      setConversations(prev => prev.filter(c => c._id !== convoId))
      if (activeConvo?._id === convoId) { setActiveConvo(null); setMessages([]) }
    } catch {}
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

  const filteredConvos = conversations.filter(c =>
    c.otherUser?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredUsers = availableUsers.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const grouped = groupMessagesByDate(messages)

  const roleColor = (role) => {
    if (role === 'Admin') return 'bg-purple-100 text-purple-700'
    if (role === 'Tutor') return 'bg-green-100 text-green-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <div className="flex h-screen bg-gray-100" onClick={() => { setReactionMenu(null); setContextMenu(null) }}>
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">Messages</h2>
            <button
              onClick={openNewChat}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <FiPlus size={14} /> New Chat
            </button>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : filteredConvos.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              No conversations yet.<br />Click "New Chat" to start.
            </div>
          ) : (
            filteredConvos.map(convo => (
              <div
                key={convo._id}
                onClick={() => setActiveConvo(convo)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b transition-colors group ${activeConvo?._id === convo._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {convo.otherUser?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800 truncate">{convo.otherUser?.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatTime(convo.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-500 truncate">{convo.lastMessage || 'No messages yet'}</span>
                    {convo.unread > 0 && (
                      <span className="ml-1 flex-shrink-0 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{convo.unread}</span>
                    )}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor(convo.otherUser?.role)}`}>
                    {convo.otherUser?.role}
                  </span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteConversation(convo._id) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1 rounded"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="px-6 py-4 bg-white border-b flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              {activeConvo.otherUser?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{activeConvo.otherUser?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(activeConvo.otherUser?.role)}`}>
                {activeConvo.otherUser?.role}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1" style={{ background: '#efeae2' }}>
            {loadingMsgs ? (
              <div className="text-center text-gray-400 text-sm mt-10">Loading messages...</div>
            ) : grouped.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-10">No messages yet. Say hello! 👋</div>
            ) : (
              grouped.map((item, idx) => {
                if (item.type === 'date') {
                  return (
                    <div key={`date-${idx}`} className="flex justify-center my-3">
                      <span className="bg-white text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">{item.label}</span>
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
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'} group mb-1`}
                    onDoubleClick={() => setReactionMenu(reactionMenu === msg._id ? null : msg._id)}
                  >
                    <div className={`relative max-w-xs lg:max-w-md xl:max-w-lg`}>
                      {/* Reaction menu on double click */}
                      {reactionMenu === msg._id && (
                        <div
                          className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-10 bg-white rounded-full shadow-lg px-2 py-1 flex gap-1 z-20`}
                          onClick={e => e.stopPropagation()}
                        >
                          {EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => reactToMessage(msg._id, emoji)}
                              className={`text-lg hover:scale-125 transition-transform ${myReaction?.emoji === emoji ? 'opacity-100' : 'opacity-70'}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`px-3 py-2 rounded-2xl shadow-sm text-sm relative ${
                          isMine
                            ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-sm'
                            : 'bg-white text-gray-800 rounded-tl-sm'
                        }`}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ messageId: msg._id, x: e.clientX, y: e.clientY }) }}
                      >
                        {/* File attachment */}
                        {msg.fileUrl && (
                          <div className="mb-1">
                            {msg.fileType?.startsWith('image/') ? (
                              <img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg max-h-48 object-cover" />
                            ) : (
                              <a
                                href={msg.fileUrl}
                                download={msg.fileName}
                                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
                              >
                                <FiPaperclip size={14} className="text-gray-500" />
                                <span className="text-xs text-blue-600 underline truncate max-w-[180px]">{msg.fileName}</span>
                                <FiDownload size={12} className="text-gray-400 flex-shrink-0" />
                              </a>
                            )}
                          </div>
                        )}

                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

                        {/* Time + seen ticks */}
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                          {isMine && (
                            isSeen
                              ? <BsCheckAll size={14} className="text-blue-500" />
                              : <FiCheck size={12} className="text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Reactions display */}
                      {msg.reactions?.length > 0 && (
                        <div className={`flex gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="text-sm bg-white rounded-full px-1 shadow-sm">{r.emoji}</span>
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
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 py-3 bg-white border-t flex items-end gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
            >
              {uploading ? <span className="text-xs">...</span> : <FiPaperclip size={20} />}
            </button>
            <textarea
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none border rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 max-h-32 overflow-y-auto"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!text.trim() && !uploading}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">or click "New Chat" to start messaging</p>
          </div>
        </div>
      )}

      {/* Context menu (right-click on message) */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border z-50 py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { setReactionMenu(contextMenu.messageId); setContextMenu(null) }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
          >
            <FiSmile size={14} /> React
          </button>
          <button
            onClick={() => deleteMessage(contextMenu.messageId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-red-50 text-red-600"
          >
            <FiTrash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowNewChat(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-96 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800">New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No users found</p>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u._id}
                    onClick={() => startChat(u._id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColor(u.role)}`}>{u.role}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
