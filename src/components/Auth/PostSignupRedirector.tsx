import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function PostSignupRedirector() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const next = localStorage.getItem('kutable:postSignup');
    if (next) {
      localStorage.removeItem('kutable:postSignup');
      navigate(next, { replace: true });
    }
  }, [user, navigate]);

  return null;
}