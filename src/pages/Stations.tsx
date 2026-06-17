import { useState, useMemo } from 'react';
import { Plus, MapPin, Wrench, Users, CheckCircle2, XCircle, AlertCircle, Settings, Save, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { generateId } from '@/utils/mock';
import PageHeader from '@/components/layout/PageHeader';
import type { Station, Appointment } from '@/types';

const statusLabelMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已预约',
  'checked-in': '已签到',
  collecting: '采血中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusClassMap: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-secondary-100 text-secondary-700',
  'checked-in': 'bg-blue-100 text-blue-700',
  collecting: 'bg-primary-100 text-primary-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-surface-100 text-surface-500',
};

export default function Stations() {
  const { stations, appointments, addStation, updateStation } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '10',
  });
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  const todayAptsPerStation = stations.map((s) => ({
    ...s,
    todayCount: appointments.filter(
      (a) => a.stationId === s.id && a.appointmentDate === today && a.status !== 'cancelled',
    ).length,
  }));

  const stationAppointments = useMemo(() => {
    if (!selectedStation) return [];
    return appointments
      .filter(
        (a) =>
          a.stationId === selectedStation.id &&
          a.appointmentDate === today &&
          a.status !== 'cancelled',
      )
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  }, [selectedStation, appointments, today]);

  const slotGroups = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    stationAppointments.forEach((apt) => {
      const list = groups.get(apt.timeSlot) || [];
      list.push(apt);
      groups.set(apt.timeSlot, list);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stationAppointments]);

  const openAdd = () => {
    setEditStation(null);
    setFormData({ name: '', location: '', capacity: '10' });
    setShowForm(true);
  };

  const openEdit = (st: Station) => {
    setEditStation(st);
    setFormData({ name: st.name, location: st.location, capacity: st.capacity.toString() });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.location.trim()) return;

    if (editStation) {
      updateStation(editStation.id, {
        name: formData.name,
        location: formData.location,
        capacity: parseInt(formData.capacity) || 10,
      });
    } else {
      const newStation: Station = {
        id: generateId('st'),
        name: formData.name,
        location: formData.location,
        status: 'idle',
        capacity: parseInt(formData.capacity) || 10,
        todayAppointments: 0,
      };
      addStation(newStation);
    }
    setShowForm(false);
  };

  const toggleStatus = (st: Station) => {
    const nextStatus: Record<string, Station['status']> = {
      idle: 'occupied',
      occupied: 'maintenance',
      maintenance: 'idle',
    };
    updateStation(st.id, { status: nextStatus[st.status] });
  };

  const toggleSlot = (slotId: string) => {
    const next = new Set(expandedSlots);
    if (next.has(slotId)) next.delete(slotId);
    else next.add(slotId);
    setExpandedSlots(next);
  };

  const statusConfig = {
    idle: { label: '空闲', icon: CheckCircle2, color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    occupied: { label: '占用', icon: XCircle, color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    maintenance: { label: '维护', icon: Wrench, color: 'bg-surface-400', text: 'text-surface-600', bg: 'bg-surface-100' },
  };

  const idleCount = stations.filter((s) => s.status === 'idle').length;
  const totalCapacity = stations.reduce((s, st) => s + st.capacity, 0);

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader
        title="采血位管理"
        right={
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* 统计概览 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4">
            <div className="text-2xl font-bold">{idleCount}</div>
            <div className="text-xs text-white/80 mt-1">空闲</div>
          </div>
          <div className="card bg-gradient-to-br from-amber-500 to-orange-500 text-white p-4">
            <div className="text-2xl font-bold">{stations.filter((s) => s.status === 'occupied').length}</div>
            <div className="text-xs text-white/80 mt-1">占用</div>
          </div>
          <div className="card bg-gradient-to-br from-violet-500 to-violet-600 text-white p-4">
            <div className="text-2xl font-bold">{totalCapacity}</div>
            <div className="text-xs text-white/80 mt-1">总容量</div>
          </div>
        </div>

        {/* 采血位列表 */}
        <div>
          <h3 className="text-base font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary-600 rounded-full" />
            采血位列表
          </h3>
          <div className="space-y-3">
            {todayAptsPerStation.map((st, idx) => {
              const cfg = statusConfig[st.status];
              const StatusIcon = cfg.icon;
              const occupancy = st.capacity > 0 ? Math.round((st.todayCount / st.capacity) * 100) : 0;
              return (
                <div
                  key={st.id}
                  className="card card-hover animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center`}>
                        <span className={`text-xl font-bold ${cfg.text}`}>
                          {st.name.replace(/[^0-9]/g, '')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-surface-800">{st.name}</h4>
                          <span className={`tag ${cfg.bg} ${cfg.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-surface-500 mt-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {st.location}
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(st)}
                        className="p-2 rounded-lg hover:bg-surface-50"
                      >
                        <Settings className="w-4 h-4 text-surface-400" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-surface-50 rounded-xl">
                      <div className="text-lg font-bold text-surface-800">{st.capacity}</div>
                      <div className="text-xs text-surface-500">日容量</div>
                    </div>
                    <div className="text-center p-2 bg-surface-50 rounded-xl">
                      <div className="text-lg font-bold text-primary-600">{st.todayCount}</div>
                      <div className="text-xs text-surface-500">今日预约</div>
                    </div>
                    <div className="text-center p-2 bg-surface-50 rounded-xl">
                      <div className="text-lg font-bold text-secondary-700">{occupancy}%</div>
                      <div className="text-xs text-surface-500">占用率</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="progress-bar">
                      <div
                        className={`progress-inner ${occupancy > 80 ? 'bg-primary-500' : occupancy > 50 ? 'bg-amber-500' : 'bg-secondary-500'}`}
                        style={{ width: `${Math.min(100, occupancy)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => toggleStatus(st)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium bg-surface-50 text-surface-700 hover:bg-surface-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <AlertCircle className="w-4 h-4" />
                      切换状态
                    </button>
                    <button
                      onClick={() => setSelectedStation(st)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-4 h-4" />
                      查看预约
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 建档/编辑表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-900">
                {editStation ? '编辑采血位' : '新增采血位'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-surface-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">采血位名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  placeholder="如：A01采血位"
                />
              </div>
              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">位置信息</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                  className="input-field"
                  placeholder="如：采血车一层-左1"
                />
              </div>
              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">每日容量</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData((f) => ({ ...f, capacity: e.target.value }))}
                  className="input-field"
                  placeholder="最多可接待人数"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleSave} className="btn-primary flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 采血位预约详情弹窗 */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">{selectedStation.name}</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  今日预约 {stationAppointments.length} 人 / 容量 {selectedStation.capacity} 人
                </p>
              </div>
              <button onClick={() => setSelectedStation(null)} className="p-2 rounded-full hover:bg-surface-50">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {stationAppointments.length === 0 ? (
                <div className="text-center py-12 text-surface-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>今日暂无预约</p>
                </div>
              ) : (
                slotGroups.map(([slotId, apts]) => {
                  const expanded = expandedSlots.has(slotId);
                  const first = apts[0];
                  return (
                    <div key={slotId} className="bg-surface-50 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleSlot(slotId)}
                        className="w-full p-3 flex items-center justify-between hover:bg-surface-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary-600" />
                          <span className="font-medium text-surface-800">{first.timeRange}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white text-surface-600">
                            {apts.length}人
                          </span>
                        </div>
                        {expanded ? (
                          <ChevronUp className="w-4 h-4 text-surface-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-surface-400" />
                        )}
                      </button>
                      {expanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {apts.map((apt) => (
                            <div
                              key={apt.id}
                              className="p-3 bg-white rounded-lg border border-surface-100"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-surface-800 text-sm">{apt.donorName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusClassMap[apt.status] || 'tag-default'}`}>
                                  {statusLabelMap[apt.status] || apt.status}
                                </span>
                              </div>
                              <div className="text-xs text-surface-500">
                                {apt.idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-surface-100">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <div className="text-lg font-bold text-emerald-600">
                    {stationAppointments.filter((a) => a.status === 'completed').length}
                  </div>
                  <div className="text-xs text-emerald-600/80">已完成</div>
                </div>
                <div className="p-3 bg-primary-50 rounded-xl text-center">
                  <div className="text-lg font-bold text-primary-600">
                    {stationAppointments.filter((a) => a.status !== 'completed').length}
                  </div>
                  <div className="text-xs text-primary-600/80">待进行</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
