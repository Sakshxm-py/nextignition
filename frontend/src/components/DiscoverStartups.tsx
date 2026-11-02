import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Bookmark, 
  ExternalLink, 
  ChevronRight,
  Globe,
  MessageCircle,
  FileText,
  BadgeCheck,
  Star,
  Target,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';
import { brandColors } from '../utils/colors';
import { Capacitor } from '@capacitor/core';

interface Startup {
  id: string;
  name: string;
  tagline: string;
  description: string;
  industry: string[];
  stage: string;
  location: string;
  logo?: string;
  website?: string;
  funding?: {
    target: number;
    raised: number;
    equity: number;
  };
  founder: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
  };
  metrics?: {
    users?: string;
    revenue?: string;
    growth?: string;
  };
  isSaved?: boolean;
}

export function DiscoverStartups() {
  // Coming-soon placeholder — never shown on iOS (Apple Guideline 2.1, app
  // completeness). The nav entry is already hidden on iOS; this is a hard
  // backstop covering every render path (sub-tabs, persisted activeTab, etc.).
  if (Capacitor.getPlatform() === 'ios') return null;
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchStartups();
  }, []);

  const fetchStartups = async () => {
    try {
      setLoading(true);
      const [startupsRes, savedRes] = await Promise.all([
        api.get('/startups'),
        api.get('/bookmarks/startups')
      ]);
      
      const savedIds = new Set(savedRes.data.map((s: any) => s.id));
      const mapped = startupsRes.data.map((s: any) => ({
        ...s,
        isSaved: savedIds.has(s.id)
      }));
      
      setStartups(mapped);
    } catch (err) {
      console.error('Failed to fetch startups:', err);
      toast.error('Could not load startups');
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (startupId: string) => {
    try {
      const res = await api.post(`/bookmarks/startup/toggle/${startupId}`);
      setStartups(prev => prev.map(s => 
        s.id === startupId ? { ...s, isSaved: res.data.saved } : s
      ));
      toast.success(res.data.saved ? 'Startup saved' : 'Removed from saved items');
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const industries = ['All', 'SaaS', 'Fintech', 'Healthtech', 'AI/ML', 'E-commerce', 'EdTech', 'CleanTech', 'Web3'];
  const stages = ['All', 'Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth'];

  const filteredStartups = startups.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.tagline.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === 'All' || (Array.isArray(s.industry) && s.industry.includes(selectedIndustry));
    const matchesStage = selectedStage === 'All' || s.stage === selectedStage;
    return matchesSearch && matchesIndustry && matchesStage;
  });

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-700">
      <div className="w-full max-w-4xl">
        {/* Header Mockup */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Rocket className="w-4 h-4" />
            Ecosystem Directory
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-gray-900 mb-6 tracking-tight">
            Discover the next <span className="text-orange-600">Unicorn.</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium">
            We're building the most comprehensive directory of startups, founders, and investors. Advanced filtering and AI matchmaking coming soon.
          </p>
        </div>

        {/* The Main Coming Soon Banner */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-purple-600 to-blue-600 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-white rounded-[36px] p-8 lg:p-12 border border-gray-100 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-6 transition-transform duration-500">
              <Sparkles className="w-10 h-10 text-orange-600" />
            </div>
            
            <h2 className="text-3xl lg:text-5xl font-black text-gray-900 mb-4">
              Coming Soon
            </h2>
            
            <div className="h-1.5 w-24 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full mb-8" />
            
            <p className="text-gray-600 text-lg max-w-lg leading-relaxed">
              Our team is currently verifying and indexing thousands of startups to provide you with high-quality data and insights.
            </p>
          </div>
        </div>

        {/* Basic Structure Mockup (Faded) */}
        <div className="mt-20 opacity-20 pointer-events-none select-none">
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 rounded-3xl h-48 border border-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
