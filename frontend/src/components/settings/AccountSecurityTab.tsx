import { useEffect, useState } from 'react';
import { Mail, Lock, Shield, Laptop, Trash2, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { getCurrentUser, logout, updateEmail, updatePassword, deactivateAccount, deleteAccount } from '../../services/authService';

export function AccountSecurityTab({ userRole }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setEmailInput(user?.email || '');
  }, []);

  const handleUpdateEmail = async () => {
    try {
      setLoading(true);
      await updateEmail(emailInput);
      const user = getCurrentUser();
      setCurrentUser(user);
      setStatus({ type: 'success', message: 'Email updated successfully' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to update email' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
        return setStatus({ type: 'error', message: 'Passwords do not match' });
    }
    try {
      setLoading(true);
      await updatePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.new });
      setStatus({ type: 'success', message: 'Password updated successfully' });
      setShowPasswordChange(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };




  const handleDeactivateAccount = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account?')) return;
    try {
      setLoading(true);
      await deactivateAccount();
      alert('Account deactivated. You will be logged out.');
      logout();
      window.location.href = '/login';
    } catch (error: any) {
      setStatus({ type: 'error', message: 'Failed to deactivate account' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      setLoading(true);
      await deleteAccount();
      setShowDeleteModal(false);
      window.location.hash = 'login';
    } catch (error: any) {
      setStatus({ type: 'error', message: error.response?.data?.message || 'Failed to delete account' });
      setShowDeleteModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <p className="text-gray-600">Manage your login credentials and security settings</p>
      </div>

      {status.message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <p className="font-medium">{status.message}</p>
            <button onClick={() => setStatus({ type: '', message: '' })} className="ml-auto text-sm opacity-50 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Section 1: Login Credentials */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Login Credentials</h2>
        
        {/* Email Address */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Email Address</label>
          <div className="flex gap-3">
            <input name="email-input-field"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleUpdateEmail}
              disabled={loading || emailInput === currentUser?.email}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Update Email
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">This email is used for login and important notifications</p>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium">Password</label>
            <button 
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="text-sm font-medium hover:underline"
              style={{ color: brandColors.electricBlue }}
            >
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </button>
          </div>
          
          {!showPasswordChange ? (
            <div className="flex items-center gap-3">
              <input name="input-966b6f"
                type="password"
                value="••••••••••••"
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <span className="text-xs text-gray-500">Last updated 45 days ago</span>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium mb-1">Current Password</label>
                <div className="relative">
                  <input name="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">New Password</label>
                <div className="relative">
                  <input name="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordForm.new.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    At least 8 characters
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <input name="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button 
                onClick={handleUpdatePassword}
                disabled={loading || !passwordForm.current || !passwordForm.new || passwordForm.new !== passwordForm.confirm}
                className="w-full px-4 py-2 rounded-lg font-bold text-white disabled:opacity-50"
                style={{ background: brandColors.electricBlue }}>
                Update Password
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Active Sessions */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Active Sessions</h2>
        
        <div className="space-y-3">
          {/* Current Session */}
          <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Laptop className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-bold text-sm">Current Browser Session</p>
                  <p className="text-xs text-gray-600">Active Now</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                This Device
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 italic text-center py-2">
            No other active sessions detected.
          </p>
        </div>

        <button className="w-full mt-4 px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50">
          Sign Out All Other Devices
        </button>
      </div>

      {/* Section 4: Account Management */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Account Management</h2>
        
        {/* Deactivate Account */}
        <div className="mb-6 p-4 border border-orange-300 bg-orange-50 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: brandColors.atomicOrange }} />
            Temporarily Deactivate Account
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Your profile will be hidden. You can reactivate anytime by logging back in.
          </p>
          <button 
            onClick={handleDeactivateAccount}
            disabled={loading}
            className="px-4 py-2 border-2 rounded-lg font-medium disabled:opacity-50"
            style={{ borderColor: brandColors.atomicOrange, color: brandColors.atomicOrange }}>
            Deactivate Account
          </button>
        </div>

        {/* Delete Account */}
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            Permanently Delete Account
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
          </p>
          <button
            onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true); }}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-3 text-red-700">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-bold">Permanently Delete Account</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This action <strong>cannot be undone</strong>. Your profile, posts, messages,
              connections, and all associated data will be permanently deleted.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect="off"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={confirmDeleteAccount}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE' || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                {loading ? 'Deleting…' : 'Delete My Account'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions - Removed redundant save button since actions are immediate */}
    </div>
  );
}
