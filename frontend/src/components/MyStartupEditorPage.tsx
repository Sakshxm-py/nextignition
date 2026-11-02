import { useEffect, useState } from 'react';
import { fetchOrCreateMyStartup } from '../services/startupService';
import { StartupProfilePage } from './StartupProfilePage';
import { ArrowLeft } from 'lucide-react';

export function MyStartupEditorPage() {
    const isExpanded = false; // simplified
    const [startupData, setStartupData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadStartup = async () => {
            try {
                setLoading(true);
                const data = await fetchOrCreateMyStartup();
                if (mounted) {
                    setStartupData(data);
                }
            } catch (err: any) {
                if (mounted) {
                    setError('Failed to load startup details. Please refresh or check your connection.');
                    console.error('Error fetching my startup:', err);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        loadStartup();
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <div className={`transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-20'} min-h-screen bg-gray-50 flex items-center justify-center`}>
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-600 font-medium">Preparing your startup workspace...</p>
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
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 font-bold text-white rounded-xl shadow-md transition-all"
                    >
                        Try Again
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
                <div className="font-bold text-lg text-gray-900">My Startup Editor</div>
            </div>
            
            <div className="flex-grow w-full flex min-h-0">
                <StartupProfilePage 
                    isOwnProfile={true} 
                    profileData={startupData}
                    startupId={startupData?.id || startupData?._id}
                    viewerType="founder"
                    defaultEditMode={window.location.hash.includes('edit=true') || startupData?.name === 'My New Startup' || !startupData?.name}
                />
            </div>
        </div>
    );
}
