import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  House,
  PlusCircle,
  Scales,
  UserCircle,
} from '@phosphor-icons/react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', to: '/', icon: House },
    { label: 'New Deal', to: '/deals/new', icon: PlusCircle },
    { label: 'Disputes', to: '/disputes', icon: Scales },
    { label: 'Profile', to: '/profile', icon: UserCircle },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-cream/95 backdrop-blur-none border-t border-border safe-bottom shadow-lg"
    >
      <div className="grid grid-cols-4 h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-h-[44px] gap-0.5 text-xs font-medium transition-colors focus-ring ${
                  isActive
                    ? 'text-ink font-semibold'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`p-1 rounded-md transition-all ${
                      isActive ? 'bg-green text-ink shadow-sm' : ''
                    }`}
                  >
                    <Icon size={20} weight={isActive ? 'bold' : 'regular'} />
                  </span>
                  <span className="leading-none text-[11px]">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
