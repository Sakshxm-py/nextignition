import { useEffect, useState } from 'react';
import { getStartupById } from '../services/startupService';
import { StartupProfilePage } from './StartupProfilePage';
import { getCurrentUser } from '../services/authService';
import { ArrowLeft } from 'lucide-react';

export function StartupPublicPage() {
    const isExpanded = false;
    const [startupData, setStartupData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const currentUser = getCurrentUser();

    // Extract ID from URL hash (#startup/:id)
    const startupId = (window.location.hash || '').replace('#', '').replace('startup/', '');

    useEffect(() => {
        let mounted = true;
        
        if (!startupId || startupId === 'startup') {
            setLoading(false);
            setError('Startup ID is missing from the URL.');
            return;
        }

        const loadStartup = async () => {
            try {
                setLoading(true);
                const data = await getStartupById(startupId);
                if (mounted) {
                    setStartupData(data);
                }
            } catch (err: any) {
                if (mounted) {
                    setError('Failed to load startup details. The startup might not exist or may have been removed.');
                    console.error('Error fetching startup:', err);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        loadStartup();
        return () => { mounted = false; };
    }, [startupId]);

    if (loading) {
        return (
            <div className={`transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'} min-h-screen bg-gray-50 flex items-center justify-center`}>
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading Startup Profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'} min-h-screen bg-gray-50 flex items-center justify-center p-6`}>
                 <div className="max-w-xl w-full rounded-2xl bg-white border border-red-200 p-8 text-center text-slate-900 shadow-xl">
                    <div className="text-xl font-bold text-red-600 mb-2">Oops! Something went wrong</div>
                    <div className="text-sm text-slate-700 mb-6">{error}</div>
                    <button
                        onClick={() => window.location.hash = '#home'}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-xl shadow-md transition-all"
                    >
                        Return Home
                    </button>
                 </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Safe Header */}
            <div className="sticky top-0 z-50 bg-white shadow-sm border-b px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 flex items-center flex-shrink-0">
                <button onClick={() => window.history.back()} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
                   <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div className="font-bold text-lg text-gray-900">Startup Profile</div>
            </div>
            
            <div className="flex-grow w-full flex min-h-0">
                <StartupProfilePage 
                    isOwnProfile={currentUser && (
                        currentUser.id === startupData?.founder || 
                        currentUser._id === startupData?.founder || 
                        currentUser.id === startupData?.data?.founder || 
                        currentUser._id === startupData?.data?.founder
                    )} 
                    profileData={startupData}
                    startupId={startupId}
                    viewerType={currentUser?.role || 'investor'}
                />
            </div>
        </div>
    );
}
