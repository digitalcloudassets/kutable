import React, { useEffect } from 'react';
import { bindAuthScope } from '../lib/auth-scope';

export default function AppBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => { 
    console.log('Initializing auth scope binding...');
    bindAuthScope();
  }, []);
  
  return <>{children}</>;
}