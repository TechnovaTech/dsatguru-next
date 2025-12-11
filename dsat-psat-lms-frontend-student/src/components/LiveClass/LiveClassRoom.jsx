import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveClassSignalR } from '../../hooks/useSignalR';
import { useAuth } from '../../context/AuthContext';
import { FiSend, FiUsers, FiMic, FiMicOff, FiVideo, FiVideoOff, FiMessageSquare, FiHelpCircle, FiX, FiExternalLink } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const LiveClassRoom = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, invoke, on, off, error } = useLiveClassSignalR();
  
  const [classInfo, setClassInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const joinClass = useCallback(async () => {
    if (!isConnected || !classId) return;
    
    try {
      setLoading(true);
      await invoke('JoinClass', classId);
      setIsJoined(true);
      toast.success('Joined live class successfully!');
    } catch (err) {
      console.error('Failed to join class:', err);
      toast.error('Failed to join class. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, classId, invoke]);

  const leaveClass = useCallback(async () => {
    if (!isConnected || !classId) return;
    
    try {
      await invoke('LeaveClass', classId);
      setIsJoined(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to leave class:', err);
    }
  }, [isConnected, classId, invoke, navigate]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    try {
      await invoke('SendMessage', classId, newMessage.trim(), isQuestion);
      setNewMessage('');
      setIsQuestion(false);
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const answerQuestion = async (messageId) => {
    if (!isConnected) return;
    
    try {
      await invoke('AnswerQuestion', classId, messageId);
    } catch (err) {
      console.error('Failed to answer question:', err);
      toast.error('Failed to answer question.');
    }
  };

  // SignalR event handlers
  useEffect(() => {
    if (!isConnected) return;

    const handleClassInfo = (info) => {
      setClassInfo(info);
      setMessages(info.recentMessages || []);
      setAttendees(prev => [...prev.filter(a => a.userId !== user?.id), {
        userId: user?.id,
        userName: user?.name,
        joinedAt: new Date()
      }]);
    };

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
      if (!showChat) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleUserJoined = (userInfo) => {
      setAttendees(prev => {
        const filtered = prev.filter(a => a.userId !== userInfo.UserId);
        return [...filtered, {
          userId: userInfo.UserId,
          userName: userInfo.UserName,
          joinedAt: new Date(userInfo.JoinedAt)
        }];
      });
      toast.success(`${userInfo.UserName} joined the class`);
    };

    const handleUserLeft = (userInfo) => {
      setAttendees(prev => prev.filter(a => a.userId !== userInfo.UserId));
      toast(`${userInfo.UserName} left the class`, { icon: '👋' });
    };

    const handleQuestionAnswered = (info) => {
      setMessages(prev => prev.map(msg => 
        msg.Id === info.MessageId 
          ? { ...msg, IsAnswered: true }
          : msg
      ));
      toast.success(`Question answered by ${info.AnsweredBy}`);
    };

    const handleAnnouncement = (announcement) => {
      setMessages(prev => [...prev, {
        ...announcement,
        Type: 'Announcement'
      }]);
      toast(`📢 ${announcement.SenderName}: ${announcement.Message}`, {
        duration: 5000,
        style: {
          background: '#3B82F6',
          color: 'white'
        }
      });
    };

    const handleError = (errorMessage) => {
      toast.error(errorMessage);
    };

    // Register event handlers
    on('ClassInfo', handleClassInfo);
    on('NewMessage', handleNewMessage);
    on('UserJoined', handleUserJoined);
    on('UserLeft', handleUserLeft);
    on('QuestionAnswered', handleQuestionAnswered);
    on('Announcement', handleAnnouncement);
    on('Error', handleError);

    // Join class when connected
    joinClass();

    return () => {
      // Cleanup event handlers
      off('ClassInfo', handleClassInfo);
      off('NewMessage', handleNewMessage);
      off('UserJoined', handleUserJoined);
      off('UserLeft', handleUserLeft);
      off('QuestionAnswered', handleQuestionAnswered);
      off('Announcement', handleAnnouncement);
      off('Error', handleError);
    };
  }, [isConnected, joinClass, on, off, showChat, user]);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isJoined) {
        leaveClass();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isJoined) {
        leaveClass();
      }
    };
  }, [isJoined, leaveClass]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMessageTypeIcon = (type, isQuestion) => {
    if (type === 'Announcement') return '📢';
    if (isQuestion) return '❓';
    return '💬';
  };

  const getMessageTypeColor = (type, isQuestion) => {
    if (type === 'Announcement') return 'bg-blue-50 border-blue-200';
    if (isQuestion) return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining live class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {classInfo?.Title || 'Live Class'}
              </h1>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FiUsers className="w-4 h-4" />
                <span>{attendees.length} attendees</span>
              </div>
              
              <button
                onClick={() => {
                  setShowChat(!showChat);
                  if (!showChat) setUnreadCount(0);
                }}
                className="relative bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <FiMessageSquare className="w-4 h-4" />
                <span>{showChat ? 'Hide Chat' : 'Show Chat'}</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={leaveClass}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <FiX className="w-4 h-4" />
                <span>Leave Class</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className={`${showChat ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-6`}>
            {/* Video/Meeting Area */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🎥</div>
                  <h3 className="text-xl font-semibold mb-2">Live Class Session</h3>
                  <p className="text-gray-300 mb-4">Join the Zoom meeting to participate</p>
                  {classInfo?.ZoomJoinUrl && (
                    <a
                      href={classInfo.ZoomJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiExternalLink className="w-4 h-4" />
                      <span>Join Zoom Meeting</span>
                    </a>
                  )}
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-center space-x-4">
                <button className="bg-gray-200 text-gray-700 p-3 rounded-full hover:bg-gray-300 transition-colors">
                  <FiMicOff className="w-5 h-5" />
                </button>
                <button className="bg-gray-200 text-gray-700 p-3 rounded-full hover:bg-gray-300 transition-colors">
                  <FiVideoOff className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Attendees List */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <FiUsers className="w-5 h-5" />
                <span>Attendees ({attendees.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {attendees.map((attendee) => (
                  <div key={attendee.userId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {attendee.userName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{attendee.userName}</p>
                      <p className="text-xs text-gray-500">
                        Joined {formatTime(attendee.joinedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <FiMessageSquare className="w-5 h-5" />
                    <span>Live Chat</span>
                  </h3>
                </div>
                
                {/* Messages */}
                <div 
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                >
                  {messages.map((message, index) => (
                    <div
                      key={message.Id || index}
                      className={`p-3 rounded-lg border ${getMessageTypeColor(message.Type, message.IsQuestion)}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{getMessageTypeIcon(message.Type, message.IsQuestion)}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {message.SenderName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.SentAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{message.Message}</p>
                      
                      {message.IsQuestion && !message.IsAnswered && user?.role === 'Instructor' && (
                        <button
                          onClick={() => answerQuestion(message.Id)}
                          className="mt-2 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          Mark as Answered
                        </button>
                      )}
                      
                      {message.IsQuestion && message.IsAnswered && (
                        <div className="mt-2 text-xs text-green-600 font-medium">
                          ✓ Answered
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={sendMessage} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isQuestion}
                          onChange={(e) => setIsQuestion(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <FiHelpCircle className="w-4 h-4" />
                        <span>Ask as question</span>
                      </label>
                    </div>
                    
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isQuestion ? "Ask a question..." : "Type a message..."}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isConnected}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || !isConnected}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiSend className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveClassRoom;