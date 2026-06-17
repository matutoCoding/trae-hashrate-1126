import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function PageHeader({ title, showBack = false, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-surface-100">
      <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-surface-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-surface-700" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-surface-900">{title}</h1>
        </div>
        <div className="flex items-center">{right}</div>
      </div>
    </header>
  );
}
