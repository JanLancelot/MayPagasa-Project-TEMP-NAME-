import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
export function AdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-24 mb-2" />
          <h1 className="text-2xl font-bold text-[#0B1F8C]">MayPagasa</h1>
          <p className="text-gray-500 mt-1">Admin Portal</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <Lock size={24} className="text-[#0B1F8C]" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-800 mb-6">
            Admin Access
          </h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input id="username" type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" placeholder="Enter your username" />
            </div>
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input id="adminPassword" type={showPassword ? 'text' : 'password'} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#0B1F8C] focus:border-[#0B1F8C] outline-none" placeholder="Enter your password" />
                <button type="button" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="#" className="text-sm text-[#0B1F8C] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Link to="/admin">
              <button type="button" className="w-full bg-[#0B1F8C] text-white py-2 px-4 rounded-lg hover:bg-blue-900 transition duration-200">
                Login as Admin
              </button>
            </Link>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              <Link to="/student/login" className="text-[#0B1F8C] hover:underline font-medium">
                Go to Student Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>;
}