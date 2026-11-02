import { useState } from 'react';
import DirectMessaging from '../components/DirectMessaging';

interface MessagingPageProps {
  initialUserId?: string;
}

export default function MessagingPage({ initialUserId }: MessagingPageProps) {
  return (
    <div className="h-[calc(100dvh-80px)] w-full">
      <DirectMessaging initialUserId={initialUserId} />
    </div>
  );
}
