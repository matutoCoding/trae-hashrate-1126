import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  LayoutGrid,
  CheckCircle2,
  PlayCircle,
  UserCheck,
  Hourglass,
  XCircle,
  X,
  Droplets,
  List,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getAvailableSlotCount, getSlotOccupancy } from '@/utils/allocation';
import PageHeader from '@/components/layout/PageHeader';
import type { Appointment, TimeSlot } from '@/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const TIME_SLOT_LIST = [
  { id: '0800', start: '08:00', end: '08:30' },
  { id: '0830', start: '08:30', end: '09:00' },
  { id: '0900', start: '09:00', end: '09:30' },
  { id: '0930', start: '09:30', end: '10:00' },
  { id: '1000', start: '10:00', end: '10:30' },
  { id: '1030', start: '10:30', end: '11:00' },
  { id: '1100', start: '11:00', end: '11:30' },
  { id: '1130', start: '11:30', end: '12:00' },
  { id: '1300', start: '13:00', end: '13:30' },
  { id: '1330', start: '13:30', end: '14:00' },
  { id: '1400', start: '14:00', end: '14:30' },
  { id: '1430', start: '14:30', end: '15:00' },
  { id: '1500', start: '15:00', end: '15:30' },
  { id: '1530', start: '15:30', end: '16:00' },
  { id: '1600', start: '16:00', end: '16:30' },
  { id: '1630', start: '16:30', end: '17:00' },
];

const STATUS_GROUPS = [
  { key: 'all', label: '全部', icon: List, color: 'text-surface-700', bg: 'bg-surface-100' },
  { key: 'pending', label: '待确认', icon: Hourglass, color: 'text-amber-700', bg: 'bg-amber-50' },
  { key: 'confirmed', label: '已预约', icon: CheckCircle2, color: 'text-secondary-700', bg: 'bg-secondary-50' },
  { key: 'checked-in', label: '已签到', icon: UserCheck, color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'collecting', label: '采血中', icon: PlayCircle, color: 'text-primary-700', bg: 'bg-primary-50' },
  { key: 'completed', label: '已完成', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
] as const;

const statusLabelMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已预约',
  'checked-in': '已签到',
  collecting: '采血中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusClassMap: Record<string, string> = {
  pending: 'tag-warning',
  confirmed: 'tag-info',
  'checked-in': 'tag-tag bg-blue-100 text-blue-700',
  collecting: 'tag-tag bg-primary-100 text-primary-700',
  completed: 'tag-success',
  cancelled: 'tag-default',
};

