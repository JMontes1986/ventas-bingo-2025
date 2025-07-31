'use client';

import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getPerformance } from 'firebase/performance';
import { firebaseConfig } from '@/lib/firebase';

export default function FirebaseInitializer() {
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    getPerformance(app);
  }, []);

  return null;
}
