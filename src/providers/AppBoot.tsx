import React, { useEffect } from 'react';
import { bindAuthScope } from '../lib/auth-scope';

export default function AppBoot({ children }: { children: React.ReactNode }) {
  useEffect(() => { 
    bindAuthScope();
  }, []);
  
  return <>{children}</>;
}