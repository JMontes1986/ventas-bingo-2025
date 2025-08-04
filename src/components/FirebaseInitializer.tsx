'use client';

import { useEffect } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';
import { firebaseConfig } from '@/lib/firebase';

export default function FirebaseInitializer() {
  useEffect(() => {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    getPerformance(app);
  }, []);

  return null;
}
