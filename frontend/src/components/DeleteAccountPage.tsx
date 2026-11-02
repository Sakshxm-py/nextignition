import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, AlertTriangle, LogIn } from 'lucide-react';
import logoImage from '../assets/logo.png';
import { brandColors } from '../utils/colors';
import { Footer } from './Footer';
import { getCurrentUser, deleteAccount } from '../services/authService';
import { toast } from 'sonner';

export const DeleteAccountPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [checkedConsent, setCheckedConsent] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  const handleDelete = async () => {
    if (confirmationText !== 'DELETE') {
      toast.error("Please type 'DELETE' in all caps to confirm.");
      return;
    }
    if (!checkedConsent) {
      toast.error("Please check the consent box.");
      return;
    }

    setLoading(true);
    try {
      await deleteAccount();
      toast.success("Your account and all associated data have been permanently deleted.");
      setTimeout(() => {
        window.location.hash = '#';
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-200 bg-white"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-4">
          <a href="#" className="flex items-center gap-2" onClick={() => window.location.hash = '#'}>
            <img
              src={logoImage}
              alt="Next Ignition Logo"
              className="h-6 lg:h-8 cursor-pointer"
            />
          </a>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: brandColors.electricBlue }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-12">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden p-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
            Delete Account
          </h1>

          {!currentUser ? (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex gap-4 text-amber-800">
                <AlertTriangle className="w-6 h-6 shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Authentication Required</h3>
                  <p className="text-sm">
                    You must be logged in to delete your account. This ensures you can only delete accounts that you own.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sessionStorage.setItem('redirectAfterAuth', 'delete-account');
                  window.location.hash = '#login';
                }}
                className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                style={{ background: brandColors.electricBlue }}
              >
                <LogIn className="w-5 h-5" />
                Log In to Continue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-sm text-slate-500">Currently logged in as:</p>
                <p className="font-semibold text-slate-900">{currentUser.name || currentUser.displayName}</p>
                <p className="text-sm text-slate-600">{currentUser.email}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 space-y-4">
                <div className="flex gap-4">
                  <AlertTriangle className="w-6 h-6 shrink-0 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Warning: This is Permanent</h3>
                    <p className="text-sm">
                      Deleting your account will immediately and permanently erase all your data. This action is absolute and cannot be undone.
                    </p>
                  </div>
                </div>

                <ul className="text-xs space-y-2 list-disc list-inside border-t border-red-200/50 pt-3 opacity-90">
                  <li>Your user profile, settings, and credentials will be removed.</li>
                  <li>All your projects, campaigns, and generated pitches will be lost.</li>
                  <li>All direct messages, chat logs, and connections will be wiped.</li>
                  <li>Your active subscription (if any) will be terminated immediately.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedConsent}
                    onChange={(e) => setCheckedConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-600 font-medium select-none">
                    I explicitly consent to the permanent deletion of my account and all associated data.
                  </span>
                </label>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    To confirm, please type <span className="font-bold text-red-600">DELETE</span> in the box below:
                  </label>
                  <input
                    type="text"
                    placeholder="Type DELETE"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="block w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-base uppercase"
                  />
                </div>
              </div>

              <button
                onClick={handleDelete}
                disabled={loading || !checkedConsent || confirmationText !== 'DELETE'}
                className="w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-5 h-5" />
                {loading ? 'Deleting Account...' : 'Permanently Delete My Account'}
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Need help? Contact support at <a href="mailto:support@nextignition.com" className="text-blue-500 hover:underline">support@nextignition.com</a>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
