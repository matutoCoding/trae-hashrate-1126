import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarPlus, Calendar, Package, FileText } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import type { TabType } from '@/types';

const tabConfig: { key: TabType; path: string; label: string; icon: typeof Home }[] = [
  { key: 'home', path: '/', label: '首页', icon: Home },
  { key: 'appointment', path: '/appointment', label: '预约', icon: CalendarPlus },
  { key: 'schedule', path: '/schedule', label: '排班', icon: Calendar },
  { key: 'supplies', path: '/supplies', label: '耗材', icon: Package },
  { key: 'records', path: '/records', label: '记录', icon: FileText },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveTab } = useAppStore();

  const currentPath = location.pathname.split('/')[1] || 'home';
  const activeKey = tabConfig.find((t) => t.path === `/${currentPath}`)?.key || 'home';

  const handleClick = (tab: typeof tabConfig[0]) => {
    setActiveTab(tab.key);
    navigate(tab.path);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-surface-100 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
      <div className="grid grid-cols-5">
        {tabConfig.map((tab) => {
          const isActive = activeKey === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleClick(tab)}
              className={`flex flex-col items-center justify-center py-2.5 transition-colors duration-200 ${
                isActive ? 'text-primary-600' : 'text-surface-500 hover:text-surface-700'
              }`}
            >
              <Icon
              className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
              strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
