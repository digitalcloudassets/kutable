import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { inAuthedApp } from '../../utils/appScope';

export default function AppShellToggle() {
  const { pathname } = useLocation();
  const { session } = useAuth();

  useEffect(() => {
    const on = !!session && inAuthedApp(pathname);
    document.body.classList.toggle('app-shell', on);
    return () => { document.body.classList.remove('app-shell'); };
  }, [pathname, session]);

  return null;
}