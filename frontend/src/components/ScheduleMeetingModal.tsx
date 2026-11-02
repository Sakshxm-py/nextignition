import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Video,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { brandColors } from '../utils/colors';

interface Client {
  id: number;
  name: string;
  startup: string;
  industry: string;
  stage: string;
  matchScore: number;
  status: 'active' | 'pending' | 'completed';
  sessionsCompleted: number;
  nextSession?: string;
  avatar: string;
}

interface ScheduleMeetingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  client: Client;
}

export function ScheduleMeetingModal({ isOpen = true, onClose, client }: ScheduleMeetingModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [meetingType, setMeetingType] = useState<'video' | 'chat'>('video');
  const [duration, setDuration] = useState<'30' | '60' | '90'>('60');
  const [notes, setNotes] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate calendar days for current month
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const availableTimes = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleSchedule = () => {
    // Parse the selected date and time for Google Calendar
    try {
      const [timeVal, modifier] = selectedTime.split(' ');
      let [hours, minutes] = timeVal.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      const [year, month, day] = selectedDate.split('-').map(Number);

      // We'll treat the times as local timezone relative to the user creating the event
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

      const formatGoogleDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      };

      const startDateStr = formatGoogleDate(startDateTime);
      const endDateStr = formatGoogleDate(endDateTime);

      const title = encodeURIComponent(`Meeting: ${client.name} & Expert`);
      const meetupTypeString = meetingType === 'video' ? 'Video Call / Google Meet (Generated via Calendar)' : 'Chat Session';
      const details = encodeURIComponent(`Type: ${meetupTypeString}\n\nNotes: ${notes || `Mentorship session between Expert and ${client.name} (${client.startup}).`}`);

      // Simulate founder's email address based on name and startup
      const guestEmail = encodeURIComponent(`${client.name.toLowerCase().replace(/\s+/g, '.')}@${client.startup.toLowerCase().replace(/\s+/g, '')}.com`);

      const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&add=${guestEmail}`;

      window.open(googleCalendarUrl, '_blank');
    } catch (error) {
      console.error('Error generating Google Calendar link:', error);
    }

    onClose();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
                    Schedule Meeting
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    with {client.name} from {client.startup}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Meeting Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Meeting Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMeetingType('video')}
                      className={`p-4 rounded-xl border-2 transition-all ${meetingType === 'video'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <Video className={`w-6 h-6 mx-auto mb-2 ${meetingType === 'video' ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      <div className="text-sm font-medium">Video Call</div>
                    </button>
                    <button
                      onClick={() => setMeetingType('chat')}
                      className={`p-4 rounded-xl border-2 transition-all ${meetingType === 'chat'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <MessageCircle className={`w-6 h-6 mx-auto mb-2 ${meetingType === 'chat' ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      <div className="text-sm font-medium">Chat Session</div>
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Duration
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['30', '60', '90'] as const).map((min) => (
                      <button
                        key={min}
                        onClick={() => setDuration(min)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all font-medium ${duration === min
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        {min} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Select Date
                  </label>
                  <div className="border border-gray-200 rounded-xl p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="font-bold text-gray-900">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </h3>
                      <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-2">
                      {getDaysInMonth().map((day, index) => {
                        if (day === null) {
                          return <div key={`empty-${index}`} />;
                        }
                        const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isSelected = selectedDate === dateString;
                        const today = new Date();
                        const isPast = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                        return (
                          <button
                            key={day}
                            onClick={() => !isPast && setSelectedDate(dateString)}
                            disabled={isPast}
                            className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${isSelected
                                ? 'bg-blue-600 text-white'
                                : isPast
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      Select Time
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimes.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${selectedTime === time
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Meeting Notes (Optional)
                  </label>
                  <textarea name="textarea-503c70"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add agenda, topics to discuss, or any special notes..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={!selectedDate || !selectedTime}
                    className="flex-1 px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: selectedDate && selectedTime
                        ? `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                        : '#9ca3af'
                    }}
                  >
                    <Check className="w-5 h-5" />
                    Confirm Meeting
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}