import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, BarChart, Users, LogOut, Menu, X } from 'lucide-react';
export function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [{
    icon: <LayoutDashboard size={20} />,
    label: 'Dashboard',
    path: '/admin'
  }, {
    icon: <ClipboardCheck size={20} />,
    label: 'Reports',
    path: '/admin/reports'
  }, {
    icon: <BarChart size={20} />,
    label: 'Analytics',
    path: '/admin/analytics'
  }, {
    icon: <Users size={20} />,
    label: 'Users',
    path: '/admin/users'
  }];
  return <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-10" />
            <div>
              <h1 className="font-bold text-[#0B1F8C]">MayPagAsa</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map(item => <li key={item.path}>
                <NavLink to={item.path} className={({
              isActive
            }) => isActive ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0B1F8C] text-white' : 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100'}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              </li>)}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-700 hover:bg-gray-100">
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
      <div className="flex flex-col flex-1">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-8" />
            <h1 className="font-bold text-[#0B1F8C]">MayPagAsa</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-700">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>
        {isMobileMenuOpen && <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="absolute top-0 left-0 w-64 h-full bg-white">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="https://dyci.edu.ph/assets/logo/dyci-logo.webp" alt="DYCI Logo" className="h-8" />
                  <div>
                    <h1 className="font-bold text-[#0B1F8C]">MayPagAsa</h1>
                    <p className="text-xs text-gray-500">Admin Portal</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>
              <nav className="p-4">
                <ul className="space-y-2">
                  {navItems.map(item => <li key={item.path}>
                      <NavLink to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={({
                  isActive
                }) => isActive ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0B1F8C] text-white' : 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100'}>
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    </li>)}
                </ul>
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-700 hover:bg-gray-100">
                  <LogOut size={20} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>;
}