import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

export type ReportTargetType =
  | 'user'
  | 'post'
  | 'comment'
  | 'message'
  | 'community'
  | 'event'
  | 'podcast';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Optional label shown in the dialog, e.g. the author's name or content title. */
  targetLabel?: string;
}

const REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Hate speech',
  'Inappropriate or explicit content',
  'Violence or dangerous content',
  'Misinformation',
  'Other',
];

/**
 * Reusable "Report content" flow used across every user-generated-content
 * surface (feed posts, direct messages, community messages, podcasts, events,
 * profiles). Submits to POST /reports for admin moderation — satisfies Apple
 * Guideline 1.2 (a real, wired report mechanism, not a fake toast).
 */
export function ReportDialog({ open, onClose, targetType, targetId, targetLabel }: ReportDialogProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details: details.trim() || undefined });
      toast.success('Report submitted. Our team reviews reports within 24 hours.');
      setDetails('');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-gray-900">Report content</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {targetLabel && (
            <p className="text-sm text-gray-500">
              Reporting: <span className="font-medium text-gray-800">{targetLabel}</span>
            </p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Details <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Add any context that will help our moderators."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <p className="text-xs text-gray-400">
            NextIgnition has zero tolerance for objectionable content or abusive users.
            Reported content is reviewed within 24 hours.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
