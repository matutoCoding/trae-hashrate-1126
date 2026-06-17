import { useState, useMemo, useEffect } from 'react';
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
  Volume2,
  Mic,
  AlertTriangle,
  RefreshCw,
  UserX,
  CalendarPlus2,
  FileSpreadsheet,
  LogOut,
  Package,
  PhoneMissed,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSupplyStore } from '@/store/supplyStore';
import { getAvailableSlotCount, getSlotOccupancy } from '@/utils/allocation';
import PageHeader from '@/components/layout/PageHeader';
import type { Appointment, TimeSlot, SupplyType } from '@/types';
import { supplyTypeMap } from '@/utils/mock';

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
  { key: 'called', label: '叫号中', icon: Mic, color: 'text-red-700', bg: 'bg-red-50' },
  { key: 'checked-in', label: '已签到', icon: UserCheck, color: 'text-blue-700', bg: 'bg-blue-50' },
  { key: 'collecting', label: '采血中', icon: PlayCircle, color: 'text-primary-700', bg: 'bg-primary-50' },
  { key: 'completed', label: '已完成', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'missed', label: '过号', icon: PhoneMissed, color: 'text-orange-700', bg: 'bg-orange-50' },
  { key: 'abnormal', label: '异常', icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
] as const;

const ABNORMAL_STATUSES = new Set(['deferred', 'rescheduled', 'no-show']);

const statusLabelMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已预约',
  'checked-in': '已签到',
  called: '叫号中',
  collecting: '采血中',
  completed: '已完成',
  deferred: '暂缓',
  rescheduled: '改约',
  'no-show': '未到场',
  missed: '过号',
  cancelled: '已取消',
};

const statusClassMap: Record<string, string> = {
  pending: 'tag-warning',
  confirmed: 'tag-info',
  'checked-in': 'bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full',
  called: 'bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full animate-pulse',
  collecting: 'bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full',
  completed: 'tag-success',
  deferred: 'bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full',
  rescheduled: 'bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full',
  'no-show': 'bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full',
  missed: 'bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full',
  cancelled: 'tag-default',
};

interface SupplyItem {
  batchId: string;
  supplyType: SupplyType;
  quantity: number;
}

