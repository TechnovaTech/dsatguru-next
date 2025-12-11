import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMenu,
  FiX,
  FiHome,
  FiPhone,
  FiInfo,
  FiArrowUp,
  FiBookOpen,
} from "react-icons/fi";
import { useCourses } from "../context/CourseContext";
import { useAuth } from "../context/AuthContext";
import { FaPhone } from "react-icons/fa";
import { FaMessage } from "react-icons/fa6";

const navLinks = [
  { name: "Home", path: "/", icon: <FiHome /> },
  { name: "About Us", path: "/about", icon: <FiInfo /> },
  { name: "Contact Us", path: "/contact", icon: <FiPhone /> },
];

const colors = [
  { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700" },
  { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
  { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700" },
];

const PublicLayout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [dropdownHover, setDropdownHover] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { user } = useAuth();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      setShowScrollTop(y > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="font-[Poppins]">
      <nav
        className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
          scrolled ? "shadow-md" : "shadow-none"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            to="/"
            onClick={scrollToTop}
            className="text-3xl font-extrabold text-blue-700 tracking-wide"
          >
            DSATGURU
          </Link>

          <div className="hidden md:flex items-center space-x-10">
            <div className="flex space-x-8 items-center">
              <Link
                to="/"
                className={`flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 ${
                  location.pathname === "/"
                    ? "text-blue-600 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <FiHome /> Home
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setDropdownHover(true)}
                onMouseLeave={() => setDropdownHover(false)}
              >
                <button
                  className={`flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 ${
                    location.pathname.startsWith("/course") ||
                    location.pathname.includes("courses")
                      ? "text-blue-600 font-semibold"
                      : "text-gray-700"
                  }`}
                >
                  <FiBookOpen /> Courses
                </button>
                <AnimatePresence>
                  {dropdownHover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-80 p-2 grid gap-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50"
                    >
                      {courses.map((course, idx) => {
                        const color = colors[idx % colors.length];
                        return (
                          idx != colors.length - 1 && course.slug && course.slug !== "individual-tutoring" && (
                            <Link
                              key={course.id}
                              to={`/enrollment/${course.courseId || course.id}`}
                              className={`flex items-center gap-3 p-4 ${color.bg} ${color.border} border rounded-lg ${color.text} hover:shadow-md transition-all truncate`}
                            >
                              <FiBookOpen size={20} />
                              <span
                                className="text-sm font-semibold truncate w-full"
                                title={course.title}
                              >
                                {course.title}
                              </span>
                            </Link>
                          )
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                to="/about"
                className={`flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 ${
                  location.pathname === "/about"
                    ? "text-blue-600 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <FiInfo /> About Us
              </Link>

              <Link
                to="/contact"
                className={`flex items-center gap-1 text-sm hover:text-blue-600 transition-colors duration-300 ${
                  location.pathname === "/contact"
                    ? "text-blue-600 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <FiPhone /> Contact Us
              </Link>
            </div>

            {localStorage.getItem("authToken") ? (
              <Link
                to={user?.role === 'Admin' ? "/admin-dashboard" : "/dashboard"}
                className="text-sm bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/login"
                  className="text-sm bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="text-sm border border-blue-600 text-blue-600 px-5 py-2 rounded-md font-medium hover:bg-blue-50 transition cursor-pointer"
                >
                  Signup
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden">
            <button onClick={toggleMenu}>
              {isOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-40"
                onClick={closeMenu}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 right-0 h-full w-3/4 bg-white shadow-lg z-50 flex flex-col justify-between px-8 py-12"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-700">Menu</h2>
                    <button onClick={toggleMenu}>
                      <FiX size={28} className="text-gray-700" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {navLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={closeMenu}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 font-medium border-b pb-2"
                      >
                        {link.icon} {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {localStorage.getItem("authToken") ? (
                    <Link
                      to={user?.role === 'Admin' ? "/admin-dashboard" : "/dashboard"}
                      onClick={closeMenu}
                      className="w-full text-center bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="w-full text-center bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer"
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        onClick={closeMenu}
                        className="w-full text-center border border-blue-600 text-blue-600 py-2 rounded-md font-medium hover:bg-blue-50 transition cursor-pointer"
                      >
                        Signup
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      <main>
        <Outlet />
      </main>
      <footer className="bg-blue-950 text-gray-200 px-6 sm:px-10 lg:px-16 pt-14 pb-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10">
          <div>
            <h4 className="text-2xl font-bold text-white mb-3">DSATGURU</h4>
            <p className="text-sm text-gray-300">
              Empowering students with cutting-edge test preparation tools and
              strategies for academic success.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2">Courses</h5>
            <ul className="space-y-1 text-sm text-gray-300">
              {courses.map(
                (course, i) =>
                  courses.length - 1 !== i && (
                    <li
                      key={i}
                      className="cursor-pointer"
                      onClick={() => {
                        scrollToTop();
                        navigate(`/enrollment/${course.courseId || course.id}`);
                      }}
                    >
                      {course.title}
                    </li>
                  )
              )}
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2">Quick Links</h5>
            <ul className="space-y-1 text-sm text-gray-300">
              <li
                className="cursor-pointer"
                onClick={() => {
                  scrollToTop();
                  navigate(`/about`);
                }}
              >
                About Us
              </li>
              <li>Our Guarantee</li>
              {/* <li>Individual Tutoring</li> */}
              {/* <li>College Advice</li> */}
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2">Contact Us</h5>
            <a href="tel:1-919-578-7724" className="text-sm text-gray-300 flex gap-2 items-center mb-1"><FaPhone /> 1-919-578-7724</a>
            <a href="mailto:info@dsatguru.com" className="text-sm text-gray-300 flex gap-2 items-center"><FaMessage /> info@dsatguru.com</a>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-700 opacity-30 my-8"></div>

        {/* Footer Bottom */}
        <div className="max-w-7xl mx-auto text-xs text-center text-gray-400 space-y-2">
          <p>© 2025 DSATGURU. All rights reserved.</p>
          <p className="space-x-2">
            <span>Terms of Service</span>
            <span>•</span>
            <span>Refund Policy</span>
            <span>•</span>
            <span>Site Map</span>
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg z-50"
            aria-label="Scroll to top"
          >
            <FiArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicLayout;
