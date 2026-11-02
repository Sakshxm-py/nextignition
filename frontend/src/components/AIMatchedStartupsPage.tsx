import { motion } from 'framer-motion';
import { Sparkles, Target, CheckCircle, XCircle, TrendingUp, Users, DollarSign, Calendar, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { brandColors } from '../utils/colors';

interface Client {
  id: number;
  name: string;
  startup: string;
  industry: string;
  stage: string;
  matchScore: number;
  status: 'pending' | 'active' | 'completed';
  description?: string;
  location?: string;
  teamSize?: number;
  monthlyRevenue?: string;
  lookingFor?: string;
}

interface AIMatchedStartupsPageProps {
  onBack: () => void;
}

export function AIMatchedStartupsPage({ onBack }: AIMatchedStartupsPageProps) {
  const [clients, setClients] = useState<Client[]>([]);

  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');

  const handleAccept = (clientId: number) => {
    setClients(prev => prev.map(client => 
      client.id === clientId ? { ...client, status: 'active' as const } : client
    ));
  };

  const handleDecline = (clientId: number) => {
    setClients(prev => prev.filter(client => client.id !== clientId));
  };

  const filteredClients = clients.filter(client => {
    if (filter === 'all') return client.status === 'pending';
    if (filter === 'high') return client.status === 'pending' && client.matchScore >= 90;
    if (filter === 'medium') return client.status === 'pending' && client.matchScore >= 85 && client.matchScore < 90;
    return true;
  });

  const stats = {
    total: clients.filter(c => c.status === 'pending').length,
    highMatch: clients.filter(c => c.status === 'pending' && c.matchScore >= 90).length,
    avgMatch: Math.round(clients.filter(c => c.status === 'pending').reduce((acc, c) => acc + c.matchScore, 0) / clients.filter(c => c.status === 'pending').length),
    accepted: clients.filter(c => c.status === 'active').length,
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">AI-Matched Startups</h1>
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-gray-600 mt-1">Startups that perfectly match your expertise</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-purple-500"
        >
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-purple-500" />
            <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Total Matches</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <span className="text-3xl font-bold text-gray-900">{stats.highMatch}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">High Match (90%+)</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-blue-500"
        >
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-8 h-8 text-blue-500" />
            <span className="text-3xl font-bold text-gray-900">{stats.avgMatch}%</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Avg Match Score</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-orange-500"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-orange-500" />
            <span className="text-3xl font-bold text-gray-900">{stats.accepted}</span>
          </div>
          <p className="text-sm text-gray-600 font-medium">Accepted Today</p>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Matches ({stats.total})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === 'high'
                ? 'bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            High Match ({stats.highMatch})
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === 'medium'
                ? 'bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Medium Match ({clients.filter(c => c.status === 'pending' && c.matchScore >= 85 && c.matchScore < 90).length})
          </button>
        </div>
      </div>

      {/* Startups Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredClients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{client.startup}</h3>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    client.matchScore >= 90 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {client.matchScore}% Match
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">{client.name}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-4 line-clamp-2">{client.description}</p>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{client.stage}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{client.teamSize} people</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{client.monthlyRevenue}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{client.location?.split(',')[0]}</span>
              </div>
            </div>

            {/* Industry Tag */}
            <div className="mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {client.industry}
              </span>
            </div>

            {/* Looking For */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-bold text-gray-700 mb-1">Looking For:</p>
              <p className="text-sm text-gray-600">{client.lookingFor}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleDecline(client.id)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
              <button 
                onClick={() => handleAccept(client.id)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Matches Found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You've reviewed all pending matches!"
              : `No ${filter === 'high' ? 'high' : 'medium'} match startups available.`
            }
          </p>
        </div>
      )}
    </div>
  );
}
