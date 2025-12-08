import { useState, useEffect } from "react";
import { FiSend, FiUsers, FiMail, FiMessageSquare, FiBell } from "react-icons/fi";

const Communication = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const mockAnnouncements = [
    {
      id: 1,
      title: "System Maintenance",
      content: "Scheduled maintenance on Sunday 2-4 AM",
      type: "Technical",
      targetAudience: "all",
      isUrgent: true,
      isSent: true,
      createdAt: "2024-01-15T10:00:00"
    },
    {
      id: 2,
      title: "New Course Available",
      content: "Advanced Physics course now available for enrollment",
      type: "Academic",
      targetAudience: "students",
      isUrgent: false,
      isSent: false,
      createdAt: "2024-01-14T15:30:00"
    }
  ];

  useEffect(() => {
    setAnnouncements(mockAnnouncements);
  }, []);

  const handleSendAnnouncement = async (id) => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAnnouncements(prev => 
        prev.map(ann => ann.id === id ? { ...ann, isSent: true } : ann)
      );
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Communication</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FiSend /> Create Announcement
        </button>
      </div>

      {/* Communication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Sent"
          value="156"
          icon={<FiMail />}
          color="bg-green-500"
        />
        <StatCard
          title="Pending"
          value="8"
          icon={<FiBell />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Recipients"
          value="1,234"
          icon={<FiUsers />}
          color="bg-blue-500"
        />
        <StatCard
          title="Open Rate"
          value="87%"
          icon={<FiMessageSquare />}
          color="bg-purple-500"
        />
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Announcements</h3>
        </div>
        <div className="divide-y">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{announcement.title}</h4>
                    {announcement.isUrgent && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        Urgent
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      announcement.type === 'Technical' ? 'bg-gray-100 text-gray-800' :
                      announcement.type === 'Academic' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {announcement.type}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{announcement.content}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Target: {announcement.targetAudience}</span>
                    <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {announcement.isSent ? (
                    <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded">
                      Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendAnnouncement(announcement.id)}
                      disabled={loading}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? "Sending..." : "Send"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Announcement Modal */}
      {showModal && (
        <AnnouncementModal
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            setAnnouncements([
              { ...data, id: Date.now(), isSent: false, createdAt: new Date().toISOString() },
              ...announcements
            ]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`${color} text-white p-3 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
);

const AnnouncementModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "General",
    targetAudience: "all",
    isUrgent: false,
    scheduledAt: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Create Announcement</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows="4"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="General">General</option>
                <option value="Academic">Academic</option>
                <option value="Technical">Technical</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Audience</label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">All Users</option>
                <option value="students">Students Only</option>
                <option value="tutors">Tutors Only</option>
                <option value="admins">Admins Only</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="urgent"
              checked={formData.isUrgent}
              onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
            />
            <label htmlFor="urgent" className="text-sm">Mark as urgent</label>
          </div>
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Communication;