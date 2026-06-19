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
    <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={goToToday}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Today
        </button>
        <div className="flex items-center gap-1">
          <button onClick={goToBack} aria-label="Previous" className="rounded-full p-1 transition-colors hover:bg-slate-100">
            <FiChevronLeft size={20} className="text-slate-600" />
          </button>
          <button onClick={goToNext} aria-label="Next" className="rounded-full p-1 transition-colors hover:bg-slate-100">
            <FiChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
        <span className="text-lg font-bold text-slate-900">
            {moment(date).format('MMMM YYYY')}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {viewLabel[view] || view}
            <FiChevronDown />
          </button>
          {showViewMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
              {['month', 'week', 'day', 'agenda'].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    onView(v)
                    setShowViewMenu(false)
                  }}
                  className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50/40 ${view === v ? 'font-bold text-indigo-600' : 'text-slate-600'}`}
                >
                  {viewLabel[v]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onAddEvent}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
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
    <div className="hidden h-full w-64 flex-col border-r border-slate-100 bg-slate-50 p-4 md:flex">
        <div className="mb-6">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <FiCalendar className="text-indigo-600"/> Calendar
            </h2>
        </div>
      <div className="mb-4 flex items-center justify-between">
        <span className="font-semibold text-slate-600">{currentMonth.format('MMMM YYYY')}</span>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(prev => prev.clone().subtract(1, 'month'))} aria-label="Previous month" className="rounded-lg p-1 transition-colors hover:bg-slate-200">
            <FiChevronLeft size={16} className="text-slate-600" />
          </button>
          <button onClick={() => setCurrentMonth(prev => prev.clone().add(1, 'month'))} aria-label="Next month" className="rounded-lg p-1 transition-colors hover:bg-slate-200">
            <FiChevronRight size={16} className="text-slate-600" />
          </button>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {weekDays.map(d => (
          <div key={d} className="text-xs font-semibold text-slate-500">{d.charAt(0)}</div>
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
                flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors
                ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}
                ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'hover:bg-slate-200'}
                ${isToday && !isSelected ? 'border border-indigo-600 font-bold' : ''}
              `}
            >
              {d.date()}
            </button>
          )
        })}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center gap-2">
            <input type="checkbox" checked readOnly className="rounded text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-600">Calendar</span>
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
    <div className="flex h-[700px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
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
