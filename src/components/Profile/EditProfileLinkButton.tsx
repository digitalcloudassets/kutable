import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pencil } from 'lucide-react';

type Props = {
  className?: string;
  children?: React.ReactNode; // default label provided
};

export default function EditProfileLinkButton({ className, children }: Props) {
  const { pathname } = useLocation();
  const base = pathname.startsWith('/dashboard/barber') ? '/dashboard/barber' : '/dashboard/barber';
  return (
    <Link
      to={`${base}/profile?edit=1`}
      className={className ?? 'inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold shadow-sm hover:bg-blue-700'}
    >
      <Pencil className="mr-2 h-5 w-5" />
      {children ?? 'Edit Profile'}
    </Link>
  );
}