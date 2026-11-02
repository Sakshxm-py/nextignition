import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Plus,
  X,
  Check,
  Users,
  Video,
  MapPin,
  AlertCircle,
  Save,
  Trash2,
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { formatLocalDate, parseLocalDate, todayLocalISO } from '../utils/formatters';
import { getCurrentUser } from '../services/authService';
import { safeExternalHref } from '../utils/safeUrl';
import api from '../services/api';

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

interface AvailabilityDay {
  dayOfWeek: number;
  slots: AvailabilitySlot[];
}

interface SpecificDateSlot {
  _id?: string;
  date: string;
  slots: AvailabilitySlot[];
}

interface Booking {
  _id: string;
  founder: {
    name: string;
    avatar?: string;
  };
  date: string;
  startTime: string;
  duration: number;
  topic: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  meetingLink?: string;
}

export function SchedulePage() {
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [specificDateSlots, setSpecificDateSlots] = useState<SpecificDateSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingRequests, setBookingRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [newSlot, setNewSlot] = useState({ startTime: '09:00', endTime: '10:00' });
  const [saving, setSaving] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Specific date availability
  const [selectedSpecificDate, setSelectedSpecificDate] = useState('');
  const [specificDateNewSlot, setSpecificDateNewSlot] = useState({ startTime: '09:00', endTime: '10:00' });
  const [savingSpecificDate, setSavingSpecificDate] = useState(false);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchAvailability();
    fetchSpecificDateSlots();
    fetchBookings();
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await api.get('/availability/my-availability');
      setAvailability(response.data);
    } catch (error) {
      console.error('Failed to fetch availability', error);
      setAvailability([]);
    }
  };

  const fetchSpecificDateSlots = async () => {
    try {
      const response = await api.get('/availability/specific-dates');
      setSpecificDateSlots(response.data || []);
    } catch (error) {
      console.error('Failed to fetch specific date slots', error);
      setSpecificDateSlots([]);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bookings');
      const expertBookings = response.data.filter((booking: any) => booking.status === 'confirmed');
      const requests = response.data.filter((booking: any) => booking.status === 'pending');
      setBookings(expertBookings);
      setBookingRequests(requests);
    } catch (error) {
      console.error('Failed to fetch bookings', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = async () => {
    // Check for duplicate slot
    const currentDay = availability.find(d => d.dayOfWeek === selectedDay);
    const existingSlots = currentDay?.slots || [];
    const isDuplicate = existingSlots.some(
      slot => slot.startTime === newSlot.startTime && slot.endTime === newSlot.endTime
    );
    if (isDuplicate) {
      alert(`A slot from ${newSlot.startTime} to ${newSlot.endTime} already exists for ${dayNames[selectedDay]}.`);
      return;
    }

    // Validate end time is after start time
    if (newSlot.endTime <= newSlot.startTime) {
      alert('End time must be after start time.');
      return;
    }

    setSaving(true);
    try {
      const updatedSlots = [...existingSlots, newSlot];

      await api.post('/availability/availability', {
        dayOfWeek: selectedDay,
        slots: updatedSlots,
      });

      await fetchAvailability();
      setNewSlot({ startTime: '09:00', endTime: '10:00' });
    } catch (error) {
      console.error('Failed to add time slot', error);
    } finally {
      setSaving(false);
    }
  };

  const removeTimeSlot = async (slotIndex: number) => {
    try {
      const currentDay = availability.find(d => d.dayOfWeek === selectedDay);
      if (!currentDay) return;

      const updatedSlots = currentDay.slots.filter((_, index) => index !== slotIndex);

      if (updatedSlots.length === 0) {
        // Delete the entire day
        await api.delete(`/availability/availability/${selectedDay}`);
      } else {
        await api.post('/availability/availability', {
          dayOfWeek: selectedDay,
          slots: updatedSlots,
        });
      }

      await fetchAvailability();
    } catch (error) {
      console.error('Failed to remove time slot', error);
    }
  };

  const getCurrentDaySlots = () => {
    return availability.find(d => d.dayOfWeek === selectedDay)?.slots || [];
  };

  const addSpecificDateSlot = async () => {
    if (!selectedSpecificDate) {
      alert('Please select a date first');
      return;
    }

    // Validate end time is after start time
    if (specificDateNewSlot.endTime <= specificDateNewSlot.startTime) {
      alert('End time must be after start time.');
      return;
    }

    // Check for duplicate
    const existingEntry = specificDateSlots.find(s => s.date === selectedSpecificDate);
    const existingSlots = existingEntry?.slots || [];
    const isDuplicate = existingSlots.some(
      slot => slot.startTime === specificDateNewSlot.startTime && slot.endTime === specificDateNewSlot.endTime
    );
    if (isDuplicate) {
      alert(`A slot from ${specificDateNewSlot.startTime} to ${specificDateNewSlot.endTime} already exists for this date.`);
      return;
    }

    setSavingSpecificDate(true);
    try {
      const updatedSlots = [...existingSlots, specificDateNewSlot];
      
      await api.post('/availability/specific-date', {
        date: selectedSpecificDate,
        slots: updatedSlots,
      });

      await fetchSpecificDateSlots();
      setSpecificDateNewSlot({ startTime: '09:00', endTime: '10:00' });
    } catch (error) {
      console.error('Failed to add specific date slot', error);
    } finally {
      setSavingSpecificDate(false);
    }
  };

  const removeSpecificDateSlot = async (date: string, slotIndex: number) => {
    try {
      const entry = specificDateSlots.find(s => s.date === date);
      if (!entry) return;

      const updatedSlots = entry.slots.filter((_, index) => index !== slotIndex);
      
      if (updatedSlots.length === 0) {
        await api.delete(`/availability/specific-date/${date}`);
      } else {
        await api.post('/availability/specific-date', {
          date,
          slots: updatedSlots,
        });
      }

      await fetchSpecificDateSlots();
    } catch (error) {
      console.error('Failed to remove specific date slot', error);
    }
  };

  const deleteSpecificDate = async (date: string) => {
    try {
      await api.delete(`/availability/specific-date/${date}`);
      await fetchSpecificDateSlots();
    } catch (error) {
      console.error('Failed to delete specific date', error);
    }
  };

  const handleUpdateRequest = async (id: string, newStatus: 'confirmed' | 'cancelled') => {
    try {
      await api.put(`/bookings/${id}/status`, { status: newStatus });
      // If confirmed, maybe generate google calendar here or let them handle it. For now just update state.
      if (newStatus === 'confirmed') {
        const approvedReq = bookingRequests.find(b => b._id === id);
        if (approvedReq) {
          try {
            const [year, month, day] = approvedReq.date.split('T')[0].split('-').map(Number);
            const [hours, minutes] = approvedReq.startTime.split(':').map(Number);
            
            const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
            const endDateTime = new Date(startDateTime.getTime() + approvedReq.duration * 60000);

            const formatGoogleDate = (date: Date) => {
              return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
            };

            const startDateStr = formatGoogleDate(startDateTime);
            const endDateStr = formatGoogleDate(endDateTime);

            const title = encodeURIComponent(`Session: ${approvedReq.topic} with ${approvedReq.founder.name}`);
            const detailsText = `Type: Video Call / Google Meet\n\nFounder: ${approvedReq.founder.name}\nTopic: ${approvedReq.topic}`;
            const details = encodeURIComponent(detailsText);

            const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}`;
            window.open(googleCalendarUrl, '_blank');
          } catch (calError) {
            console.error('Failed to auto-generate calendar link', calError);
          }
        }
      }
      await fetchBookings();
    } catch (error) {
      console.error('Failed to update booking status', error);
      alert('Could not update the booking status.');
    }
  };

  // Keep any session from today onward. booking.date is date-only, so compare
  // against the start of today in local time (not the current instant, which
  // would drop sessions scheduled later today).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingBookings = bookings
    .filter(booking => parseLocalDate(booking.date) >= startOfToday)
    .sort((a, b) => {
      const byDate = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
      return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5);

  // The expert's own hourly rate from their profile (fallback to "Not set").
  const myHourlyRate = getCurrentUser()?.profile?.hourlyRate;

  // Sum actual available hours from weekly slots (end - start), not slot count.
  const totalAvailableHours = availability.reduce((total, day) =>
    total + day.slots.reduce((sum, slot) => {
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      return sum + (mins > 0 ? mins / 60 : 0);
    }, 0), 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
          <p className="text-gray-600 mt-1">Set your availability and manage upcoming sessions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Availability Settings */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Set Your Availability
            </h2>

            {/* Day Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {dayNames.map((day, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedDay === index
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Current Day Availability */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-3">
                {dayNames[selectedDay]} Availability
              </h3>

              <div className="space-y-3">
                {getCurrentDaySlots().map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    <button
                      onClick={() => removeTimeSlot(index)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}

                {getCurrentDaySlots().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No availability set for {dayNames[selectedDay]}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Slot */}
            <div className="border-t pt-6">
              <h4 className="font-bold mb-4">Add Time Slot</h4>
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                  <input name="input-e15497"
                    type="time"
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm text-gray-600 mb-1">End Time</label>
                  <input name="input-48a806"
                    type="time"
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addTimeSlot}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  {saving ? 'Adding...' : 'Add Slot'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Specific Date Availability */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Specific Date Availability
            </h2>
            
            <p className="text-sm text-gray-600 mb-4">
              Set specific dates when you're available (overrides weekly schedule)
            </p>

            {/* Date Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input name="input-178d5a"
                type="date"
                value={selectedSpecificDate}
                onChange={(e) => setSelectedSpecificDate(e.target.value)}
                min={todayLocalISO()}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Slots for selected date */}
            {selectedSpecificDate && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">
                  Slots for {formatLocalDate(selectedSpecificDate)}
                </h3>
                
                <div className="space-y-3 mb-4">
                  {specificDateSlots
                    .find(s => s.date === selectedSpecificDate)?.slots
                    .map((slot, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="font-medium">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSpecificDateSlot(selectedSpecificDate, index)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  
                  {(!specificDateSlots.find(s => s.date === selectedSpecificDate)?.slots.length) && (
                    <div className="text-center py-4 text-gray-500">
                      <p>No slots set for this date</p>
                      <p className="text-xs">Add slots below or this date will use weekly schedule</p>
                    </div>
                  )}
                </div>

                {/* Add slot for specific date */}
                <div className="border-t pt-4">
                  <h4 className="font-bold mb-3 text-sm">Add Time Slot for This Date</h4>
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-600 mb-1">Start</label>
                      <input name="input-16c75c"
                        type="time"
                        value={specificDateNewSlot.startTime}
                        onChange={(e) => setSpecificDateNewSlot(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-600 mb-1">End</label>
                      <input name="input-ba1f6b"
                        type="time"
                        value={specificDateNewSlot.endTime}
                        onChange={(e) => setSpecificDateNewSlot(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button
                      onClick={addSpecificDateSlot}
                      disabled={savingSpecificDate}
                      className="w-full sm:w-auto px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      {savingSpecificDate ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of all specific dates */}
            {specificDateSlots.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-bold mb-3 text-sm">All Specific Date Slots</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {specificDateSlots.map((entry) => (
                    <div key={entry.date} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">
                          {formatLocalDate(entry.date)}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {entry.slots.length} slot{entry.slots.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteSpecificDate(entry.date)}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                        title="Delete all slots for this date"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Sessions & Requests */}
        <div className="space-y-6">
          {/* Booking Requests Inbox */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Booking Requests
              </h2>
              {bookingRequests.length > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">
                  {bookingRequests.length} New
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            ) : bookingRequests.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {bookingRequests.map((req) => (
                  <div key={req._id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {req.founder?.avatar ? <img src={req.founder.avatar} alt={req.founder?.name || 'Founder'} className="w-full h-full rounded-full object-cover"/> : (req.founder?.name?.charAt(0) || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{req.founder?.name || 'Unknown founder'}</h4>
                        <p className="text-xs text-gray-600 mb-2">{req.topic}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatLocalDate(req.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {req.startTime} ({req.duration}m)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={() => handleUpdateRequest(req._id, 'confirmed')}
                        className="flex-1 px-3 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleUpdateRequest(req._id, 'cancelled')}
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Upcoming Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Video className="w-5 h-5 text-green-600" />
              Upcoming Sessions
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming sessions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                        {booking.founder?.avatar ? (
                          <img
                            src={booking.founder.avatar}
                            alt={booking.founder?.name || 'Founder'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          booking.founder?.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{booking.founder?.name || 'Unknown founder'}</h4>
                        <p className="text-xs text-gray-600 mb-2">{booking.topic}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatLocalDate(booking.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.startTime} ({booking.duration}min)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {booking.meetingLink ? (
                        <a
                          href={safeExternalHref(booking.meetingLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <Video className="w-3 h-3" />
                          Join Call
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="No meeting link added yet"
                          className="flex-1 px-3 py-2 bg-gray-200 text-gray-400 text-xs rounded-lg flex items-center justify-center gap-1 cursor-not-allowed"
                        >
                          <Video className="w-3 h-3" />
                          No Link Yet
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="px-3 py-2 border border-gray-300 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h3 className="font-bold mb-4">This Week</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Sessions</span>
                <span className="font-bold">{bookings.filter(b => b.status === 'confirmed').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available Hours</span>
                <span className="font-bold">{Math.round(totalAvailableHours * 10) / 10} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Your Hourly Rate</span>
                <span className="font-bold">{myHourlyRate ? `₹${Number(myHourlyRate).toLocaleString()}/hr` : 'Not set'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate">Session Details</h3>
                <p className="text-sm text-gray-600 truncate">{selectedBooking.founder?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-gray-500">Topic</div>
                <div className="font-medium">{selectedBooking.topic || '—'}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Date</div>
                  <div className="font-medium">{formatLocalDate(selectedBooking.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Time</div>
                  <div className="font-medium">{selectedBooking.startTime} ({selectedBooking.duration} min)</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="font-medium capitalize">{selectedBooking.status}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Meeting Link</div>
                {selectedBooking.meetingLink ? (
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={selectedBooking.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-sm text-blue-600 hover:underline truncate"
                      title={selectedBooking.meetingLink}
                    >
                      {selectedBooking.meetingLink}
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(selectedBooking.meetingLink || '');
                        } catch {
                          // ignore
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-1">No meeting link added yet.</div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {selectedBooking.meetingLink && (
                <a
                  href={selectedBooking.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg font-bold text-white"
                  style={{ background: brandColors.electricBlue }}
                >
                  Open Link
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}