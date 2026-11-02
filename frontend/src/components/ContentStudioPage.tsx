import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  FileText,
  Plus,
  Edit,
  Eye,
  ThumbsUp,
  MessageCircle,
  BarChart3,
  Calendar,
  X,
  Lightbulb,
  Target,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Hash
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { brandColors } from '../utils/colors';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

// Guard against invalid/missing createdAt — date-fns throws "Invalid time value"
// on an unparseable date, which would crash the whole grid.
const formatRelativeSafe = (value?: string) => {
  if (!value) return 'Recently';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Recently' : formatDistanceToNow(d, { addSuffix: true });
};

interface ContentItem {
  _id: string;
  title: string;
  content: string;
  type: 'article' | 'course' | 'guide';
  status: 'draft' | 'published';
  views: number;
  likes: string[];
  createdAt: string;
}

export function ContentStudioPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contentType, setContentType] = useState<'article' | 'course' | 'guide'>('article');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showAISidebar, setShowAISidebar] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState({
    outline: [
      '1. Introduction: The importance of product-market fit',
      '2. Understanding your target customer',
      '3. Validating your product hypothesis',
      '4. Iterating based on customer feedback',
      '5. Measuring product-market fit',
      '6. Common pitfalls to avoid',
      '7. Conclusion and next steps'
    ],
    examples: [
      'Airbnb: How they pivoted from air mattresses to global home-sharing platform',
      'Slack: From gaming company failure to $27B enterprise communication tool',
      'Instagram: Finding PMF by focusing on photo filters over location check-ins'
    ],
    clarity: [
      'Consider breaking up paragraph 3 into smaller sections',
      'Add subheadings every 300-400 words for better readability',
      'Use bullet points to highlight key takeaways',
      'Include real-world examples to illustrate concepts'
    ],
    seo: {
      keywords: ['product-market fit', 'startup validation', 'customer discovery', 'MVP testing', 'startup growth'],
      metaDescription: 'Learn how to find product-market fit for your startup with proven frameworks, real-world examples, and actionable steps from successful founders.',
      readabilityScore: 72
    }
  });

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const response = await api.get('/knowledge');
      setContentItems(response.data);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setContentType('article');
    setEditingId(null);
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (saving) return;
    if (!title.trim() || !content.trim()) {
      alert('Please provide both title and content');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        type: contentType,
        status
      };

      if (editingId) {
        await api.put(`/knowledge/${editingId}`, payload);
      } else {
        await api.post('/knowledge', payload);
      }

      setShowCreateModal(false);
      resetForm();
      fetchContent();
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ContentItem) => {
    setTitle(item.title);
    setContent(item.content);
    setContentType(item.type);
    setEditingId(item._id);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      await api.delete(`/knowledge/${id}`);
      fetchContent();
    } catch (error) {
      console.error('Failed to delete content:', error);
    }
  };

  const generateOutline = () => {
    let newOutline: string[] = [];
    
    if (contentType === 'article') {
      newOutline = [
        '1. Introduction: Hook and context',
        '2. Problem statement',
        '3. Key insights and analysis',
        '4. Supporting evidence and data',
        '5. Practical implications',
        '6. Expert perspectives',
        '7. Conclusion and takeaways'
      ];
    } else if (contentType === 'course') {
      newOutline = [
        '1. Course overview and learning objectives',
        '2. Module 1: Foundational concepts',
        '3. Module 2: Core methodology',
        '4. Module 3: Advanced techniques',
        '5. Module 4: Real-world application',
        '6. Module 5: Case studies and exercises',
        '7. Final assessment and certification'
      ];
    } else if (contentType === 'guide') {
      newOutline = [
        '1. Introduction: Why ' + (title || 'this topic') + ' matters',
        '2. Prerequisites and requirements',
        '3. Step-by-step implementation',
        '4. Best practices and tips',
        '5. Common mistakes to avoid',
        '6. Troubleshooting and FAQs',
        '7. Next steps and resources'
      ];
    }
    
    setAiSuggestions(prev => ({ ...prev, outline: newOutline }));
  };

  const generateExamples = () => {
    let newExamples: string[] = [];
    
    if (contentType === 'article') {
      newExamples = [
        'Y Combinator: How they scaled startup mentorship to thousands of companies',
        'Stripe: Building a developer-first payment platform in a complex industry',
        'Notion: From failed consumer app to $10B productivity workspace'
      ];
    } else if (contentType === 'course') {
      newExamples = [
        'Interactive coding exercises with instant feedback',
        'Video walkthroughs with real startup founders',
        'Capstone project: Build your own MVP in 30 days'
      ];
    } else if (contentType === 'guide') {
      newExamples = [
        'Airbnb: How they pivoted from air mattresses to global home-sharing platform',
        'Slack: From gaming company failure to $27B enterprise communication tool',
        'Instagram: Finding PMF by focusing on photo filters over location check-ins'
      ];
    }
    
    setAiSuggestions(prev => ({ ...prev, examples: newExamples }));
  };

  const improveClarityHandler = () => {
    let newClarity: string[] = [];
    
    if (contentType === 'article') {
      newClarity = [
        'Lead with your strongest point in the introduction',
        'Use data visualizations to support key claims',
        'Add subheadings every 250-300 words',
        'Include pull quotes to highlight key insights'
      ];
    } else if (contentType === 'course') {
      newClarity = [
        'Add learning objectives at the start of each module',
        'Include progress checkpoints and quizzes',
        'Use video timestamps for easy navigation',
        'Provide downloadable resources and templates'
      ];
    } else if (contentType === 'guide') {
      newClarity = [
        'Number each step clearly for easy following',
        'Add screenshots or diagrams for visual learners',
        'Include estimated time for each section',
        'Provide checklists for completion verification'
      ];
    }
    
    setAiSuggestions(prev => ({ ...prev, clarity: newClarity }));
  };

  const optimizeSEO = () => {
    let newSEO: { keywords: string[]; metaDescription: string; readabilityScore: number };
    
    if (contentType === 'article') {
      newSEO = {
        keywords: ['startup insights', 'business analysis', 'entrepreneurship trends', 'tech industry', 'innovation'],
        metaDescription: 'Deep dive into the latest trends and insights shaping the startup ecosystem. Expert analysis and actionable takeaways for founders.',
        readabilityScore: 78
      };
    } else if (contentType === 'course') {
      newSEO = {
        keywords: ['online course', 'startup education', 'learn entrepreneurship', 'founder training', 'business skills'],
        metaDescription: 'Comprehensive online course designed to help you master essential startup skills. Learn from experienced founders and industry experts.',
        readabilityScore: 82
      };
    } else {
      newSEO = {
        keywords: ['step-by-step guide', 'how to startup', 'founder playbook', 'startup resources', 'implementation guide'],
        metaDescription: 'Complete step-by-step guide with practical frameworks, real-world examples, and proven strategies for startup success.',
        readabilityScore: 85
      };
    }
    
    setAiSuggestions(prev => ({ ...prev, seo: newSEO }));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Content Studio
          </h1>
          <p className="text-gray-600 mt-1">Create and manage your knowledge content</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Create New Content
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{contentItems.length}</span>
          </div>
          <p className="text-sm text-gray-600">Total Content</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">
              {contentItems.reduce((acc, item) => acc + (item.views || 0), 0).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600">Total Views</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <ThumbsUp className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">
              {contentItems.reduce((acc, item) => acc + (item.likes?.length || 0), 0)}
            </span>
          </div>
          <p className="text-sm text-gray-600">Total Likes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">Active</span>
          </div>
          <p className="text-sm text-gray-600">Content Status</p>
        </motion.div>
      </div>

      {/* Content Grid */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Content</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                 className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
               />
               <p>Loading your content...</p>
            </div>
          ) : contentItems.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No knowledge content found. Click "Create New Content" to start.</p>
            </div>
          ) : contentItems.map((item, idx) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  item.type === 'article' ? 'bg-blue-100 text-blue-700' :
                  item.type === 'course' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {item.type.toUpperCase()}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {item.status}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {formatRelativeSafe(item.createdAt)}
              </p>

              <div className="mt-auto">
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {item.views || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {item.likes?.length || 0}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                        window.open(`${window.location.origin}/knowledge/${item._id}`, '_blank');
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button 
                    onClick={() => handleDelete(item._id)}
                    className="p-2 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Create Content Modal with AI Assistant */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col lg:flex-row"
            >
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingId ? 'Edit Content' : 'Create New Content'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAISidebar(!showAISidebar)}
                      className="px-4 py-2 border-2 border-[#6666FF] text-[#6666FF] rounded-lg text-sm font-bold hover:bg-[#6666FF]/5 transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {showAISidebar ? 'Hide' : 'Show'} AI Assistant
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Content Form - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                  {/* Content Type Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <div className="flex gap-3">
                      {['article', 'course', 'guide'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setContentType(type as typeof contentType)}
                          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            contentType === type
                              ? 'bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input name="input-85a8cc"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter content title..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF]"
                    />
                  </div>

                  {/* Content Editor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <textarea name="textarea-48f83f"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Start writing your content here..."
                      rows={12}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6666FF] resize-none"
                    />
                  </div>

                  {/* AI Assistant - Mobile Only (shows below content) */}
                  {showAISidebar && (
                    <div className="lg:hidden bg-gradient-to-b from-[#6666FF]/5 to-[#F78405]/5 rounded-2xl p-6 space-y-6 border border-gray-200">
                      {/* Header */}
                      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">AI Content Assistant</h3>
                          <p className="text-xs text-gray-600">Powered by Ignisha</p>
                        </div>
                      </div>

                      {/* Generate Outline */}
                      <div>
                        <button
                          onClick={generateOutline}
                          className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl text-left hover:border-blue-400 transition-colors mb-3 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              Generate Outline
                            </h4>
                            <Sparkles className="w-4 h-4 text-blue-600 group-hover:animate-pulse" />
                          </div>
                          <p className="text-xs text-gray-600">AI creates structure based on your topic</p>
                        </button>
                        <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
                          {aiSuggestions.outline.map((item, idx) => (
                            <div key={idx} className="text-sm text-gray-700 hover:text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Suggest Examples */}
                      <div>
                        <button
                          onClick={generateExamples}
                          className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl text-left hover:border-purple-400 transition-colors mb-3 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-purple-600" />
                              Suggest Examples
                            </h4>
                            <Sparkles className="w-4 h-4 text-purple-600 group-hover:animate-pulse" />
                          </div>
                          <p className="text-xs text-gray-600">Real-world case studies</p>
                        </button>
                        <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
                          {aiSuggestions.examples.map((example, idx) => (
                            <div key={idx} className="text-sm text-gray-700 p-3 bg-purple-50 rounded-lg border border-purple-100">
                              {example}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Improve Clarity */}
                      <div>
                        <button
                          onClick={improveClarityHandler}
                          className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-left hover:border-orange-400 transition-colors mb-3 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                              <Target className="w-5 h-5 text-orange-600" />
                              Improve Clarity
                            </h4>
                            <Sparkles className="w-4 h-4 text-orange-600 group-hover:animate-pulse" />
                          </div>
                          <p className="text-xs text-gray-600">Readability suggestions</p>
                        </button>
                        <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
                          {aiSuggestions.clarity.map((tip, idx) => (
                            <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SEO Optimize */}
                      <div>
                        <button
                          onClick={optimizeSEO}
                          className="w-full px-4 py-3 bg-white border-2 border-green-200 rounded-xl text-left hover:border-green-400 transition-colors mb-3 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-green-600" />
                              SEO Optimize
                            </h4>
                            <Sparkles className="w-4 h-4 text-green-600 group-hover:animate-pulse" />
                          </div>
                          <p className="text-xs text-gray-600">Keywords and meta description</p>
                        </button>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2">Suggested Keywords:</p>
                            <div className="flex flex-wrap gap-2">
                              {aiSuggestions.seo.keywords.map((keyword, idx) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-1">Meta Description:</p>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{aiSuggestions.seo.metaDescription}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-1">Readability Score:</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                                  style={{ width: `${aiSuggestions.seo.readabilityScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-green-600">{aiSuggestions.seo.readabilityScore}/100</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Fixed Footer */}
                <div className="sticky bottom-0 bg-white p-6 border-t border-gray-200 flex items-center justify-between flex-shrink-0 shadow-lg z-20">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave('draft')}
                      disabled={saving}
                      className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors ml-[5px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      onClick={() => handleSave('published')}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg font-bold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                    >
                      {saving ? 'Saving...' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Content Assistant Sidebar */}
              <AnimatePresence>
              {showAISidebar && (
                <motion.div
                  key="ai-sidebar"
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  className="hidden lg:block w-full lg:w-96 bg-gradient-to-b from-[#6666FF]/5 to-[#F78405]/5 lg:border-l border-t lg:border-t-0 border-gray-200 overflow-y-auto"
                >
                  <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">AI Content Assistant</h3>
                        <p className="text-xs text-gray-600">Powered by Ignisha</p>
                      </div>
                    </div>

                    {/* Generate Outline */}
                    <div>
                      <button
                        onClick={generateOutline}
                        className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl text-left hover:border-blue-400 transition-colors mb-3 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Generate Outline
                          </h4>
                          <Sparkles className="w-4 h-4 text-blue-600 group-hover:animate-pulse" />
                        </div>
                        <p className="text-xs text-gray-600">AI creates structure based on your topic</p>
                      </button>
                      <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
                        {aiSuggestions.outline.map((item, idx) => (
                          <div key={idx} className="text-sm text-gray-700 hover:text-gray-900 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggest Examples */}
                    <div>
                      <button
                        onClick={generateExamples}
                        className="w-full px-4 py-3 bg-white border-2 border-purple-200 rounded-xl text-left hover:border-purple-400 transition-colors mb-3 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-purple-600" />
                            Suggest Examples
                          </h4>
                          <Sparkles className="w-4 h-4 text-purple-600 group-hover:animate-pulse" />
                        </div>
                        <p className="text-xs text-gray-600">Real-world case studies</p>
                      </button>
                      <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
                        {aiSuggestions.examples.map((example, idx) => (
                          <div key={idx} className="text-sm text-gray-700 p-3 bg-purple-50 rounded-lg border border-purple-100">
                            {example}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Improve Clarity */}
                    <div>
                      <button
                        onClick={improveClarityHandler}
                        className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-left hover:border-orange-400 transition-colors mb-3 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Target className="w-5 h-5 text-orange-600" />
                            Improve Clarity
                          </h4>
                          <Sparkles className="w-4 h-4 text-orange-600 group-hover:animate-pulse" />
                        </div>
                        <p className="text-xs text-gray-600">Readability suggestions</p>
                      </button>
                      <div className="space-y-2 bg-white rounded-xl p-4 border border-gray-200">
                        {aiSuggestions.clarity.map((tip, idx) => (
                          <div key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SEO Optimize */}
                    <div>
                      <button
                        onClick={optimizeSEO}
                        className="w-full px-4 py-3 bg-white border-2 border-green-200 rounded-xl text-left hover:border-green-400 transition-colors mb-3 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            SEO Optimize
                          </h4>
                          <Sparkles className="w-4 h-4 text-green-600 group-hover:animate-pulse" />
                        </div>
                        <p className="text-xs text-gray-600">Keywords and meta description</p>
                      </button>
                      <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-2">Suggested Keywords:</p>
                          <div className="flex flex-wrap gap-2">
                            {aiSuggestions.seo.keywords.map((keyword, idx) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-1">Meta Description:</p>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{aiSuggestions.seo.metaDescription}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-700 mb-1">Readability Score:</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                                style={{ width: `${aiSuggestions.seo.readabilityScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-green-600">{aiSuggestions.seo.readabilityScore}/100</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}