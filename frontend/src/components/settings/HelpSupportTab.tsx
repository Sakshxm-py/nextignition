import { useState, useEffect } from 'react';
import { Search, Mail, MessageCircle, ExternalLink, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { submitSupportTicket, getHelpArticles } from '../../services/authService';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const IS_IOS = Capacitor.getPlatform() === 'ios';

export function HelpSupportTab({ userRole }: any) {
  const [ticketMessage, setTicketMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Articles state
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  useEffect(() => {
    getHelpArticles()
      .then(data => setArticles(data))
      .catch(() => console.warn('Could not load help articles'));
  }, []);

  const handleSubmitTicket = async () => {
    if (!ticketMessage.trim()) return;

    try {
      setLoading(true);
      await submitSupportTicket(ticketMessage);
      toast.success('Support ticket submitted successfully. We will get back to you soon.');
      setTicketMessage(''); // clear form on success
    } catch (error) {
      toast.error('Failed to submit support ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help &amp; Support</h1>
        <p className="text-gray-600">Get help and find answers to your questions</p>
      </div>

      {status.message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium">{status.message}</p>
          <button onClick={() => setStatus({ type: '', message: '' })} className="ml-auto text-sm opacity-50 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Search Help */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input name="input-5971f6"
            type="text"
            placeholder="How can we help you?"
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          {articles.length > 0 ? articles.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                if (item.path) {
                  let tab = '';
                  if (item.path === '/discover') tab = 'Discover';
                  else if (item.path === '/dashboard') tab = 'Home Feed';
                  else if (item.path === '/profile') tab = 'Profile';
                  else if (item.path === '/funding') tab = 'Funding Portal';
                  else if (item.path === '/communities') tab = 'Communities';
                  else if (item.path === '/analytics') tab = 'Analytics';
                  
                  if (tab) {
                    window.dispatchEvent(new CustomEvent('navigateDashboard', { detail: { tab, subTab: item.path === '/discover' ? 'CoFounders' : undefined } }));
                    window.location.hash = `#${userRole}-dashboard`;
                  } else {
                    window.location.hash = item.path;
                  }
                } else {
                  setSelectedArticle(item);
                }
              }}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          )) : (
            <div className="col-span-2 text-center py-4 text-gray-500">Loading articles...</div>
          )}
        </div>
      </div>

      {/* Support Tier */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">{IS_IOS ? 'Support' : `Your Support Level: ${(userRole + '_plan').replace('_', ' ').toUpperCase()}`}</h3>
            <p className="text-sm text-gray-600">{IS_IOS ? 'We are here to help anytime.' : 'Standard support for your current tier'}</p>
          </div>
          <a href="mailto:support@nextignition.com" className="px-4 py-2 rounded-lg font-medium text-white inline-flex items-center"
            style={{ background: brandColors.electricBlue }}>
            <Mail className="w-4 h-4 mr-2" />
            Email Support
          </a>
        </div>
        <p className="text-sm text-gray-600">
          {IS_IOS ? '💡 Contact us anytime — we usually reply within 24 hours.' : '💡 Contact us for higher tier support options'}
        </p>
      </div>

      {/* Contact Options */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Contact Options</h2>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-bold mb-2">📧 Submit a Ticket</h3>
            <p className="text-sm text-gray-600 mb-3">Average response time: 24 hours</p>
            <textarea
              name="textarea-f5d146"
              value={ticketMessage}
              onChange={(e) => setTicketMessage(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 resize-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleSubmitTicket}
              disabled={loading || !ticketMessage.trim()}
              className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 transition-opacity"
              style={{ background: brandColors.electricBlue }}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-bold mb-2">💬 Community Help</h3>
            <p className="text-sm text-gray-600 mb-3">Get help from other founders</p>
            <button 
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigateDashboard', { detail: { tab: 'Communities' } }));
                window.location.hash = `#${userRole}-dashboard`;
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask in #help channel
            </button>
          </div>
        </div>
      </div>



      {/* App Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="text-center text-sm text-gray-600">
          <p>NextIgnition Platform</p>
          <p className="mt-1">System status is up to date</p>
        </div>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedArticle(null)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedArticle.icon}</span>
                <h2 className="text-xl font-bold">{selectedArticle.label}</h2>
              </div>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed text-lg">
                {selectedArticle.content}
              </p>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedArticle(null)}
                className="px-6 py-2 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: brandColors.electricBlue }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
