import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiVideo, FiDownload, FiCalendar, FiFileText, FiClock, FiUsers } from "react-icons/fi";
import { getCourseContent } from "../../../services/api/courseContent";
import toast from "react-hot-toast";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState({
    meetings: [],
    materials: [],
    syllabus: [],
    assignments: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('meetings');

  useEffect(() => {
    fetchCourseContent();
  }, [courseId]);

  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      const response = await getCourseContent(courseId);
      setCourseData(response.data || {
        meetings: [],
        materials: [],
        syllabus: [],
        assignments: []
      });
    } catch (error) {
      console.error('Failed to fetch course content:', error);
      if (error.response?.status === 403) {
        toast.error('You are not enrolled in this course');
        navigate('/dashboard/courses');
      } else {
        toast.error('Failed to load course content');
      }
    } finally {
      setLoading(false);
    }
  };

  const joinMeeting = (zoomLink) => {
    if (zoomLink) {
      window.open(zoomLink, '_blank');
    } else {
      toast.error('Meeting link not available');
    }
  };

  const downloadMaterial = (url, fileName) => {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'material';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error('Material not available for download');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/courses')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <FiArrowLeft /> Back to Courses
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Course Content</h1>
          <p className="text-gray-600 mt-2">Access your course materials, meetings, and assignments</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            {[
              { id: 'meetings', label: 'Live Meetings', icon: <FiVideo size={16} /> },
              { id: 'materials', label: 'Study Materials', icon: <FiDownload size={16} /> },
              { id: 'syllabus', label: 'Course Timeline', icon: <FiCalendar size={16} /> },
              { id: 'assignments', label: 'Assignments', icon: <FiFileText size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'meetings' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Live Meetings</h2>
              {courseData.meetings && courseData.meetings.length > 0 ? (
                <div className="space-y-4">
                  {courseData.meetings.map((meeting) => (
                    <div key={meeting.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{meeting.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <FiCalendar />
                              {meeting.date}
                            </div>
                            <div className="flex items-center gap-1">
                              <FiClock />
                              {meeting.time}
                            </div>
                          </div>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs mt-3 ${
                            meeting.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                            meeting.status === 'live' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {meeting.status}
                          </span>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => joinMeeting(meeting.zoomLink)}
                            disabled={meeting.status === 'ended'}
                            className={`px-4 py-2 rounded-md font-medium transition ${
                              meeting.status === 'ended'
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {meeting.status === 'live' ? 'Join Now' : 
                             meeting.status === 'upcoming' ? 'Join Meeting' : 'Ended'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiVideo size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No meetings scheduled yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Study Materials</h2>
              {courseData.materials && courseData.materials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courseData.materials.map((material) => (
                    <div key={material.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {material.type === 'pdf' && <FiFileText className="text-red-600" size={24} />}
                          {material.type === 'video' && <FiVideo className="text-blue-600" size={24} />}
                          {material.type === 'slides' && <FiFileText className="text-green-600" size={24} />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{material.title}</h3>
                          <p className="text-sm text-gray-600 capitalize">{material.type}</p>
                          <p className="text-xs text-gray-500 mt-1">Uploaded: {material.uploadDate}</p>
                        </div>
                        <button
                          onClick={() => downloadMaterial(material.url, material.fileName)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                        >
                          <FiDownload />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiDownload size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No study materials available yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'syllabus' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Course Timeline</h2>
              {courseData.syllabus && courseData.syllabus.length > 0 ? (
                <div className="space-y-4">
                  {courseData.syllabus.sort((a, b) => a.week - b.week).map((topic) => (
                    <div key={topic.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="font-bold text-blue-600">{topic.week}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Week {topic.week}: {topic.title}</h3>
                          {topic.description && (
                            <p className="text-gray-600 mt-1">{topic.description}</p>
                          )}
                          {topic.materials && topic.materials.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700">Materials:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {topic.materials.map((material, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                    {material}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiCalendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Course timeline not available yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Assignments</h2>
              {courseData.assignments && courseData.assignments.length > 0 ? (
                <div className="space-y-4">
                  {courseData.assignments.map((assignment) => (
                    <div key={assignment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{assignment.title}</h3>
                          {assignment.description && (
                            <p className="text-gray-600 mt-1">{assignment.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <FiCalendar />
                              Due: {assignment.dueDate}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiFileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No assignments available yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;