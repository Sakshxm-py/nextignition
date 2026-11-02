import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Rocket,
  User,
  CreditCard,
  Wrench,
  Target,
  MessageSquare,
  GraduationCap,
  Briefcase,
  HelpCircle,
  ChevronRight,
  Mail,
  Send,
  Paperclip,
  X,
  Clock,
  CheckCircle,
  Users,
  ArrowLeft,
  FileText,
  Zap,
  MessageCircle,
  PhoneCall
} from 'lucide-react';
import { brandColors } from '../utils/colors';

type SubscriptionTier = 'free' | 'pro' | 'elite';
type CategoryId = 'getting-started' | 'account' | 'billing' | 'technical' | 'funding' | 'communities' | 'experts' | 'investors';

interface HelpCategory {
  id: CategoryId;
  title: string;
  icon: any;
  color: string;
  articleCount: number;
}

interface Article {
  id: number;
  title: string;
  category: CategoryId;
  views: number;
  helpful: number;
  content: string;
}

interface HelpSupportPageProps {
  userTier?: SubscriptionTier;
  onClose?: () => void;
}

export function HelpSupportPage({ userTier = 'pro', onClose }: HelpSupportPageProps) {
  // iOS ships fully free — treat everyone as top tier so no plan gating shows.
  const effectiveTier = Capacitor.getPlatform() === 'ios' ? 'elite' : userTier;
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    attachments: [] as File[],
  });

  const categories: HelpCategory[] = [
    { id: 'getting-started', title: 'Getting Started', icon: Rocket, color: brandColors.atomicOrange, articleCount: 12 },
    { id: 'account', title: 'Account & Profile', icon: User, color: brandColors.electricBlue, articleCount: 15 },
    { id: 'billing', title: 'Payments & Billing', icon: CreditCard, color: '#10B981', articleCount: 8 },
    { id: 'technical', title: 'Technical Issues', icon: Wrench, color: '#EF4444', articleCount: 10 },
    { id: 'funding', title: 'Funding Portal', icon: Target, color: '#8B5CF6', articleCount: 14 },
    { id: 'communities', title: 'Communities & Chat', icon: MessageSquare, color: '#F59E0B', articleCount: 9 },
    { id: 'experts', title: 'For Experts', icon: GraduationCap, color: '#06B6D4', articleCount: 11 },
    { id: 'investors', title: 'For Investors', icon: Briefcase, color: '#EC4899', articleCount: 13 },
  ].filter(c => !(Capacitor.getPlatform() === 'ios' && c.id === 'billing')) as HelpCategory[]; // no payments/billing on iOS

  const popularArticles: Article[] = [
    { id: 1, title: 'How to create your first pitch deck', category: 'getting-started', views: 15420, helpful: 1243, content: 'Full article content...' },
    { id: 2, title: 'Setting up two-factor authentication', category: 'account', views: 12350, helpful: 987, content: 'Full article content...' },
    { id: 3, title: 'Understanding subscription billing cycles', category: 'billing', views: 10890, helpful: 856, content: 'Full article content...' },
    { id: 4, title: 'How to connect with investors', category: 'funding', views: 9650, helpful: 742, content: 'Full article content...' },
    { id: 5, title: 'Joining and creating communities', category: 'communities', views: 8920, helpful: 681, content: 'Full article content...' },
    { id: 6, title: 'Troubleshooting login issues', category: 'technical', views: 8450, helpful: 623, content: 'Full article content...' },
    { id: 7, title: 'How to offer expert consultations', category: 'experts', views: 7890, helpful: 594, content: 'Full article content...' },
    { id: 8, title: 'Finding the right startups to invest in', category: 'investors', views: 7320, helpful: 542, content: 'Full article content...' },
    { id: 9, title: 'Customizing your profile settings', category: 'account', views: 6840, helpful: 498, content: 'Full article content...' },
    { id: 10, title: 'Managing payment methods', category: 'billing', views: 6250, helpful: 461, content: 'Full article content...' },
  ].filter(a => !(Capacitor.getPlatform() === 'ios' && a.category === 'billing')) as Article[];

  const searchSuggestions = [
    'How to reset my password',
    'Upgrade my subscription',
    'Contact investor relations',
    'Delete my account',
    'Change email address',
    'Download my data',
  ].filter(s => !(Capacitor.getPlatform() === 'ios' && s === 'Upgrade my subscription'));

  const recentSearches = [
    'two-factor authentication',
    'billing history',
    'pitch deck template',
  ].filter(s => !(Capacitor.getPlatform() === 'ios' && s === 'billing history'));

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(true);
  };

  const handleCategoryClick = (categoryId: CategoryId) => {
    setSelectedCategory(categoryId);
    setSelectedArticle(null);
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', contactForm);
    // Handle form submission
    setShowContactForm(false);
    // Reset form
    setContactForm({ name: '', email: '', subject: '', message: '', attachments: [] });
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setContactForm({ ...contactForm, attachments: [...contactForm.attachments, ...files] });
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...contactForm.attachments];
    newAttachments.splice(index, 1);
    setContactForm({ ...contactForm, attachments: newAttachments });
  };

  const getCategoryArticles = (categoryId: CategoryId) => {
    return popularArticles.filter(article => article.category === categoryId);
  };

  const tierSupport = {
    free: {
      type: 'Email Support',
      response: '48h response time',
      icon: Mail,
      color: '#6B7280',
      features: ['Email support', 'Knowledge base access', 'Community forum'],
    },
    pro: {
      type: 'Priority Email',
      response: '24h response time',
      icon: Zap,
      color: brandColors.electricBlue,
      features: ['Priority email support', 'Video tutorials', 'Live events', 'Community forum'],
    },
    elite: {
      type: 'Live Chat',
      response: 'Instant support',
      icon: MessageCircle,
      color: brandColors.atomicOrange,
      features: ['Live chat support', 'Phone support', 'Dedicated account manager', 'Custom onboarding'],
    },
  };

  const currentSupport = tierSupport[effectiveTier];
  const SupportIcon = currentSupport.icon;

  // Article Detail View
  if (selectedArticle) {
    const category = categories.find(c => c.id === selectedArticle.category);
    const CategoryIcon = category?.icon || HelpCircle;

    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Back Button */}
          <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 sticky top-0 z-20">
            <button
              onClick={() => setSelectedArticle(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Articles</span>
            </button>
          </div>

          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
            {/* Article Header */}
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold text-white mb-4"
                style={{ backgroundColor: category?.color }}
              >
                <CategoryIcon className="w-4 h-4" />
                {category?.title}
              </div>
              <h1 className="text-4xl font-bold mb-4">{selectedArticle.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{selectedArticle.views.toLocaleString()} views</span>
                <span>•</span>
                <span>{selectedArticle.helpful} found this helpful</span>
              </div>
            </div>

            {/* Article Content */}
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  This comprehensive guide will walk you through everything you need to know about {selectedArticle.title.toLowerCase()}.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Overview</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {selectedArticle.content && selectedArticle.content !== 'Full article content...'
                    ? selectedArticle.content
                    : `This article covers ${selectedArticle.title.toLowerCase()} on NextIgnition. Follow the steps below to complete the process, and review the common issues section if you run into trouble. Each step is designed to be quick so you can get back to building your startup.`}
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Step-by-Step Guide</h2>
                <ol className="space-y-4 mb-6">
                  <li className="text-gray-700">Navigate to your dashboard and locate the settings menu</li>
                  <li className="text-gray-700">Click on the appropriate section based on what you want to configure</li>
                  <li className="text-gray-700">Make your desired changes and ensure all fields are filled correctly</li>
                  <li className="text-gray-700">Save your changes and verify they've been applied</li>
                </ol>

                <div className="p-4 bg-blue-50 border-l-4 rounded-lg my-6" style={{ borderColor: brandColors.electricBlue }}>
                  <p className="text-sm font-bold text-blue-900 mb-1">💡 Pro Tip</p>
                  <p className="text-sm text-blue-800">
                    Take advantage of the auto-save feature to ensure you never lose your progress.
                  </p>
                </div>

                <h2 className="text-2xl font-bold mt-8 mb-4">Common Issues</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you encounter any problems, here are some common solutions:
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="text-gray-700">Clear your browser cache and cookies</li>
                  <li className="text-gray-700">Ensure you're using a supported browser version</li>
                  <li className="text-gray-700">Check your internet connection</li>
                  <li className="text-gray-700">Try logging out and back in</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">Need More Help?</h2>
                <p className="text-gray-700 leading-relaxed">
                  If you're still experiencing issues or have additional questions, don't hesitate to contact our support team. We're here to help!
                </p>
              </div>

              {/* Helpful Feedback */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="font-medium mb-4">Was this article helpful?</p>
                <div className="flex gap-3">
                  <button className="px-6 py-2.5 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors">
                    👍 Yes, helpful
                  </button>
                  <button className="px-6 py-2.5 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors">
                    👎 Not helpful
                  </button>
                </div>
              </div>

              {/* Related Articles */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-bold text-lg mb-4">Related Articles</h3>
                <div className="space-y-2">
                  {popularArticles.slice(0, 3).map(article => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-sm">{article.title}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Category Articles View
  if (selectedCategory) {
    const category = categories.find(c => c.id === selectedCategory);
    const CategoryIcon = category?.icon || HelpCircle;
    const articles = getCategoryArticles(selectedCategory);

    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Back Button */}
          <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 sticky top-0 z-20">
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Help Center</span>
            </button>
          </div>

          <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
            {/* Category Header */}
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-3 px-4 py-2 rounded-xl text-white mb-4"
                style={{ backgroundColor: category?.color }}
              >
                {CategoryIcon && <CategoryIcon className="w-6 h-6" />}
                <span className="font-bold text-lg">{category?.title}</span>
              </div>
              <p className="text-gray-600">
                Browse {category?.articleCount} articles about {category?.title.toLowerCase()}
              </p>
            </div>

            {/* Articles List */}
            <div className="space-y-3 relative">
              {popularArticles.map((article, index) => (
                <motion.button
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleArticleClick(article)}
                  className="w-full bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {article.views.toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          {article.helpful} helpful
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main Help & Support View
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        {/* Search Section */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 px-4 lg:px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              How can we help you?
            </h1>
            <p className="text-lg text-white/90 mb-8">
              Search our knowledge base or browse categories below
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input name="input-1efcd6"
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search for articles, guides, or FAQs..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-transparent focus:border-white focus:outline-none text-lg shadow-lg"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-30">
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 uppercase px-3 py-2">Suggestions</p>
                    {searchSuggestions
                      .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 5)
                      .map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setSearchQuery(suggestion)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{suggestion}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Recent Searches */}
              {showSuggestions && !searchQuery && recentSearches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-30">
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 uppercase px-3 py-2">Recent Searches</p>
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setSearchQuery(search)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          {/* Category Cards Grid */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 relative">
              {categories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleCategoryClick(category.id)}
                    className="bg-white p-6 rounded-xl border-2 border-gray-200 hover:border-current hover:scale-105 transition-all group"
                    style={{ borderColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = category.color}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: category.color }} />
                    </div>
                    <h3 className="font-bold mb-2">{category.title}</h3>
                    <p className="text-sm text-gray-600">{category.articleCount} articles</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Popular Articles */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Top 10 Frequently Asked Questions</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
              {popularArticles.map((article, index) => {
                const category = categories.find(c => c.id === article.category);
                return (
                  <button
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: category?.color }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {article.views.toLocaleString()} views • {article.helpful} found helpful
                      </p>
                    </div>
                    <ChevronRight className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact Support Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6">Contact Support</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tier-Based Support Card */}
              <div className="lg:col-span-2 bg-white rounded-xl border-2 p-8" style={{ borderColor: currentSupport.color }}>
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentSupport.color}20` }}
                  >
                    <SupportIcon className="w-6 h-6" style={{ color: currentSupport.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{currentSupport.type}</h3>
                    <p className="text-gray-600">{currentSupport.response}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {currentSupport.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {effectiveTier === 'elite' ? (
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="w-full py-3 rounded-lg font-bold text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: currentSupport.color }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Start Live Chat
                  </button>
                ) : (
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="w-full py-3 rounded-lg font-bold text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: currentSupport.color }}
                  >
                    <Mail className="w-5 h-5" />
                    Send Email
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
                >
                  <Mail className="w-6 h-6 mb-2" style={{ color: brandColors.electricBlue }} />
                  <h4 className="font-bold mb-1">Email Us</h4>
                  <p className="text-sm text-gray-600">support@nextignition.com</p>
                </button>

                <a
                  href="tel:+15551234567"
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left block"
                >
                  <PhoneCall className="w-6 h-6 mb-2" style={{ color: brandColors.electricBlue }} />
                  <h4 className="font-bold mb-1">Call Us</h4>
                  <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
                </a>

                <a
                  href="#communities"
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all text-left block"
                >
                  <Users className="w-6 h-6 mb-2" style={{ color: brandColors.electricBlue }} />
                  <h4 className="font-bold mb-1">Community</h4>
                  <p className="text-sm text-gray-600">Ask the community</p>
                </a>
              </div>
            </div>
          </div>

          {/* Community Forum Banner */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-white" />
            <h2 className="text-2xl font-bold text-white mb-2">Ask the Community</h2>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Join thousands of founders, experts, and investors sharing knowledge and helping each other succeed
            </p>
            <a
              href="#communities"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-lg font-bold hover:shadow-lg transition-all"
            >
              <MessageSquare className="w-5 h-5" />
              Join the Discussion
            </a>
          </div>
        </div>
      </main>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 relative" onClick={() => setShowContactForm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold">Contact Support</h2>
                <p className="text-sm text-gray-600">We'll get back to you within {currentSupport.response}</p>
              </div>
              <button onClick={() => setShowContactForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input name="input-8f415e"
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input name="input-a8e1d9"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input name="input-c6a939"
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What do you need help with?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea name="textarea-65fa81"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please describe your issue or question in detail..."
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-medium mb-2">Attachments (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileAttach}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Click to attach screenshots or files</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                  </label>
                </div>

                {/* Attached Files */}
                {contactForm.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {contactForm.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span className="text-sm truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: brandColors.electricBlue }}
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Live Chat Bubble - Elite Tier Only */}
      {effectiveTier === 'elite' && (
        <button
          onClick={() => setShowContactForm(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-transform"
          style={{ backgroundColor: brandColors.atomicOrange }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}
    </div>
  );
}
