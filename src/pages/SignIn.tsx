import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SignInForm } from '@/components/auth/SignInForm';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-6 flex justify-center">
      <SignInForm onSuccess={() => navigate('/')} />
    </div>
  );
};

export default SignIn;
