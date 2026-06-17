import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Calendar as CalendarIcon } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { generateTimeSlots } from '@/utils/mock';
import PageHeader from '@/components/layout/PageHeader';
import type { Appointment } from '@/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function Schedule() {
  const navigate = useNavigate();
  const { appointments, stations } = useAppStore();
  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date(today));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);

  const monthDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean; aptCount: number }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d.toISOString().split('T')[0],
        day: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        aptCount: 0,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dt = new Date(year, month, d);
      const dateStr = dt.toISOString().split('T')[0];
      const isToday = dateStr === today.toISOString().split('T')[0];
      const aptCount = appointments.filter((a) => a.appointmentDate === dateStr && a.status !== 'cancelled').length;
      days.push({ date: dateStr, day: d, isCurrentMonth: true, isToday, aptCount });
    }

    while (days.length % 7 !== 0 || days.length < 42) {
      const last = days[days.length - 1];
      const dt = new Date(last.date);
      dt.setDate(dt.getDate() + 1);
      days.push({
        date: dt.toISOString().split('T')[0],
        day: dt.getDate(),
        isCurrentMonth: false,
        isToday: false,
        aptCount: 0,
      });
    }

    return days;
  }, [viewDate, appointments]);

  const selectedAppointments = useMemo(
    () => appointments.filter((a) => a.appointmentDate === selectedDate && a.status !== 'cancelled'),
    [appointments, selectedDate],
  );

  const distribution = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    stations.forEach((s) => map.set(s.id, []));
    selectedAppointments.forEach((a) => {
      const arr = map.get(a.stationId) || [];
      arr.push(a);
      map.set(a.stationId, arr);
    });
    return map;
  }, [selectedAppointments, stations]);

  const timeSlots = generateTimeSlots(selectedDate);

  const totalCapacity = stations.reduce((s, st) => s + st.capacity * timeSlots.length, 0);
  const totalApts = selectedAppointments.length;
  const occupancy = totalCapacity > 0 ? Math.round((totalApts / totalCapacity) * 100) : 0;

  const goPrev = () => {
    const nd = new Date(viewDate);
    if (viewMode === 'month') nd.setMonth(nd.getMonth() - 1);
    else nd.setDate(nd.getDate() - 7);
    setViewDate(nd);
  };

  const goNext = () => {
    const nd = new Date(viewDate);
    if (viewMode === 'month') nd.setMonth(nd.getMonth() + 1);
    else nd.setDate(nd.getDate() + 7);
    setViewDate(nd);
  };

  const monthTitle = `${viewDate.getFullYear()}年${viewDate.getMonth() + 1}月`;

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader title="排班日历" />

      <div className="p-4 space-y-4">
        {/* 概览卡 */}
        <div className="card bg-gradient-to-br from-secondary-600 to-secondary-800 text-white">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{totalApts}</div>
              <div className="text-sm text-white/70 mt-1">今日预约</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stations.length}</div>
              <div className="text-sm text-white/70 mt-1">采血位</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{occupancy}%</div>
              <div className="text-sm text-white/70 mt-1">占用率</div>
            </div>
          </div>
          <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, occupancy)}%` }}
            />
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex gap-2 p-1 bg-white rounded-xl shadow-card">
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === m ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600'
              }`}
            >
              {m === 'month' ? '月视图' : '周视图'}
            </button>
          ))}
        </div>

        {/* 日历头部 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <button onClick={goPrev} className="p-2 rounded-lg hover:bg-surface-50">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary-600" />
              {monthTitle}
            </h3>
            <button onClick={goNext} className="p-2 rounded-lg hover:bg-surface-50">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs text-surface-400 py-1.5 font-medium">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d) => {
              const isSelected = selectedDate === d.date;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-md'
                      : d.isCurrentMonth
                      ? d.isToday
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-surface-50 text-surface-700'
                      : 'text-surface-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${d.isToday && !isSelected ? 'text-primary-600' : ''}`}>
                    {d.day}
                  </span>
                  {d.aptCount > 0 && (
                    <span
                      className={`absolute bottom-1 text-[10px] px-1.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'
                      }`}
                    >
                      {d.aptCount > 9 ? '9+' : d.aptCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 选中日期详情 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary-600" />
            {selectedDate} 排班详情
          </h3>

          {selectedAppointments.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>该日暂无预约</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stations.map((station) => {
                const apts = distribution.get(station.id) || [];
                if (apts.length === 0) return null;
                return (
                  <div key={station.id} className="p-3 bg-surface-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        <span className="font-medium text-surface-800">{station.name}</span>
                        <span className={`tag ${
                          station.status === 'idle' ? 'tag-success' : station.status === 'occupied' ? 'tag-warning' : 'tag-default'
                        }`}>
                          {station.status === 'idle' ? '空闲' : station.status === 'occupied' ? '占用' : '维护'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-surface-500">
                        <Users className="w-3.5 h-3.5" />
                        {apts.length}人
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {apts.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => navigate(`/result/${apt.id}`)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-surface-200 text-surface-700 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                        >
                          {apt.timeRange.split(' ')[0]} · {apt.donorName}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 时间段占用情况 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3">时间段占用</h3>
          <div className="space-y-2">
            {timeSlots.slice(0, 6).map((slot) => {
              const used = slot.total - slot.available;
              const percent = (used / slot.total) * 100;
              const barColor = percent > 80 ? 'bg-primary-500' : percent > 50 ? 'bg-amber-500' : 'bg-secondary-500';
              return (
                <div key={slot.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-700">{slot.startTime} - {slot.endTime}</span>
                    <span className="text-surface-500">{used}/{slot.total}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-inner ${barColor}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
