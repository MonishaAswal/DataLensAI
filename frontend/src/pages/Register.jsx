import React from 'react';
import { SignUp } from '@clerk/clerk-react';

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-background relative">
      <div className="w-full max-w-md flex justify-center">
        <SignUp signInUrl="/login" forceRedirectUrl="/upload" />
      </div>
    </div>
  );
};

export default Register;