export default function Schedule() {
  const navigate = useNavigate();
  const {
    appointments,
    stations,
    checkInAppointment,
    startCollecting,
    completeAppointment,
    cancelAppointment,
    callNextAppointment,
    recallAppointment,
    markMissed,
    markDeferred,
    markRescheduled,
    markNoShow,
    getCurrentCalled,
    getWaitingQueue,
    getMissedQueue,
  } = useAppStore();
  const { batches, getRecommendedBatch, validateSupplyRequest, splitOutbound } = useSupplyStore();
  const today = new Date();

  const [viewDate, setViewDate] = useState(new Date(today));
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [showAbnormalModal, setShowAbnormalModal] = useState(false);
  const [abnormalType, setAbnormalType] = useState<'deferred' | 'rescheduled' | 'no-show'>('deferred');
  const [abnormalReason, setAbnormalReason] = useState('');
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [supplyErrors, setSupplyErrors] = useState<string[]>([]);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [expandedStations, setExpandedStations] = useState<Set<string>>(new Set());

  const currentCalled = getCurrentCalled(selectedDate);
  const waitingQueue = getWaitingQueue(selectedDate);
  const missedQueue = getMissedQueue(selectedDate);

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
      const aptCount = appointments.filter(
        (a) => a.appointmentDate === dateStr && a.status !== 'cancelled',
      ).length;
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
    if (queueFilter === 'abnormal')
      return selectedAppointments.filter((a) => ABNORMAL_STATUSES.has(a.status));
    if (queueFilter === 'missed') return selectedAppointments.filter((a) => a.callStatus === 'missed');
    return selectedAppointments.filter((a) => a.status === queueFilter);
  }, [selectedAppointments, queueFilter]);

  const distribution = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    stations.forEach((s) => (map[s.id] = []));
    selectedAppointments.forEach((a) => {
      if (map[a.stationId]) map[a.stationId].push(a);
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

  const availableBatches = useMemo(
    () => batches.filter((b) => b.remainingQuantity > 0),
    [batches],
  );

  const groupedBatches = useMemo(() => {
    const map: Record<string, typeof batches> = {};
    availableBatches.forEach((b) => {
      if (!map[b.supplyType]) map[b.supplyType] = [];
      map[b.supplyType].push(b);
    });
    return map;
  }, [availableBatches]);

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

  const openSupplyModal = () => {
    if (!selectedApt) return;
    const items: SupplyItem[] = [];
    Object.entries(groupedBatches).forEach(([type, batchList]) => {
      if (batchList.length > 0) {
        const defaultQty = type === 'tube' ? 4 : type === 'swab' ? 2 : 1;
        const rec = getRecommendedBatch(type as SupplyType, defaultQty);
        items.push({
          batchId: rec.batch ? rec.batch.id : batchList[0].id,
          supplyType: type as SupplyType,
          quantity: Math.min(defaultQty, rec.batch ? rec.batch.remainingQuantity : batchList[0].remainingQuantity),
        });
      }
    });
    setSupplyItems(items);
    setSupplyErrors([]);
    setShowSupplyModal(true);
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setSupplyItems((items) => {
      const next = [...items];
      const item = { ...next[index] };
      const batch = batches.find((b) => b.id === item.batchId);
      const maxQty = batch?.remainingQuantity || 0;
      item.quantity = Math.max(0, Math.min(maxQty, item.quantity + delta));
      next[index] = item;
      return next;
    });
  };

  const handleBatchChange = (index: number, batchId: string) => {
    setSupplyItems((items) => {
      const next = [...items];
      const batch = batches.find((b) => b.id === batchId);
      next[index] = { ...next[index], batchId, quantity: Math.min(next[index].quantity, batch?.remainingQuantity || 0) };
      return next;
    });
  };

  const handleCompleteWithSupply = () => {
    if (!selectedApt) return;
    const result = validateSupplyRequest(supplyItems);
    if (!result.valid) {
      setSupplyErrors(result.errors.map((e) => e.message));
      return;
    }

    const usageIds: string[] = [];
    supplyItems.forEach((item) => {
      const batch = batches.find((b) => b.id === item.batchId);
      if (batch && item.quantity > 0) {
        const usage = splitOutbound(
          item.batchId,
          item.quantity,
          selectedApt.id,
          selectedApt.donorName,
          '采血使用',
          selectedApt.stationId,
          selectedApt.stationName,
          item.supplyType,
          supplyTypeMap[item.supplyType]?.name || item.supplyType,
        );
        if (usage) usageIds.push(usage.id);
      }
    });

    completeAppointment(selectedApt.id);
    useAppStore.getState().updateAppointment(selectedApt.id, { supplyUsages: usageIds });
    setShowSupplyModal(false);
    setSelectedApt(null);
    navigate(`/result/${selectedApt.id}`);
  };

  const handleCancel = (id: string) => {
    cancelAppointment(id);
    setSelectedApt(null);
  };

  const handleAbnormal = () => {
    if (!selectedApt) return;
    const reason = abnormalReason.trim() || '未填写';
    if (abnormalType === 'deferred') markDeferred(selectedApt.id, reason);
    else if (abnormalType === 'rescheduled') markRescheduled(selectedApt.id, reason);
    else markNoShow(selectedApt.id, reason);
    setShowAbnormalModal(false);
    setAbnormalReason('');
    const apt = appointments.find((a) => a.id === selectedApt.id);
    if (apt) setSelectedApt({ ...apt, status: abnormalType });
  };

  const toggleStation = (id: string) => {
    setExpandedStations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const monthTitle = `${viewDate.getFullYear()}年${viewDate.getMonth() + 1}月`;

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader
        title="排班日历"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDailySummary(true)}
              className="flex items-center gap-1 text-sm text-secondary-600 font-medium hover:text-secondary-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              日结
            </button>
            <button
              onClick={() => navigate('/stations')}
              className="flex items-center gap-1 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              采血位
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* 叫号看板 */}
        <div className="card bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                现场叫号看板
              </h3>
              <button
                onClick={() => {
                  const next = callNextAppointment(selectedDate);
                }}
                className="px-4 py-2 rounded-xl bg-white text-primary-700 font-medium text-sm hover:bg-primary-50 transition-colors shadow-lg flex items-center gap-1.5"
              >
                <Mic className="w-4 h-4" />
                呼叫下一位
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
                <div className="text-4xl font-bold mb-1">
                  {currentCalled ? String(currentCalled.queueNumber || 0).padStart(3, '0') : '---'}
                </div>
                <div className="text-xs text-white/70">当前叫号</div>
                {currentCalled && (
                  <div className="text-xs mt-1 text-white/90">{currentCalled.donorName}</div>
                )}
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
                <div className="text-4xl font-bold mb-1 text-secondary-200">{waitingQueue.length}</div>
                <div className="text-xs text-white/70">等待中</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
                <div className="text-4xl font-bold mb-1 text-amber-200">{missedQueue.length}</div>
                <div className="text-xs text-white/70">过号</div>
              </div>
            </div>

            {currentCalled && (
              <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{currentCalled.donorName}</div>
                    <div className="text-xs text-white/70 mt-0.5">
                      {currentCalled.stationName} · {currentCalled.timeRange}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => recallAppointment(currentCalled.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/80 text-xs font-medium hover:bg-amber-500 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      重呼
                    </button>
                    <button
                      onClick={() => markMissed(currentCalled.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/20 text-xs font-medium hover:bg-white/30 transition-colors flex items-center gap-1"
                    >
                      <PhoneMissed className="w-3.5 h-3.5" />
                      过号
                    </button>
                  </div>
                </div>
              </div>
            )}

            {missedQueue.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {missedQueue.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl px-3 py-2 text-sm"
                  >
                    <span>
                      {String(apt.queueNumber || 0).padStart(3, '0')} · {apt.donorName}
                    </span>
                    <button
                      onClick={() => recallAppointment(apt.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-secondary-400/80 hover:bg-secondary-400 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      重呼
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
              let count = 0;
              if (g.key === 'all') count = selectedAppointments.length;
              else if (g.key === 'missed')
                count = selectedAppointments.filter((a) => a.callStatus === 'missed').length;
              else if (g.key === 'abnormal')
                count = selectedAppointments.filter((a) => ABNORMAL_STATUSES.has(a.status)).length;
              else count = selectedAppointments.filter((a) => a.status === g.key).length;

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
            <div className="text-center py-6 text-surface-400 text-sm">该分类下暂无预约</div>
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
                        {apt.queueNumber && (
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                            No.{String(apt.queueNumber).padStart(3, '0')}
                          </span>
                        )}
                        <Clock className="w-3.5 h-3.5 text-surface-400" />
                        <span className="text-sm font-medium text-surface-800">{apt.timeRange}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${statusClassMap[apt.status] || 'tag-default'}`}
                        >
                          {statusLabelMap[apt.status] || apt.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-surface-500 mt-1">
                      <span>
                        {apt.donorName} · {apt.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {apt.stationName}
                      </span>
                    </div>
                    {apt.remark && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1.5 bg-amber-50 rounded-lg px-2 py-1">
                        <AlertTriangle className="w-3 h-3" />
                        {apt.remark}
                      </div>
                    )}
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
                    <span className="text-surface-700">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <span className="text-surface-500">
                      {slot.used}/{slot.total}人
                    </span>
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
            <div className="text-center py-6 text-surface-400 text-sm">该日暂无预约</div>
          ) : (
            <div className="space-y-2">
              {stations.map((station) => {
                const apts = distribution[station.id] || [];
                if (apts.length === 0) return null;
                const isOpen = expandedStations.has(station.id);
                return (
                  <div key={station.id} className="bg-surface-50 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleStation(station.id)}
                      className="w-full flex items-center justify-between p-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        <span className="font-medium text-surface-800">{station.name}</span>
                        <span
                          className={`tag ${
                            station.status === 'idle'
                              ? 'tag-success'
                              : station.status === 'occupied'
                              ? 'tag-warning'
                              : 'tag-default'
                          }`}
                        >
                          {station.status === 'idle' ? '空闲' : station.status === 'occupied' ? '占用' : '维护'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-surface-500">
                        <Users className="w-3.5 h-3.5" />
                        {apts.length}人
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-surface-100">
                        {(() => {
                          const bySlot: Record<string, Appointment[]> = {};
                          apts.forEach((a) => {
                            if (!bySlot[a.timeSlot]) bySlot[a.timeSlot] = [];
                            bySlot[a.timeSlot].push(a);
                          });
                          return Object.keys(bySlot)
                            .sort()
                            .map((slotId) => (
                              <div key={slotId} className="mt-2">
                                <div className="text-xs text-surface-400 mb-1">
                                  {TIME_SLOT_LIST.find((t) => t.id === slotId)?.start} -{' '}
                                  {TIME_SLOT_LIST.find((t) => t.id === slotId)?.end}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {bySlot[slotId].map((apt) => (
                                    <button
                                      key={apt.id}
                                      onClick={() => setSelectedApt(apt)}
                                      className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-surface-200 text-surface-700 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                                    >
                                      {apt.donorName}
                                      <span
                                        className={`ml-1.5 text-[10px] px-1 py-0.5 rounded-full ${statusClassMap[apt.status] || 'tag-default'}`}
                                      >
                                        {statusLabelMap[apt.status] || apt.status}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ));
                        })()}
                      </div>
                    )}
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${statusClassMap[apt.status] || 'tag-default'}`}
                        >
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
      {selectedApt && !showAbnormalModal && !showSupplyModal && (
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
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusClassMap[selectedApt.status] || 'tag-default'}`}
                >
                  {statusLabelMap[selectedApt.status] || selectedApt.status}
                </span>
              </div>

              {selectedApt.queueNumber && (
                <div className="p-3 bg-primary-50 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-primary-700">排队号</span>
                  <span className="text-lg font-bold text-primary-700">
                    No.{String(selectedApt.queueNumber).padStart(3, '0')}
                  </span>
                </div>
              )}

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

              {selectedApt.remark && (
                <div className="p-3 bg-amber-50 rounded-xl flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-amber-600 mb-0.5">异常备注</div>
                    <div className="text-sm text-amber-800">{selectedApt.remark}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-surface-100 space-y-2">
              {(selectedApt.status === 'confirmed' || selectedApt.status === 'pending') && (
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
              )}

              {selectedApt.status === 'checked-in' && (
                <>
                  <button
                    onClick={() => handleStartCollecting(selectedApt.id)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    开始采血
                  </button>
                  <button
                    onClick={() => {
                      setAbnormalType('no-show');
                      setShowAbnormalModal(true);
                    }}
                    className="w-full btn-secondary text-orange-600 flex items-center justify-center gap-2"
                  >
                    <UserX className="w-4 h-4" />
                    标记未到场
                  </button>
                </>
              )}

              {selectedApt.status === 'called' && (
                <>
                  <button
                    onClick={() => handleStartCollecting(selectedApt.id)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    确认到场，开始采血
                  </button>
                  <button
                    onClick={() => markMissed(selectedApt.id)}
                    className="w-full btn-secondary text-orange-600 flex items-center justify-center gap-2"
                  >
                    <PhoneMissed className="w-4 h-4" />
                    标记过号
                  </button>
                </>
              )}

              {selectedApt.status === 'collecting' && (
                <>
                  <button
                    onClick={openSupplyModal}
                    className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    完成采血 · 登记耗材
                  </button>
                  <button
                    onClick={() => {
                      setAbnormalType('deferred');
                      setShowAbnormalModal(true);
                    }}
                    className="w-full btn-secondary text-amber-600 flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    标记暂缓
                  </button>
                  <button
                    onClick={() => {
                      setAbnormalType('rescheduled');
                      setShowAbnormalModal(true);
                    }}
                    className="w-full btn-secondary text-violet-600 flex items-center justify-center gap-2"
                  >
                    <CalendarPlus2 className="w-4 h-4" />
                    改约其他时间
                  </button>
                </>
              )}

              {(selectedApt.status === 'completed' ||
                selectedApt.status === 'deferred' ||
                selectedApt.status === 'rescheduled' ||
                selectedApt.status === 'no-show') && (
                <button
                  onClick={() => {
                    setSelectedApt(null);
                    navigate(`/result/${selectedApt.id}`);
                  }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  查看详情
                </button>
              )}

              {selectedApt.callStatus === 'missed' && selectedApt.status !== 'no-show' && (
                <button
                  onClick={() => recallAppointment(selectedApt.id)}
                  className="w-full btn-secondary text-secondary-600 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  重新叫号
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 异常标记弹窗 */}
      {showAbnormalModal && selectedApt && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <h3 className="text-lg font-semibold text-surface-900">
                {abnormalType === 'deferred' && '标记暂缓'}
                {abnormalType === 'rescheduled' && '改约其他时间'}
                {abnormalType === 'no-show' && '标记未到场'}
              </h3>
              <button
                onClick={() => setShowAbnormalModal(false)}
                className="p-2 rounded-full hover:bg-surface-50"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    abnormalType === 'deferred'
                      ? 'bg-amber-100'
                      : abnormalType === 'rescheduled'
                      ? 'bg-violet-100'
                      : 'bg-orange-100'
                  }`}
                >
                  {abnormalType === 'deferred' && (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  {abnormalType === 'rescheduled' && (
                    <CalendarPlus2 className="w-5 h-5 text-violet-600" />
                  )}
                  {abnormalType === 'no-show' && <UserX className="w-5 h-5 text-orange-600" />}
                </div>
                <div>
                  <div className="font-medium text-surface-800">{selectedApt.donorName}</div>
                  <div className="text-xs text-surface-500 mt-0.5">
                    {selectedApt.stationName} · {selectedApt.timeRange}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-surface-600 mb-2 block">原因说明</label>
                <div className="space-y-2 mb-3">
                  {(abnormalType === 'deferred'
                    ? ['身体不适', '临时有事', '血压偏高', '其他原因']
                    : abnormalType === 'rescheduled'
                    ? ['工作冲突', '时间不便', '改约其他日期', '其他原因']
                    : ['联系不上', '超时未到', '放弃献血', '其他原因']
                  ).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAbnormalReason(opt)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        abnormalReason === opt
                          ? 'bg-primary-50 text-primary-700 border border-primary-200'
                          : 'bg-surface-50 text-surface-600 hover:bg-surface-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <textarea
                  value={abnormalReason}
                  onChange={(e) => setAbnormalReason(e.target.value)}
                  className="w-full input-field min-h-[80px]"
                  placeholder="请输入具体原因..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-surface-100 flex gap-3">
              <button
                onClick={() => setShowAbnormalModal(false)}
                className="flex-1 btn-secondary text-surface-500"
              >
                取消
              </button>
              <button
                onClick={handleAbnormal}
                disabled={!abnormalReason.trim()}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认标记
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 耗材登记弹窗 */}
      {showSupplyModal && selectedApt && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">完成采血 · 登记耗材</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  {selectedApt.donorName} · {selectedApt.stationName}
                </p>
              </div>
              <button
                onClick={() => setShowSupplyModal(false)}
                className="p-2 rounded-full hover:bg-surface-50"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {supplyErrors.length > 0 && (
                <div className="p-3 bg-primary-50 rounded-xl space-y-1">
                  {supplyErrors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-sm text-primary-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {supplyItems.map((item, idx) => {
                const batch = batches.find((b) => b.id === item.batchId);
                if (!batch) return null;
                const typeInfo = supplyTypeMap[item.supplyType];
                const sameTypeBatches = groupedBatches[item.supplyType] || [];
                const rec = getRecommendedBatch(item.supplyType, item.quantity);
                return (
                  <div key={idx} className="p-4 bg-surface-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeInfo?.icon || '📦'}</span>
                        <span className="font-medium text-surface-800">
                          {typeInfo?.name || item.supplyType}
                        </span>
                      </div>
                      {rec.batch && rec.batch.id !== item.batchId && (
                        <button
                          onClick={() => handleBatchChange(idx, rec.batch.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          推荐{rec.batch.batchNo}
                        </button>
                      )}
                    </div>

                    {rec.reason && (
                      <div className="text-xs text-surface-500 mb-2 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {rec.reason}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">批次</label>
                        <select
                          value={item.batchId}
                          onChange={(e) => handleBatchChange(idx, e.target.value)}
                          className="w-full input-field text-sm"
                        >
                          {sameTypeBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.batchNo} · 剩{b.remainingQuantity} · {b.expiryDate}到期
                              {getRecommendedBatch(item.supplyType, item.quantity).batch?.id === b.id
                                ? ' · 推荐'
                                : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-surface-500 mb-1 block">
                          数量（剩 {batch.remainingQuantity}）
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(idx, -1)}
                            className="w-9 h-9 rounded-lg bg-surface-200 text-surface-700 font-medium hover:bg-surface-300 transition-colors"
                          >
                            -
                          </button>
                          <span className="flex-1 text-center font-semibold text-surface-800 text-lg">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(idx, 1)}
                            className="w-9 h-9 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-surface-100 flex gap-3">
              <button
                onClick={() => setShowSupplyModal(false)}
                className="flex-1 btn-secondary text-surface-500"
              >
                取消
              </button>
              <button
                onClick={handleCompleteWithSupply}
                className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日结汇总弹窗 */}
      {showDailySummary && <DailySummaryModal onClose={() => setShowDailySummary(false)} date={selectedDate} />}
    </div>
  );
}

function DailySummaryModal({ onClose, date }: { onClose: () => void; date: string }) {
  const { appointments, stations } = useAppStore();
  const { getUsageByDate } = useSupplyStore();
  const { usages } = useSupplyStore();

  const todaysApts = appointments.filter((a) => a.appointmentDate === date && a.status !== 'cancelled');
  const todaysUsages = getUsageByDate(date);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    todaysApts.forEach((a) => {
      map[a.status] = (map[a.status] || 0) + 1;
    });
    return map;
  }, [todaysApts]);

  const byStation = useMemo(() => {
    const map: Record<string, { total: number; completed: number; collecting: number; waiting: number }> = {};
    stations.forEach((s) => (map[s.id] = { total: 0, completed: 0, collecting: 0, waiting: 0 }));
    todaysApts.forEach((a) => {
      if (!map[a.stationId]) map[a.stationId] = { total: 0, completed: 0, collecting: 0, waiting: 0 };
      map[a.stationId].total++;
      if (a.status === 'completed') map[a.stationId].completed++;
      else if (a.status === 'collecting') map[a.stationId].collecting++;
      else map[a.stationId].waiting++;
    });
    return map;
  }, [todaysApts, stations]);

  const bySlot = useMemo(() => {
    const map: Record<string, number> = {};
    todaysApts.forEach((a) => {
      map[a.timeSlot] = (map[a.timeSlot] || 0) + 1;
    });
    return map;
  }, [todaysApts]);

  const bySupply = useMemo(() => {
    const map: Record<string, number> = {};
    todaysUsages.forEach((u) => {
      map[u.supplyTypeName] = (map[u.supplyTypeName] || 0) + u.quantity;
    });
    return map;
  }, [todaysUsages]);

  const totalCompleted = byStatus['completed'] || 0;
  const totalCollecting = byStatus['collecting'] || 0;
  const totalAbnormal =
    (byStatus['deferred'] || 0) + (byStatus['rescheduled'] || 0) + (byStatus['no-show'] || 0);
  const totalSupply = todaysUsages.reduce((s, u) => s + u.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-surface-100">
          <div>
            <h3 className="text-lg font-semibold text-surface-900">日结汇总</h3>
            <p className="text-sm text-surface-500 mt-0.5">{date}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-50">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-surface-50 rounded-xl text-center">
              <div className="text-xl font-bold text-surface-800">{todaysApts.length}</div>
              <div className="text-xs text-surface-500 mt-1">总预约</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <div className="text-xl font-bold text-emerald-700">{totalCompleted}</div>
              <div className="text-xs text-emerald-600 mt-1">已完成</div>
            </div>
            <div className="p-3 bg-primary-50 rounded-xl text-center">
              <div className="text-xl font-bold text-primary-700">{totalCollecting}</div>
              <div className="text-xs text-primary-600 mt-1">进行中</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-center">
              <div className="text-xl font-bold text-amber-700">{totalAbnormal}</div>
              <div className="text-xs text-amber-600 mt-1">异常</div>
            </div>
          </div>

          <div className="card">
            <h4 className="font-medium text-surface-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-secondary-600" />
              状态分布
            </h4>
            <div className="space-y-2">
              {Object.entries(byStatus).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusClassMap[k] || 'tag-default'}`}>
                      {statusLabelMap[k] || k}
                    </span>
                  </span>
                  <span className="font-medium text-surface-800">{v} 人</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h4 className="font-medium text-surface-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" />
              采血位汇总
            </h4>
            <div className="space-y-2">
              {stations.map((s) => {
                const data = byStation[s.id];
                if (!data || data.total === 0) return null;
                const percent = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                return (
                  <div key={s.id} className="p-3 bg-surface-50 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-surface-800">{s.name}</span>
                      <span className="text-sm text-surface-500">
                        {data.completed}/{data.total} 完成
                      </span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <div
                        className="progress-inner bg-emerald-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-surface-500">
                      <span>采血中 {data.collecting}</span>
                      <span>待进行 {data.total - data.completed - data.collecting}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h4 className="font-medium text-surface-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              时间段分布
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOT_LIST.map((t) => {
                const count = bySlot[t.id] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 bg-surface-50 rounded-lg text-sm"
                  >
                    <span className="text-surface-600">
                      {t.start}-{t.end}
                    </span>
                    <span className="font-medium text-surface-800">{count}人</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h4 className="font-medium text-surface-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-600" />
              耗材用量 · 共 {totalSupply} 件
            </h4>
            <div className="space-y-2">
              {Object.entries(bySupply).map(([name, qty]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-2.5 bg-surface-50 rounded-xl"
                >
                  <span className="text-sm text-surface-700">{name}</span>
                  <span className="text-sm font-medium text-surface-800">{qty} 件</span>
                </div>
              ))}
              {Object.keys(bySupply).length === 0 && (
                <div className="text-center py-4 text-surface-400 text-sm">暂无耗材使用记录</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-surface-100">
          <button onClick={onClose} className="w-full btn-primary flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            确认交班
          </button>
        </div>
      </div>
    </div>
  );
}
