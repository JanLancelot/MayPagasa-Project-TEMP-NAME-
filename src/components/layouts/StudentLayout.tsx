import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, Map, User, Menu, LogOut } from 'lucide-react';

import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

interface StudentData {
  fullName: string;
  studentId: string;
  email: string;
}

export function StudentLayout() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        const studentDocRef = doc(db, 'students', user.uid);
        const studentDocSnap = await getDoc(studentDocRef);

        if (studentDocSnap.exists()) {
          setStudentData(studentDocSnap.data() as StudentData);
        } else {
          console.error("No student data found for this user in Firestore!");
          setStudentData(null);
        }
      } else {
        setCurrentUser(null);
        setStudentData(null);
        navigate('/student/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/student/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { icon: <Home size={24} />, label: 'Home', path: '/student' },
    { icon: <AlertTriangle size={24} />, label: 'Report', path: '/student/report' },
    { icon: <Map size={24} />, label: 'Feed', path: '/student/feed' },
    { icon: <User size={24} />, label: 'Profile', path: '/student/profile' }
  ];

  const activeClass = 'flex flex-col items-center justify-center text-[#0B1F8C] font-medium';
  const inactiveClass = 'flex flex-col items-center justify-center text-gray-500';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-lg text-gray-600">Loading Session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="hidden md:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-10" />
          <h1 className="text-xl font-bold text-[#0B1F8C]">MayPagasa</h1>
        </div>
        <nav className="flex gap-6">
          {navItems.map(item => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              end
              className={({ isActive }) => 
                isActive 
                  ? 'flex items-center gap-2 text-[#0B1F8C] font-medium' 
                  : 'flex items-center gap-2 text-gray-500 hover:text-[#0B1F8C]'
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {studentData && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 font-medium">{studentData.fullName}</span>
                <div className="w-8 h-8 rounded-full bg-[#0B1F8C] text-white flex items-center justify-center font-bold">
                  {studentData.fullName?.charAt(0).toUpperCase()}
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 text-gray-500 hover:text-[#0B1F8C]" 
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </header>
      
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-8" />
          <h1 className="text-lg font-bold text-[#0B1F8C]">MayPagasa</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-1 text-gray-600"
        >
          <Menu size={24} />
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex flex-col">
            {navItems.map(item => (
              <NavLink 
                key={item.path} 
                to={item.path} 
                end
                onClick={() => setIsMobileMenuOpen(false)} 
                className={({ isActive }) => 
                  isActive 
                    ? 'flex items-center gap-3 py-2 text-[#0B1F8C] font-medium' 
                    : 'flex items-center gap-3 py-2 text-gray-600'
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button 
              onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} 
              className="flex items-center gap-3 py-2 text-red-600 border-t border-gray-100 mt-2 pt-3 w-full text-left"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <nav className="md:hidden flex items-center justify-around bg-white border-t border-gray-200 py-2 fixed bottom-0 w-full">
        {navItems.map(item => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            end
            className={({ isActive }) => isActive ? activeClass : inactiveClass}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
