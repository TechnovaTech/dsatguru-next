import { useMemo, useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  FaCheckCircle,
} from "react-icons/fa";
import { useCourses } from "../../../context/CourseContext";
import { createCheckoutSession, getAllEnrolledCourses } from "../../../services/api/courses";

import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const bgColors = [
  "bg-blue-100",
  "bg-teal-100",
  "bg-rose-100",
  "bg-indigo-100",
  "bg-amber-100",
];
const borderColors = [
  "border-blue-300",
  "border-teal-300",
  "border-rose-300",
  "border-indigo-300",
  "border-amber-300",
];
const buttonColors = [
  "bg-blue-500 hover:bg-blue-600",
  "bg-teal-500 hover:bg-teal-600",
  "bg-rose-500 hover:bg-rose-600",
  "bg-indigo-500 hover:bg-indigo-600",
  "bg-amber-500 hover:bg-amber-600",
];
const textColors = [
  "text-blue-700",
  "text-teal-700",
  "text-rose-700",
  "text-indigo-700",
  "text-amber-700",
];

// const fadeInUp = {
//   hidden: { opacity: 0, y: 30 },
//   visible: (i = 1) => ({
//     opacity: 1,
//     y: 0,
//     transition: {
//       delay: i * 0.2,
//       duration: 1,
//       ease: "easeOut",
//     },
//   }),
// };

