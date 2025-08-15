import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chooseDashboard } from '../utils/appScope';
import HomePage from '../pages/HomePage';

export default function HomeGate() {
  const { session } = useAuth();
  if (session) return <Navigate replace to={chooseDashboard(session)} />;
  return <HomePage />;
}