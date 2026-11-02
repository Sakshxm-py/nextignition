import { useState, useEffect } from 'react';
import { 
  Newspaper, 
  TrendingUp, 
  Search, 
  Calendar, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ArrowLeft,
  Filter,
  Activity,
  Zap,
  DollarSign,
  Loader2,
  ExternalLink,
  Menu
} from 'lucide-react';
import api from '../services/api';

interface NewsFeedPageProps {
  userRole?: 'founder' | 'expert' | 'investor';
  onBack?: () => void;
  onMenuClick?: () => void;
  hideHeader?: boolean;
}

interface NewsItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  likes: number;
  comments: number;
  featured?: boolean;
  image?: string;
  url?: string;
}

const SAMPLE_NEWS: NewsItem[] = [
  {
    id: '1',
    category: 'Funding',
    title: 'Southeast Asia AI Hubs Receive $4B Private Equity Injection',
    summary: 'A consortium of top-tier investors has announced a massive capital commitment to accelerate AI infrastructure development across the region...',
    author: 'Elena Vance',
    authorRole: 'Chief Market Analyst',
    date: '2h ago',
    readTime: '6 min read',
    likes: 342,
    comments: 21,
    featured: true,
  },
  {
    id: '2',
    category: 'Market Trends',
    title: 'The Rise of "Sustainable-by-Design" Hardware in 2026',
    summary: 'Investors are shifting focus from pure SaaS to hardware startups that integrate circular economy principles from the blueprint stage.',
    author: 'Marcus Chen',
    authorRole: 'Senior Venture Architect',
    date: '5h ago',
    readTime: '4 min read',
    likes: 128,
    comments: 12,
  },
  {
    id: '3',
    category: 'AI Infrastructure',
    title: 'LLM Training Costs Down 40% as Next-Gen GPUs Hit Market',
    summary: 'Fresh data shows that horizontal scaling efficiency is improving, potentially leveling the playing field for early-stage AI research.',
    author: 'Dr. Sarah Loh',
    authorRole: 'Director of Applied Research',
    date: 'Yesterday',
    readTime: '8 min read',
    likes: 856,
    comments: 45,
  },
];

const CATEGORIES = ['All News', 'Funding', 'Market Trends', 'AI Infrastructure', 'Regulation', 'Strategy'];