const ProgramCard = ({ data, index, headerHeight, isEnrolled = false }) => {
  console.log('Course card data:', data);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [loading, setLoading] = useState(false);

  const bgColor = bgColors[index % bgColors.length];
  const borderColor = borderColors[index % borderColors.length];
  const buttonColor = buttonColors[index % buttonColors.length];
  const textColor = textColors[index % textColors.length];

  const discountPercentage = useMemo(() => {
    console.log('Discount calculation:', {
      discountPercentage: data.discountPercentage,
      originalPrice: data.originalPrice,
      discountedPrice: data.discountedPrice
    });
    
    // If we have explicit discount percentage, use it
    if (data.discountPercentage && Number(data.discountPercentage) > 0) {
      return Math.round(Number(data.discountPercentage));
    }
    // Otherwise calculate from prices if both exist and different
    else if (data.originalPrice && data.discountedPrice && 
             Number(data.originalPrice) !== Number(data.discountedPrice) && 
             Number(data.discountedPrice) < Number(data.originalPrice)) {
      const discount =
        ((Number(data.originalPrice) - Number(data.discountedPrice)) /
          Number(data.originalPrice)) *
        100;
      return Math.round(discount);
    }
    return null;
  }, [data.discountPercentage, data.originalPrice, data.discountedPrice]);

  const IconComponent = data.icon;

  const handleEnroll = async (scheduleId) => {
    try {
      setLoading(true);
      const response = await createCheckoutSession(data.courseId, scheduleId, '/dashboard/courses');
      if (response?.sessionUrl) {
        window.location.href = response.sessionUrl;
      }
    } catch (error) {
      toast.error(error || "Something went wrong while starting checkout.");
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();
  console.log('Navigate function:', navigate);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full h-full"
      >
        <div
          className={`h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-500 border-2 ${borderColor} rounded-2xl overflow-hidden bg-white`}
        >
          {/* Header */}
          <div
            style={{ minHeight: headerHeight }}
            className={`flex flex-col items-center justify-start ${bgColor} bg-opacity-50 p-6`}
          >
            <div className={`w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-md`}>
              <IconComponent size={36} className={textColor} />
            </div>
            <h4 className="text-lg font-bold text-gray-800 uppercase mt-4 text-center">{data.title}</h4>
            <p className="text-sm font-semibold text-gray-500 text-center">{data.subtitle}</p>
            {data.batch && (
              <div className="mt-2">
                <span className="inline-block text-sm bg-white text-gray-700 font-medium py-1 px-5 rounded-full whitespace-pre-line shadow-md text-center">
                  {Array.isArray(data.batch) ? data.batch.join("\n") : data.batch}
                </span>
              </div>
            )}
          </div>



          {/* Features */}
          <div className="flex-1 p-6">
            <ul className="space-y-2 text-sm text-gray-700 text-left">
              {data.included?.map((f, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <FaCheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6">
            {isEnrolled ? (
              <button
                onClick={() => navigate(`/dashboard/courses/${data.courseId || data.id}`)}
                className={`w-full py-3 rounded-md font-semibold text-sm text-white transition ${buttonColor} hover:opacity-70 cursor-pointer`}
              >
                Access Course
              </button>
            ) : (
              <button
                onClick={() => handleEnroll(null)}
                disabled={loading}
                className={`w-full py-3 rounded-md font-semibold text-sm text-white transition ${buttonColor} hover:opacity-70 cursor-pointer disabled:opacity-50`}
              >
                {loading ? 'Starting Checkout...' : 'Enroll'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};


const ProgramSection = () => {
  const { courses, refreshCourses } = useCourses();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('enrolled');


  useEffect(() => {
    if (!courses.length) {
      refreshCourses();
    }
    const fetchEnrolledCourses = async () => {
      try {
        setLoading(true);
        const enrolledData = await getAllEnrolledCourses();
        
        // Filter courses to only include enrolled ones
        if (enrolledData && enrolledData.length > 0) {
          console.log('Enrolled data:', enrolledData);
          
          const enrolledIds = enrolledData.map(enrollment => enrollment.courseId);
          const filteredItems = courses.filter(course => 
            enrolledIds.includes(course.id) || enrolledIds.includes(course.courseId)
          );
          
          console.log('Filtered items:', filteredItems);
          
          // Only courses
          const onlyCourses = filteredItems.filter(item => {
            console.log('Item type check:', item.title, item.type);
            return item.type === 'course' || (!item.type || item.type === undefined);
          });
          const allCourseItems = courses.filter(item => (item.type === 'course' || (!item.type || item.type === undefined)) && (item.id || item.courseId));
          const available = allCourseItems.filter(item => {
            const id = item.id || item.courseId;
            return !enrolledIds.includes(id);
          });
          
          console.log('Only courses:', onlyCourses);
          console.log('Available courses:', available);
          
          setEnrolledCourses(onlyCourses);
          setAvailableCourses(available);
        } else {
          setEnrolledCourses([]);
          setAvailableCourses([]);
        }
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
        toast.error("Failed to load your enrolled courses");
        setEnrolledCourses([]);
        setAvailableCourses([]);
      } finally {
        setLoading(false);
      }
    };

    if (courses.length > 0) {
      fetchEnrolledCourses();
    }

  }, [courses, refreshCourses]);

  const maxBatchLength = useMemo(() => {
    let max = 1;
    enrolledCourses.forEach((item) => {
      const batchArray = Array.isArray(item.batch)
        ? item.batch
        : [item.batch];
      if (batchArray.length > max) max = batchArray.length;
    });
    return max;
  }, [enrolledCourses]);

  const headerHeight = `${220 + maxBatchLength * 20}px`;

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <section className="w-full bg-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 justify-center">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enrolled' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Courses ({enrolledCourses.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'available' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Available Courses ({availableCourses.length})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'enrolled' ? (
        enrolledCourses.length > 0 ? (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Your Enrolled Courses</h2>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
            >
              {enrolledCourses.map((course, i) => (
                <ProgramCard
                  key={i}
                  data={course}
                  index={i}
                  headerHeight={headerHeight}
                  isEnrolled={true}
                />
              ))}
            </motion.div>
          </>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">You haven't enrolled in any courses yet</h2>
            <p className="text-gray-600 mb-6">Explore available courses and enroll.</p>
          </div>
        )
      ) : (
        availableCourses.length > 0 ? (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Available Courses</h2>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
            >
              {availableCourses.map((course, i) => (
                <ProgramCard
                  key={i}
                  data={course}
                  index={i}
                  headerHeight={headerHeight}
                  isEnrolled={false}
                />
              ))}
            </motion.div>
          </>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No available courses</h2>
            <p className="text-gray-600 mb-6">Please check back later.</p>
          </div>
        )
      )}

    </section>
  );
};

export default ProgramSection;
