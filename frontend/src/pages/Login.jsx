import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-background relative">
      <div className="w-full max-w-md flex justify-center">
        <SignIn signUpUrl="/register" forceRedirectUrl="/upload" />
      </div>
    </div>
  );
};

export default Login;
