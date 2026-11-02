import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, ExternalLink, History, Download, Loader2 } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { getCurrentUser } from '../../services/authService';
import api from '../../services/api';
import { Capacitor } from '@capacitor/core';

export function SubscriptionBillingTab({ userRole }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user) {
      fetchBillingHistory();
    }
  }, []);

  const fetchBillingHistory = async () => {
    try {
      const { data } = await api.get('/payments/status');
      setHistory(data.activeSubscriptions || []);
    } catch (err) {
      console.error("Failed to fetch billing history", err);
    } finally {
      setLoading(false);
    }
  };

  const activePlan = currentUser?.[`${userRole}_plan`] || 'free';

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8 px-4 lg:px-0">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Subscription & Billing</h2>
        <p className="text-gray-600">
          Manage your subscription plan, billing details, and payment history.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-200 shadow-sm mb-8 mx-4 lg:mx-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900 capitalize">
                {userRole} {activePlan} Plan
              </h3>
              {activePlan !== 'free' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {activePlan === 'free'
                ? (Capacitor.getPlatform() === 'ios'
                    ? 'You are currently on the free plan.'
                    : 'You are currently on the free plan. Upgrade to unlock premium tools and priority access.')
                : 'You are receiving premium features for this role.'}
            </p>
          </div>

          {/* iOS shows no purchase/management CTA (Apple Guideline 3.1.1 — fully-free app) */}
          {Capacitor.getPlatform() !== 'ios' && (
            <button
              onClick={() => window.location.hash = '#pricing'}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              style={{ backgroundColor: brandColors.electricBlue }}
            >
              Manage Subscription <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-3xl p-6 lg:p-8 border border-gray-200 mx-4 lg:mx-0 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200 shadow-sm">
            <CreditCard className="w-6 h-6 text-gray-600" />
          </div>
          <h4 className="text-lg font-bold text-gray-900">Payment Methods</h4>
        </div>
        <p className="text-gray-600 mb-6">
          Your payments are securely handled. View your full billing history below to download receipts.
        </p>
        {Capacitor.getPlatform() !== 'ios' && (
          <button 
            onClick={() => {
              const el = document.getElementById('transaction-history');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Billing Portal
          </button>
        )}
      </div>

      <div id="transaction-history" className="bg-white rounded-3xl border border-gray-200 shadow-sm mx-4 lg:mx-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-400" />
            <h4 className="text-lg font-bold text-gray-900">Transaction History</h4>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No transactions found.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Plan & Role</th>
                  <th className="px-6 py-4">Payment ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 italic">
                {history.map((tx) => (
                  <tr key={tx.id} className="text-sm not-italic hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 uppercase text-xs">{tx.plan}</div>
                      <div className="text-gray-500 capitalize">{tx.role}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{tx.razorpay_payment_id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold uppercase border border-green-100">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-xs">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}