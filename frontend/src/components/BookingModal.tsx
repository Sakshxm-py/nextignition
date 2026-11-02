import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import api from '../services/api';
import { parseLocalDate, todayLocalISO } from '../utils/formatters';

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getInitials(name?: string) {
  const n = String(name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) || '';
  return `${first}${second}`.toUpperCase();
}

export interface BookingModalProps {
  expert: any;
  onClose: () => void;
}

export function BookingModal({ expert, onClose }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{startTime: string, endTime: string}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const fetchExpertAvailability = async () => {
      if (!selectedDate || !expert?.id) return;
      
      setLoadingSlots(true);
      setBookingError('');
      setAvailableSlots([]); // clear stale slots from the previous date while loading
      try {
        // parseLocalDate avoids the UTC-midnight off-by-one that would compute
        // the wrong weekday (and thus wrong availability) in negative-UTC zones.
        const date = parseLocalDate(selectedDate);
        const dayOfWeek = date.getDay();
        
        // Fetch both weekly availability and specific date slots
        const [weeklyResponse, specificResponse] = await Promise.all([
          api.get(`/availability/expert/${expert.id}`),
          api.get(`/availability/expert/${expert.id}/date/${selectedDate}`).catch(() => ({ data: null }))
        ]);
        
        // Check if there's specific date availability first
        if (specificResponse.data && specificResponse.data.slots && specificResponse.data.slots.length > 0) {
          setAvailableSlots(specificResponse.data.slots);
        } else {
          // Fall back to weekly schedule
          const dayAvailability = weeklyResponse.data.find((a: any) => a.dayOfWeek === dayOfWeek);
          if (dayAvailability) {
            setAvailableSlots(dayAvailability.slots || []);
          } else {
            setAvailableSlots([]);
            setBookingError('Expert has no availability set for this date.');
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch availability', error);
        setBookingError('Could not load availability for this expert.');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchExpertAvailability();
  }, [selectedDate, expert?.id]);

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !topic) {
      setBookingError('Please fill in all required fields');
      return;
    }

    setIsBooking(true);
    setBookingError('');

    try {
      await api.post('/bookings', {
        expert: expert.id,
        date: selectedDate,
        startTime: selectedTime,
        duration,
        topic,
        notes,
      });

      // The google calendar generation has been removed as the request is now pending
      // and goes to the expert to accept first.

      onClose();
      alert('Session booking request sent successfully! You will receive a notification when the expert accepts.');
    } catch (error: any) {
      setBookingError(error.response?.data?.message || 'Failed to request session');
    } finally {
      setIsBooking(false);
    }
  };

  if (!expert) return null;

  // Parse the expert's actual hourly rate (e.g. "₹1500" -> 1500, "Free" -> 0)
  const rateNum = Number(String(expert.hourlyRate || '').replace(/[^0-9.]/g, '')) || 0;
  const sessionTotal = (duration / 60) * rateNum;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-0" 
      />

      {/* Modal Content */}
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full relative z-10 max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Request Session with {expert.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {/* Expert Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full relative overflow-hidden flex items-center justify-center text-white text-xl font-bold">
              {isHttpUrl(expert.avatar) ? (
                <>
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.classList.remove('hidden');
                        e.currentTarget.nextElementSibling.classList.add('flex');
                      }
                    }}
                  />
                  <div className="hidden items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                    {String(expert.avatar || getInitials(expert.name))}
                  </div>
                </>
              ) : (
                <span>{String(expert.avatar || getInitials(expert.name))}</span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">{expert.name}</h3>
              <p className="text-gray-600">{expert.title || expert.role}</p>
              <p className="text-sm text-gray-500">{Capacitor.getPlatform() === 'ios' ? 'Rate shared on request' : `${expert.hourlyRate || 'Rate varies'}${rateNum > 0 ? ' per hour' : ''}`}</p>
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input name="input-79b08d"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
              min={todayLocalISO()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time
            </label>
            <div className="relative">
              <select name="select-eab873"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={loadingSlots || !selectedDate || availableSlots.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingSlots ? 'Loading slots...' : 
                   !selectedDate ? 'Select a date first' :
                   availableSlots.length === 0 ? 'No slots available' : 'Select a time'}
                </option>
                {availableSlots.map((slot, index) => (
                  <option key={`${slot.startTime}-${slot.endTime}-${index}`} value={slot.startTime}>
                    {slot.startTime} - {slot.endTime}
                  </option>
                ))}
              </select>
              {loadingSlots && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select name="select-2c22cd"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Topic *
            </label>
            <input name="input-a12dad"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Product Strategy, Fundraising, Team Building"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea name="textarea-c85094"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell the expert what you'd like to discuss..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Message */}
          {bookingError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {bookingError}
            </div>
          )}

          {/* Booking Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-bold text-sm mb-2">Booking Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{duration} minutes</span>
              </div>
              {expert.hourlyRate && Capacitor.getPlatform() !== 'ios' && (
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span>{expert.hourlyRate}</span>
                </div>
              )}
              {rateNum > 0 && Capacitor.getPlatform() !== 'ios' && (
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>₹{sessionTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBooking}
              disabled={isBooking || !selectedDate || !selectedTime || !topic}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-orange-500 text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBooking ? 'Sending Request...' : 'Request Session'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
