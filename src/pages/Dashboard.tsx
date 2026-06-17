import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Calendar, Package, Droplets, MapPin, AlertTriangle, Heart, Clock } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSupplyStore } from '@/store/supplyStore';
import { validateDonationInterval } from '@/utils/validation';
import PageHeader from '@/components/layout/PageHeader';

export default function Dashboard() {
  const navigate = useNavigate();
  const { appointments, donor, donationRecords } = useAppStore();
  const { batches, getLowStockBatches } = useSupplyStore();

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayApts = appointments.filter((a) => a.appointmentDate === today);
    const completed = todayApts.filter((a) => a.status === 'completed').length;
    const pending = todayApts.filter((a) => a.status === 'pending' || a.status === 'confirmed').length;
    const lowStock = getLowStockBatches().length;
    const totalRemaining = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
    return { todayTotal: todayApts.length, completed, pending, lowStock, totalRemaining };
  }, [appointments, today, batches, getLowStockBatches]);

  const intervalCheck = useMemo(() => {
    const lastRecord = donationRecords.length > 0
      ? [...donationRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    return validateDonationInterval(
      lastRecord?.date || donor.lastDonationDate,
      lastRecord?.type || donor.donationType,
      'whole',
      today,
    );
  }, [donor, donationRecords, today]);

  const recentAppointments = useMemo(
    () => appointments.filter((a) => a.appointmentDate >= today).slice(0, 3),
    [appointments, today],
  );

  const statCards = [
    { label: '今日预约', value: stats.todayTotal, icon: Calendar, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: '已完成', value: stats.completed, icon: Droplets, color: 'text-secondary-700', bg: 'bg-secondary-50' },
    { label: '待采血', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '库存预警', value: stats.lowStock, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const quickActions = [
    { label: '立即预约', icon: CalendarPlus, path: '/appointment', color: 'bg-gradient-to-br from-primary-500 to-primary-700' },
    { label: '排班查看', icon: Calendar, path: '/schedule', color: 'bg-gradient-to-br from-secondary-600 to-secondary-800' },
    { label: '耗材管理', icon: Package, path: '/supplies', color: 'bg-gradient-to-br from-violet-500 to-violet-700' },
    { label: '剩余追踪', icon: Heart, path: '/tracking', color: 'bg-gradient-to-br from-rose-500 to-rose-700' },
  ];

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader title="采血车智能排班" />

      <div className="p-4 space-y-4">
        {/* 用户欢迎卡 */}
        <div className="card bg-gradient-to-br from-primary-600 via-primary-500 to-rose-500 text-white overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">欢迎献血者</p>
                <h2 className="text-2xl font-bold mt-1">{donor.name}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5">
                    <Droplets className="w-3.5 h-3.5" />
                    {donor.bloodType !== 'unknown' ? `${donor.bloodType}型` : '血型未知'}
                  </span>
                  <span className="text-white/90">已献血 {donationRecords.length} 次</span>
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-8 h-8 animate-pulse-soft" fill="currentColor" />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white/15 backdrop-blur">
              {intervalCheck.valid ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse-soft" />
                  <span className="text-sm">献血间隔校验通过，可预约献血</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    距下次可献血还需 <strong>{intervalCheck.daysRemaining}</strong> 天
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 数据统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="card card-hover animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <span className="text-3xl font-bold text-surface-900 animate-count-up">{s.value}</span>
                </div>
                <p className="text-sm text-surface-500 mt-2">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* 快捷操作 */}
        <div>
          <h3 className="text-base font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary-600 rounded-full" />
            快捷操作
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 active:scale-95 animate-slide-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className={`w-12 h-12 rounded-2xl ${action.color} text-white flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-surface-700">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 近期预约 */}
        {recentAppointments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-surface-800 flex items-center gap-2">
                <span className="w-1 h-4 bg-secondary-600 rounded-full" />
                近期预约
              </h3>
              <button onClick={() => navigate('/records')} className="text-sm text-primary-600">
                全部
              </button>
            </div>
            <div className="space-y-3">
              {recentAppointments.map((apt, idx) => (
                <div
                  key={apt.id}
                  className="card card-hover animate-slide-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onClick={() => navigate(`/result/${apt.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`tag ${
                            apt.status === 'completed'
                              ? 'tag-success'
                              : apt.status === 'confirmed'
                              ? 'tag-warning'
                              : apt.status === 'cancelled'
                              ? 'tag-default'
                              : 'tag-danger'
                          }`}
                        >
                          {apt.status === 'completed' && '已完成'}
                          {apt.status === 'confirmed' && '已确认'}
                          {apt.status === 'pending' && '待确认'}
                          {apt.status === 'cancelled' && '已取消'}
                        </span>
                        <span className="text-sm font-medium text-surface-800">{apt.stationName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-surface-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {apt.appointmentDate}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {apt.timeRange}
                        </span>
                      </div>
                    </div>
                    <MapPin className="w-5 h-5 text-surface-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 库存预警提示 */}
        {stats.lowStock > 0 && (
          <div className="card bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-800">耗材库存预警</h4>
                <p className="text-sm text-amber-700 mt-1">
                  共 {stats.lowStock} 种耗材库存不足，请及时补充。点击查看详情 →
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
