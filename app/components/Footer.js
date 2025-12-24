'use client'
import { useCourses } from './CourseContext'
import { FaPhone, FaMessage } from 'react-icons/fa6'

export default function Footer() {
  const { courses } = useCourses()

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigate = (path) => {
    scrollToTop()
    window.location.href = path
  }

  return (
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
                      navigate(`/enrollment/${course.courseId || course.id}`)
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
                navigate('/about')
              }}
            >
              About Us
            </li>
            <li>Our Guarantee</li>
            <li>Privacy Policy</li>
            <li>Terms of Service</li>
          </ul>
        </div>
        <div>
          <h5 className="font-semibold text-white mb-2">Contact Us</h5>
          <a href="tel:1-329-239-8577" className="text-sm text-gray-300 flex gap-2 items-center mb-1">
            <FaPhone /> 1-329-239-8577
          </a>
          <a href="mailto:info@dsatguru.com" className="text-sm text-gray-300 flex gap-2 items-center">
            <FaMessage /> info@dsatguru.com
          </a>
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
  )
}