export function NewsFeedPage({ userRole = 'founder', onBack, onMenuClick, hideHeader }: NewsFeedPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('All News');
  const [searchQuery, setSearchQuery] = useState('');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [pulse, setPulse] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [newsRes, pulseRes] = await Promise.all([
        api.get('/news/external', { params: { pageSize: 20, refresh: isRefresh } }),
        api.get('/news/pulse', { params: { refresh: isRefresh } })
      ]);
      
      const articles = Array.isArray(newsRes.data) ? newsRes.data : [];
      if (articles.length > 0) {
        setNews(articles);
      } else {
        setNews(SAMPLE_NEWS);
      }

      if (Array.isArray(pulseRes.data)) {
        setPulse(pulseRes.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      // Fallback to sample data on error
      if (news.length === 0) setNews(SAMPLE_NEWS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGoBack = () => {
    try {
      localStorage.setItem(`dashboard:${userRole}:activeTab`, 'Home Feed');
    } catch {
      // ignore
    }
    window.location.hash = `#${userRole}-dashboard`;
  };

  const filteredNews = news.filter(item => {
    const matchesCategory = selectedCategory === 'All News' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = news.find(n => n.featured);

  const openArticle = (item: NewsItem) => {
    if (item.url) window.open(item.url, '_blank');
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&auto=format&fit=crop';
    e.currentTarget.onerror = null; // prevent infinite loop
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex flex-shrink-0 flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`items-center justify-between md:justify-start gap-4 ${hideHeader ? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onMenuClick && !hideHeader && (
              <button 
                onClick={onMenuClick}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden flex-shrink-0"
                title="Menu"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            )}
            {onBack && !hideHeader && (
              <button 
                onClick={() => onBack ? onBack() : window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
              </button>
            )}
          </div>
          {!hideHeader && <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight truncate">News Feed</h1>}
          
          <div className="md:hidden">
            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title="Refresh News"
            >
              <Activity className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 max-w-xl w-full md:mx-8">
           <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input name="input-d5c6ac" 
                 type="text"
                 placeholder="Search market news, trends, or analysis..."
                 className="w-full bg-gray-100 border-none rounded-2xl py-2.5 pl-12 pr-5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
           <button 
             onClick={() => fetchData(true)}
             disabled={refreshing}
             className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 bg-white rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
           >
              <Activity className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing...' : 'Refresh News'}
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
         <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            
            {/* Left Content */}
            <div className="flex-1 space-y-8">
               
               {/* Category Tabs */}
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {CATEGORIES.map(cat => (
                    <button 
                       key={cat}
                       onClick={() => setSelectedCategory(cat)}
                       className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                          selectedCategory === cat 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                       }`}
                    >
                       {cat}
                    </button>
                  ))}
               </div>

               {loading ? (
                 <div className="flex items-center justify-center py-20">
                   <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                   <span className="ml-3 text-gray-500 font-medium">Loading latest news...</span>
                 </div>
               ) : (
                 <>
                   {/* Featured Article */}
                   {featured && (
                     <div 
                       className="relative group cursor-pointer overflow-hidden rounded-3xl bg-slate-900 min-h-[300px] sm:min-h-0 sm:aspect-[16/9] lg:aspect-[21/9] flex items-end"
                       onClick={() => openArticle(featured)}
                     >
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10"></div>
                        {featured.image ? (
                          <img 
                            src={featured.image} 
                            alt={featured.title} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" 
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-blue-600 group-hover:scale-110 transition-transform duration-700 opacity-20"></div>
                        )}
                        <div className="relative z-20 p-5 sm:p-8 w-full">
                           <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 sm:mb-4 inline-block">Featured Analysis</span>
                           <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight mb-2 sm:mb-3 line-clamp-3 transition-colors group-hover:text-blue-300">
                              {featured.title}
                           </h2>
                           <p className="text-gray-300 text-sm max-w-2xl line-clamp-2 mb-4 sm:mb-6 leading-relaxed">
                              {featured.summary}
                           </p>
                           <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center font-bold text-white text-xs">{(featured.author || 'N')[0]}</div>
                                 <span className="text-xs font-bold text-white">{featured.author}</span>
                              </div>
                              <span className="text-xs text-gray-400">{featured.date} • {featured.readTime}</span>
                              {featured.url && <ExternalLink className="w-4 h-4 text-gray-400" />}
                           </div>
                        </div>
                     </div>
                   )}

                   {/* News Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredNews.filter(n => !n.featured).map(news => (
                        <div 
                          key={news.id} 
                          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
                          onClick={() => openArticle(news)}
                        >
                           {news.image && (
                             <img 
                               src={news.image} 
                               alt={news.title} 
                               className="w-full h-36 object-cover rounded-xl mb-4" 
                               referrerPolicy="no-referrer"
                               onError={handleImageError}
                             />
                           )}
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 block">{news.category}</span>
                           <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3 hover:text-blue-600">{news.title}</h3>
                           <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">{news.summary}</p>
                           <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                 <span className="font-bold text-gray-700">{news.author}</span>
                                 <span>•</span>
                                 <span>{news.date}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <button
                                    onClick={(e) => { e.stopPropagation(); openArticle(news); }}
                                    className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="View discussion"
                                 >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold">{news.comments}</span>
                                 </button>
                                 {news.url && <ExternalLink className="w-3.5 h-3.5 text-gray-400" />}
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                 </>
               )}

               {!loading && filteredNews.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 text-center">
                   <Newspaper className="w-16 h-16 text-gray-200 mb-4" />
                   <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
                   <p className="text-gray-500 text-sm">Try adjusting your search or category filter</p>
                 </div>
               )}
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-80 space-y-8">
               
               {/* Activity Ticker */}
               <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="font-black text-sm text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" /> Live Pulse
                     </h3>
                     <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  </div>
                  <div className="space-y-6">
                     {(pulse.length > 0 ? pulse : [
                       { icon: 'Zap', color: 'bg-amber-50', iconColor: 'text-amber-500', text: 'EcoTransit closed $12M Series A', createdAt: new Date().toISOString() },
                       { icon: 'DollarSign', color: 'bg-green-50', iconColor: 'text-green-500', text: 'Market: SaaS multiples up 15%', createdAt: new Date().toISOString() },
                       { icon: 'MessageSquare', color: 'bg-blue-50', iconColor: 'text-blue-500', text: 'Expert Sarah H. posted "Q3 Outlook"', createdAt: new Date().toISOString() },
                       { icon: 'Activity', color: 'bg-purple-50', iconColor: 'text-purple-500', text: '5 New startups joined Discovery', createdAt: new Date().toISOString() },
                     ]).map((item, idx) => {
                       const IconComp = item.icon === 'Zap' ? Zap : item.icon === 'DollarSign' ? DollarSign : item.icon === 'MessageSquare' ? MessageSquare : Activity;
                       const timeAgo = (dateStr: string) => {
                         const diff = Date.now() - new Date(dateStr).getTime();
                         const mins = Math.floor(diff / 60000);
                         if (mins < 60) return `${mins}m ago`;
                         const hours = Math.floor(mins / 60);
                         if (hours < 24) return `${hours}h ago`;
                         return `${Math.floor(hours / 24)}d ago`;
                       };
                       return (
                        <div key={idx} className="flex gap-4 group cursor-pointer">
                           <div className={`w-10 h-10 rounded-xl ${item.color} flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110`}>
                              <IconComp className={`w-5 h-5 ${item.iconColor}`} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{item.text}</p>
                              <span className="text-[10px] text-gray-400 uppercase font-black">{timeAgo(item.createdAt)}</span>
                           </div>
                        </div>
                       );
                     })}
                  </div>
               </div>

               {/* Trending Tags */}
               <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <TrendingUp className="w-20 h-20" />
                  </div>
                  <h3 className="text-sm font-bold mb-4 relative z-10">Trending #Tags</h3>
                  <div className="flex flex-wrap gap-2 relative z-10">
                     {['#GenAI', '#FintechSG', '#SeedFunding', '#Sustainability', '#Web3'].map(tag => (
                       <span key={tag} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black cursor-pointer transition-colors tracking-widest uppercase">
                          {tag}
                       </span>
                     ))}
                  </div>
               </div>

            </aside>
         </div>
      </div>
    </div>
  );
}