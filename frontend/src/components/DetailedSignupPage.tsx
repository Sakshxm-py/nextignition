import { DetailedSignupForm } from './DetailedSignupForm';
import { useEffect, useState } from 'react';

export function DetailedSignupPage() {
  const [selectedRoles, setSelectedRoles] = useState<Array<'founder' | 'expert' | 'investor'>>([]);
  const [userInfo, setUserInfo] = useState({ fullName: '', email: '' });

  useEffect(() => {
    // Get selected roles and basic info from sessionStorage
    const rolesData = sessionStorage.getItem('selectedRoles');
    const infoData = sessionStorage.getItem('userBasicInfo');
    
    try {
      if (rolesData) setSelectedRoles(JSON.parse(rolesData));
      if (infoData) setUserInfo(JSON.parse(infoData));
    } catch (e) {
      console.error('Failed to parse signup session data', e);
    }
  }, []);

  const handleComplete = () => {
    // Redirect to dashboard after signup is complete
    sessionStorage.removeItem('selectedRoles'); // Clean up
    sessionStorage.removeItem('userBasicInfo');
    window.location.hash = '#founder-dashboard';
  };

  if (selectedRoles.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please complete signup first</p>
        </div>
      </div>
    );
  }

  return <DetailedSignupForm selectedRoles={selectedRoles} userInfo={userInfo} onComplete={handleComplete} />;
}