'use client'
import { useState } from 'react'
import { Calendar, momentLocalizer, Views } from 'react-big-calendar'
import moment from 'moment'
import { FiChevronLeft, FiChevronRight, FiChevronDown, FiPlus, FiCalendar } from 'react-icons/fi'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

const CustomToolbar = ({ date, view, onNavigate, onView, onAddEvent }) => {
  const [showViewMenu, setShowViewMenu] = useState(false)

  const goToBack = () => {
    onNavigate('PREV')
  }

  const goToNext = () => {
    onNavigate('NEXT')
  }

  const goToToday = () => {
    onNavigate('TODAY')
  }

  const label = () => {
    return moment(date).format('MMMM YYYY')
  }

  const viewLabel = {
    month: 'Month',
    week: 'Week',
    work_week: 'Work Week',
    day: 'Day',
    agenda: 'Agenda'
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-4">
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button onClick={goToBack} className="p-1 hover:bg-gray-100 rounded-full">
            <FiChevronLeft size={20} className="text-gray-600" />
          </button>
          <button onClick={goToNext} className="p-1 hover:bg-gray-100 rounded-full">
            <FiChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
        <span className="text-lg font-semibold text-gray-800">
            {moment(date).format('MMMM YYYY')}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {viewLabel[view] || view}
            <FiChevronDown />
          </button>
          {showViewMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border rounded shadow-lg z-50 py-1">
              {['month', 'week', 'day', 'agenda'].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    onView(v)
                    setShowViewMenu(false)
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${view === v ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                >
                  {viewLabel[v]}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 shadow-sm"
        >
          <FiPlus size={16} />
          New
        </button>
      </div>
    </div>
  )
}

const MiniCalendar = ({ date, onNavigate }) => {
  const [currentMonth, setCurrentMonth] = useState(moment(date))

  const startOfMonth = currentMonth.clone().startOf('month')
  const endOfMonth = currentMonth.clone().endOf('month')
  const startDay = startOfMonth.clone().startOf('week')
  const endDay = endOfMonth.clone().endOf('week')

  const days = []
  let day = startDay.clone()

  while (day.isSameOrBefore(endDay, 'day')) {
    days.push(day.clone())
    day.add(1, 'day')
  }

  const weekDays = moment.weekdaysMin()

  return (
    <div className="w-64 p-4 border-r bg-gray-50 flex flex-col h-full hidden md:flex">
        <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FiCalendar className="text-indigo-600"/> Calendar
            </h2>
        </div>
      <div className="mb-4 flex justify-between items-center">
        <span className="font-semibold text-gray-700">{currentMonth.format('MMMM YYYY')}</span>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(prev => prev.clone().subtract(1, 'month'))} className="p-1 hover:bg-gray-200 rounded">
            <FiChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentMonth(prev => prev.clone().add(1, 'month'))} className="p-1 hover:bg-gray-200 rounded">
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-xs font-medium text-gray-500">{d.charAt(0)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          const isCurrentMonth = d.isSame(currentMonth, 'month')
          const isSelected = d.isSame(date, 'day')
          const isToday = d.isSame(moment(), 'day')
          
          return (
            <button
              key={i}
              onClick={() => onNavigate('DATE', d.toDate())}
              className={`
                h-8 w-8 text-sm rounded-full flex items-center justify-center
                ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'hover:bg-gray-200'}
                ${isToday && !isSelected ? 'border border-indigo-600 font-bold' : ''}
              `}
            >
              {d.date()}
            </button>
          )
        })}
      </div>
      
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked readOnly className="text-indigo-600 rounded focus:ring-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Calendar</span>
        </div>
      </div>
    </div>
  )
}

export default function CourseCalendar({ events, onAddEvent, onEventClick }) {
  const [view, setView] = useState(Views.WEEK)
  const [date, setDate] = useState(new Date())

  const handleNavigate = (action, newDate) => {
    let nextDate = date
    if (action === 'PREV') {
        nextDate = moment(date).subtract(1, view === 'agenda' ? 'month' : view).toDate()
    } else if (action === 'NEXT') {
        nextDate = moment(date).add(1, view === 'agenda' ? 'month' : view).toDate()
    } else if (action === 'TODAY') {
        nextDate = new Date()
    } else if (action === 'DATE') {
        nextDate = newDate
    }
    setDate(nextDate)
  }

  const handleViewChange = (newView) => {
    setView(newView)
  }

  return (
    <div className="flex h-[700px] bg-white border rounded-lg overflow-hidden shadow-sm">
      <MiniCalendar date={date} onNavigate={handleNavigate} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <CustomToolbar
          date={date}
          view={view}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onAddEvent={onAddEvent}
        />
        
        <div className="flex-1 overflow-hidden">
          <Calendar
            localizer={localizer}
            events={events}
            defaultView={Views.WEEK}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            startAccessor="start"
            endAccessor="end"
            onSelectSlot={({ start, end }) => onAddEvent({ start, end })}
            onSelectEvent={onEventClick}
            selectable
            toolbar={false} // Hide default toolbar
            className="h-full"
            components={{
                // Ensure event wrapper looks good
            }}
            formats={{
                timeGutterFormat: (date, culture, localizer) => 
                    localizer.format(date, 'h A', culture),
            }}
          />
        </div>
      </div>
    </div>
  )
}
