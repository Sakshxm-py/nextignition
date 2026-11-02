import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Type,
  AlignLeft,
  Users,
  DollarSign,
  Video,
  Upload,
  RefreshCw
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { formatWithCommas, parseNumericValue } from '../utils/formatters';
import { toast } from 'sonner';
import api from '../services/api';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: string;
}

export function CreateEventModal({ isOpen, onClose, userType = 'expert' }: CreateEventModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    type: 'webinar',
    date: '',
    time: '',
    duration: '60',
    description: '',
    isFree: true,
    price: '',
    capacity: '',
    coverImage: null as File | null,
    presentationFile: null as File | null
  });
  const [isUploading, setIsUploading] = useState(false);

  const eventTypes = [
    { value: 'webinar', label: 'Live Event', icon: Video },
    { value: 'workshop', label: 'Workshop', icon: Users },
    { value: 'networking', label: 'Networking', icon: Users },
    { value: 'masterclass', label: 'Masterclass', icon: Calendar },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.title.trim() || !formData.description.trim()) {
        toast.error('Please add an event title and description');
        return;
      }
      if (!formData.date || !formData.time) {
        toast.error('Please select date and time');
        return;
      }
      if (!formData.presentationFile) {
        toast.error('Please upload an event presentation (PPT/PDF). It is compulsory.');
        return;
      }

      setIsUploading(true);
      
      // 1. Upload Presentation
      let presentationUrl = '';
      const pptFormData = new FormData();
      pptFormData.append('presentation', formData.presentationFile);
      
      try {
        const uploadRes = await api.post('/events/upload-presentation', pptFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        presentationUrl = uploadRes.data.presentationUrl;
      } catch (err) {
        toast.error('Failed to upload presentation. Please try again.');
        setIsUploading(false);
        return;
      }

      const startAt = new Date(`${formData.date}T${formData.time}:00`);

      const durationMinutes = Number.parseInt(String(formData.duration || '60'), 10) || 60;
      const maxAttendees = formData.capacity ? Number(parseNumericValue(formData.capacity) || 0) : undefined;

      const priceType = formData.isFree ? 'free' : 'paid';
      const priceAmount = formData.isFree ? undefined : Number(parseNumericValue(formData.price) || 0);

      const hostType = userType === 'investor' ? 'investor' : userType === 'founder' ? 'founder' : 'expert';

      const payload: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        status: 'upcoming',
        startAt,
        durationMinutes,
        format: 'virtual',
        meetingLink: '',
        priceType,
        priceAmount,
        currency: 'INR',
        maxAttendees: maxAttendees && maxAttendees > 0 ? maxAttendees : undefined,
        hostType,
        presentationUrl,
      };

      await api.post('/events', payload);

      toast.success('Event created successfully!');
      onClose();
      setStep(1);
      setFormData({
        title: '',
        type: 'webinar',
        date: '',
        time: '',
        duration: '60',
        description: '',
        isFree: true,
        price: '',
        capacity: '',
        coverImage: null as File | null,
        presentationFile: null as File | null,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
                <p className="text-sm text-gray-500">Host a session for the community</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Type Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {eventTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.type === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                        }`}
                    >
                      <type.icon className={`w-6 h-6 ${formData.type === type.value ? 'text-blue-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Event Title</label>
                  <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input name="input-ba70ab"
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Mastering Seed Funding"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input name="input-c775c2"
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input name="input-4a3ff3"
                        type="time"
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min)</label>
                    <select name="select-8a9fe9"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea name="textarea-b774a2"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What will attendees learn?"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Price and Capacity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Price</label>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="input-388fd5"
                          type="radio"
                          checked={formData.isFree}
                          onChange={() => setFormData({ ...formData, isFree: true })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Free</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input name="input-661625"
                          type="radio"
                          checked={!formData.isFree}
                          onChange={() => setFormData({ ...formData, isFree: false })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Paid</span>
                      </label>
                    </div>
                    {!formData.isFree && (
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input name="input-ea8caa"
                          type="text"
                          placeholder="0.00"
                          value={formatWithCommas(formData.price)}
                          onChange={(e) => {
                            const val = parseNumericValue(e.target.value);
                            if (val === '' || /^\d+$/.test(val)) setFormData({ ...formData, price: val });
                          }}
                          className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacity (Optional)</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input name="input-62ab82"
                        type="text"
                        placeholder="Unlimited"
                        value={formatWithCommas(formData.capacity)}
                        onChange={(e) => {
                          const val = parseNumericValue(e.target.value);
                          if (val === '' || /^\d+$/.test(val)) setFormData({ ...formData, capacity: val });
                        }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* PPT Upload (Compulsory) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Event Presentation (PPT/PDF) <span className="text-red-500">*Compulsory</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                      formData.presentationFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                    onClick={() => document.getElementById('ppt-upload')?.click()}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      formData.presentationFile ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'
                    }`}>
                      <Upload className="w-5 h-5" />
                    </div>
                    {formData.presentationFile ? (
                      <div>
                        <p className="text-sm font-bold text-green-700">{formData.presentationFile.name}</p>
                        <p className="text-xs text-green-600 mt-1">Click to change file</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-900">Upload Event Presentation</p>
                        <p className="text-xs text-gray-500 mt-1">PPTX or PDF only (max. 20MB)</p>
                      </>
                    )}
                    <input name="input-7264a7"
                      id="ppt-upload"
                      type="file"
                      className="hidden"
                      accept=".pptx,.ppt,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormData({ ...formData, presentationFile: file });
                      }}
                    />
                  </div>
                </div>

                {/* Cover Image Upload Placeholder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cover Image (Optional)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 text-blue-500">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Click to upload cover image</p>
                    <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                style={{
                  background: isUploading ? '#94a3b8' : `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`
                }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Create Event'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