export default function Schedule() {
  const navigate = useNavigate();
  const {
    appointments,
    stations,
    checkInAppointment,
    startCollecting,
    completeAppointment,
    cancelAppointment,
  } = useAppStore();
  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date(today));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

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

  const queueList = useMemo(() => {
    if (queueFilter === 'all') return selectedAppointments;
    return selectedAppointments.filter((a) => a.status === queueFilter);
  }, [selectedAppointments, queueFilter]);

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

  const timeSlots = useMemo((): (TimeSlot & { used: number })[] => {
    return TIME_SLOT_LIST.map((tpl) => {
      const slotInfo = getSlotOccupancy(selectedDate, tpl.id, stations, appointments);
      return {
        id: tpl.id,
        startTime: tpl.start,
        endTime: tpl.end,
        available: slotInfo.total - slotInfo.used,
        total: slotInfo.total,
        used: slotInfo.used,
      };
    });
  }, [selectedDate, stations, appointments]);

  const selectedSlotData = useMemo(() => {
    if (!selectedSlot) return null;
    return getSlotOccupancy(selectedDate, selectedSlot, stations, appointments);
  }, [selectedSlot, selectedDate, stations, appointments]);

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

  const handleCheckIn = (id: string) => {
    checkInAppointment(id);
    const apt = appointments.find((a) => a.id === id);
    if (apt) setSelectedApt({ ...apt, status: 'checked-in' });
  };

  const handleStartCollecting = (id: string) => {
    startCollecting(id);
    const apt = appointments.find((a) => a.id === id);
    if (apt) setSelectedApt({ ...apt, status: 'collecting' });
  };

  const handleComplete = (id: string) => {
    completeAppointment(id);
    const apt = appointments.find((a) => a.id === id);
    if (apt) setSelectedApt({ ...apt, status: 'completed' });
  };

  const handleCancel = (id: string) => {
    cancelAppointment(id);
    setSelectedApt(null);
  };

  const monthTitle = `${viewDate.getFullYear()}年${viewDate.getMonth() + 1}月`;

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader
        title="排班日历"
        right={
          <button
            onClick={() => navigate('/stations')}
            className="flex items-center gap-1 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            采血位
          </button>
        }
      />

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

        {/* 现场队列 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary-600" />
            当天队列
          </h3>
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
            {STATUS_GROUPS.map((g) => {
              const count = g.key === 'all'
                ? selectedAppointments.length
                : selectedAppointments.filter((a) => a.status === g.key).length;
              const active = queueFilter === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => setQueueFilter(g.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    active
                      ? `${g.bg} ${g.color} ring-1 ring-current`
                      : 'bg-surface-50 text-surface-500 hover:bg-surface-100'
                  }`}
                >
                  <g.icon className="w-3.5 h-3.5" />
                  {g.label}
                  <span className="px-1.5 py-0.5 text-[10px] bg-white/60 rounded-full">{count}</span>
                </button>
              );
            })}
          </div>

          {queueList.length === 0 ? (
            <div className="text-center py-6 text-surface-400 text-sm">
              该分类下暂无预约
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueList
                .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                .map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => setSelectedApt(apt)}
                    className="w-full p-3 bg-surface-50 rounded-xl text-left hover:bg-surface-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-surface-400" />
                        <span className="text-sm font-medium text-surface-800">{apt.timeRange}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusClassMap[apt.status] || 'tag-default'}`}>
                          {statusLabelMap[apt.status] || apt.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-surface-500">
                      <span>{apt.donorName} · {apt.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {apt.stationName}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 时间段占用情况 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3">时间段占用</h3>
          <div className="space-y-2">
            {timeSlots.map((slot) => {
              const percent = slot.total > 0 ? (slot.used / slot.total) * 100 : 0;
              const barColor =
                percent > 80 ? 'bg-primary-500' : percent > 50 ? 'bg-amber-500' : 'bg-secondary-500';
              return (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-surface-50 transition-colors"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-700">{slot.startTime} - {slot.endTime}</span>
                    <span className="text-surface-500">{slot.used}/{slot.total}人</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-inner ${barColor}`} style={{ width: `${percent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 按采血位分布 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            采血位分布
          </h3>
          {selectedAppointments.length === 0 ? (
            <div className="text-center py-6 text-surface-400 text-sm">
              该日暂无预约
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
                          onClick={() => setSelectedApt(apt)}
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
      </div>

      {/* 时间段详情弹窗 */}
      {selectedSlot && selectedSlotData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[70vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">
                  {TIME_SLOT_LIST.find((t) => t.id === selectedSlot)?.start} -{' '}
                  {TIME_SLOT_LIST.find((t) => t.id === selectedSlot)?.end}
                </h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  已预约 {selectedSlotData.used} / {selectedSlotData.total} 人
                </p>
              </div>
              <button onClick={() => setSelectedSlot(null)} className="p-2 rounded-full hover:bg-surface-50">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedSlotData.appointments.length === 0 ? (
                <div className="text-center py-8 text-surface-400">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>该时段暂无预约</p>
                </div>
              ) : (
                selectedSlotData.appointments
                  .sort((a, b) => a.stationName.localeCompare(b.stationName))
                  .map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => {
                        setSelectedApt(apt);
                        setSelectedSlot(null);
                      }}
                      className="w-full p-3 bg-surface-50 rounded-xl text-left hover:bg-surface-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-surface-800">{apt.donorName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClassMap[apt.status] || 'tag-default'}`}>
                          {statusLabelMap[apt.status] || apt.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-surface-500">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          {apt.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {apt.stationName}
                        </span>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 预约详情弹窗 */}
      {selectedApt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <h3 className="text-lg font-semibold text-surface-900">预约详情</h3>
              <button onClick={() => setSelectedApt(null)} className="p-2 rounded-full hover:bg-surface-50">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-surface-900">{selectedApt.donorName}</div>
                  <div className="text-sm text-surface-500 mt-0.5">
                    {selectedApt.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClassMap[selectedApt.status] || 'tag-default'}`}>
                  {statusLabelMap[selectedApt.status] || selectedApt.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-50 rounded-xl">
                  <div className="text-xs text-surface-500 mb-1">采血位</div>
                  <div className="text-sm font-medium text-surface-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary-600" />
                    {selectedApt.stationName}
                  </div>
                </div>
                <div className="p-3 bg-surface-50 rounded-xl">
                  <div className="text-xs text-surface-500 mb-1">预约时段</div>
                  <div className="text-sm font-medium text-surface-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-secondary-600" />
                    {selectedApt.timeRange}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-50 rounded-xl">
                <div className="text-xs text-surface-500 mb-1">预约编号</div>
                <div className="text-sm font-mono text-surface-800">{selectedApt.id.toUpperCase()}</div>
              </div>

              <div className="p-3 bg-surface-50 rounded-xl">
                <div className="text-xs text-surface-500 mb-1">手机号</div>
                <div className="text-sm text-surface-800">{selectedApt.phone}</div>
              </div>
            </div>

            <div className="p-5 border-t border-surface-100 space-y-2">
              {selectedApt.status === 'confirmed' || selectedApt.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleCheckIn(selectedApt.id)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    确认签到
                  </button>
                  <button
                    onClick={() => handleCancel(selectedApt.id)}
                    className="w-full btn-secondary text-surface-500"
                  >
                    取消预约
                  </button>
                </>
              ) : null}

              {selectedApt.status === 'checked-in' ? (
                <button
                  onClick={() => handleStartCollecting(selectedApt.id)}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" />
                  开始采血
                </button>
              ) : null}

              {selectedApt.status === 'collecting' ? (
                <button
                  onClick={() => {
                    handleComplete(selectedApt.id);
                    setSelectedApt(null);
                    navigate(`/result/${selectedApt.id}`);
                  }}
                  className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  完成采血
                </button>
              ) : null}

              {selectedApt.status === 'completed' ? (
                <button
                  onClick={() => {
                    setSelectedApt(null);
                    navigate(`/result/${selectedApt.id}`);
                  }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  查看详情
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
