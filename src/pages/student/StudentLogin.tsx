import React, { useState, FC, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

// Import sendPasswordResetEmail from firebase
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';

export const StudentLogin: FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resetMessage, setResetMessage] = useState<string>(''); // State for the confirmation message

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setResetMessage(''); // Clear any previous reset messages

    if (!email || !password) {
      return setError('Please enter both email and password.');
    }

    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in successfully!');
      
      navigate('/student'); 

    } catch (err: any) {
      let friendlyError = "Failed to log in. Please check your credentials.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        friendlyError = "No account found with this email or password.";
      } else if (err.code === 'auth/wrong-password') {
        friendlyError = "Incorrect password. Please try again.";
      }
      console.error("Firebase login error:", err);
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle the password reset request
  const handleForgotPassword = async () => {
    setError('');
    setResetMessage('');

    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      let friendlyError = "Failed to send reset email. Please try again.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        friendlyError = "No account is associated with this email address.";
      }
      console.error("Password reset error:", err);
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-24 mb-2" />
          <h1 className="text-2xl font-bold text-[#0B1F8C]">MayPagasa</h1>
          <p className="text-gray-500 mt-1">Student Portal</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Login to your account
          </h2>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" 
                placeholder="Enter your email address" 
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" 
                  placeholder="Enter your password" 
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember" type="checkbox" className="h-4 w-4 text-[#0B1F8C] focus:ring-[#0B1F8C] border-gray-300 rounded" />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              {/* Updated to a button to trigger the handler */}
              <button 
                type="button" 
                onClick={handleForgotPassword} 
                className="text-sm text-[#0B1F8C] hover:underline focus:outline-none"
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
            
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            {resetMessage && <p className="text-sm text-green-600 text-center">{resetMessage}</p>}

            <button 
              type="submit" 
              className="w-full bg-[#0B1F8C] text-white py-2 px-4 rounded-lg hover:bg-blue-900 transition duration-200 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Login'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/student/register" className="text-[#0B1F8C] hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Are you an administrator?{' '}
              <Link to="/admin/login" className="text-[#0B1F8C] hover:underline font-medium">
                Login as Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};