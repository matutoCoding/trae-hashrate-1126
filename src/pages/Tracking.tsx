import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingDown,
  AlertTriangle,
  Package,
  Calendar,
  User,
  ArrowRight,
  MapPin,
  Droplets,
  History,
  Layers,
  Filter,
} from 'lucide-react';
import { useSupplyStore } from '@/store/supplyStore';
import { useAppStore } from '@/store/appStore';
import { supplyTypeMap } from '@/utils/mock';
import PageHeader from '@/components/layout/PageHeader';
import type { SupplyType, SupplyUsage } from '@/types';

const PIE_COLORS = ['#E53935', '#00838F', '#8B5CF6', '#F59E0B'];
const BAR_COLORS = ['#22C55E', '#EAB308', '#EF4444'];

type ViewMode = 'batch' | 'station' | 'appointment' | 'direction';

export default function Tracking() {
  const navigate = useNavigate();
  const { batches, usages, getBatchUsages, getStationUsages, getAppointmentUsages, getUsagesByDirection } = useSupplyStore();
  const { stations, appointments } = useAppStore();

  const [selectedType, setSelectedType] = useState<SupplyType | 'all'>('all');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('batch');

  const today = new Date().toISOString().split('T')[0];

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) || null,
    [batches, selectedBatchId],
  );

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedStationId) || null,
    [stations, selectedStationId],
  );

  const batchUsages = useMemo(
    () => (selectedBatch ? getBatchUsages(selectedBatch.id) : []),
    [selectedBatch, getBatchUsages],
  );

  const stationUsages = useMemo(
    () => (selectedStation ? getStationUsages(selectedStation.id, today) : []),
    [selectedStation, getStationUsages, today],
  );

  const directionUsages = useMemo(
    () => (selectedDirection ? getUsagesByDirection(selectedDirection) : []),
    [selectedDirection, getUsagesByDirection],
  );

  const pieData = useMemo(() => {
    const map = new Map<SupplyType, { used: number; remaining: number }>();
    batches.forEach((b) => {
      const cur = map.get(b.supplyType) || { used: 0, remaining: 0 };
      cur.used += b.totalQuantity - b.remainingQuantity;
      cur.remaining += b.remainingQuantity;
      map.set(b.supplyType, cur);
    });
    const result: { name: string; value: number; color: string }[] = [];
    Array.from(map.entries()).forEach(([type, data], idx) => {
      const typeInfo = supplyTypeMap[type];
      result.push({
        name: `${typeInfo.name}(已用)`,
        value: data.used,
        color: PIE_COLORS[idx % PIE_COLORS.length] + '80',
      });
      result.push({
        name: `${typeInfo.name}(剩余)`,
        value: data.remaining,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      });
    });
    return result;
  }, [batches]);

  const barData = useMemo(() => {
    const recentDates: string[] = [];
    const todayDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      recentDates.push(d.toISOString().split('T')[0]);
    }

    return recentDates.map((date) => {
      const dayUsages = usages.filter((u) => u.usedAt.startsWith(date));
      const needle = dayUsages
        .filter((u) => u.supplyType === 'needle')
        .reduce((s, u) => s + u.quantity, 0);
      const bag = dayUsages
        .filter((u) => u.supplyType === 'bag')
        .reduce((s, u) => s + u.quantity, 0);
      const tube = dayUsages
        .filter((u) => u.supplyType === 'tube')
        .reduce((s, u) => s + u.quantity, 0);

      return {
        date: date.slice(5),
        采血针: needle,
        采血袋: bag,
        采血管: tube,
      };
    });
  }, [usages]);

  const directionData = useMemo(() => {
    const dirMap = new Map<string, number>();
    usages.forEach((u) => {
      dirMap.set(u.direction, (dirMap.get(u.direction) || 0) + u.quantity);
    });
    return Array.from(dirMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [usages]);

  const warningBatches = useMemo(
    () =>
      batches.filter(
        (b) => b.remainingQuantity <= b.totalQuantity * 0.1 || b.remainingQuantity < 50,
      ),
    [batches],
  );

  const filteredBatches = useMemo(() => {
    if (selectedType === 'all') return batches;
    return batches.filter((b) => b.supplyType === selectedType);
  }, [batches, selectedType]);

  const stationUsageStats = useMemo(() => {
    return stations.map((st) => {
      const stationUses = usages.filter((u) => u.stationId === st.id && u.usedAt.startsWith(today));
      const totalQty = stationUses.reduce((s, u) => s + u.quantity, 0);
      return { ...st, usageCount: stationUses.length, totalQty };
    });
  }, [stations, usages, today]);

  const renderUsageItem = (u: SupplyUsage) => {
    const apt = appointments.find((a) => a.id === u.appointmentId);
    return (
      <div className="p-3 bg-surface-50 rounded-xl ml-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-medium text-surface-800 text-sm flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary-500" />
            {u.donorName}
          </span>
          <span className="text-xs text-surface-400">{u.usedAt.slice(5, 16)}</span>
        </div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-surface-500">{u.supplyTypeName}</span>
          <span className="font-semibold text-primary-600">
            -{u.quantity}
            {supplyTypeMap[u.supplyType]?.unit || ''}
          </span>
        </div>
        {u.stationName && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {u.stationName}
            </span>
            <span className="text-surface-400">{u.direction}</span>
          </div>
        )}
        {apt && (
          <button
            onClick={() => navigate(`/result/${apt.id}`)}
            className="mt-2 w-full text-xs text-secondary-600 hover:text-secondary-700 text-right"
          >
            查看预约 →
          </button>
        )}
      </div>
    );
  };

  const renderTimeline = (list: SupplyUsage[]) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-6 text-surface-400 text-sm">
          暂无使用记录
        </div>
      );
    }
    return (
      <div className="relative space-y-0">
        {list.map((u, idx) => (
          <div key={u.id} className="relative pl-6 pb-4 last:pb-0">
            {idx !== list.length - 1 && (
              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-surface-200" />
            )}
            <div
              className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                idx === 0 ? 'bg-primary-500' : 'bg-surface-300'
              }`}
            >
              {idx === 0 && <Droplets className="w-2.5 h-2.5 text-white" />}
            </div>
            {renderUsageItem(u)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader title="剩余追踪" showBack />

      <div className="p-4 space-y-4">
        {/* 总体概览环形图 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary-600" />
            耗材使用分布
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2">
            {Object.entries(supplyTypeMap).map(([key, val], idx) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-surface-600">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                {val.name}
              </div>
            ))}
          </div>
        </div>

        {/* 去向分布图 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-500" />
            去向分布
          </h3>
          <div className="space-y-2.5">
            {directionData.map((d, idx) => {
              const total = directionData.reduce((s, x) => s + x.value, 0);
              const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <button
                  key={d.name}
                  onClick={() => {
                    setSelectedDirection(d.name);
                    setViewMode('direction');
                  }}
                  className="w-full text-left"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-surface-700">{d.name}</span>
                    <span className="text-surface-500">
                      {d.value}件 · {percent}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-inner"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 近7日使用趋势 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-secondary-600" />
            近7日使用趋势
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="采血针" fill={BAR_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="采血袋" fill={BAR_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="采血管" fill={BAR_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 预警批次 */}
        {warningBatches.length > 0 && (
          <div className="card bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              库存预警 ({warningBatches.length})
            </h3>
            <div className="space-y-2">
              {warningBatches.map((b) => {
                const typeInfo = supplyTypeMap[b.supplyType];
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200/50"
                  >
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-surface-800 text-sm truncate">{b.supplyTypeName}</div>
                      <div className="text-xs text-surface-400 truncate font-mono">{b.batchNo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary-600">{b.remainingQuantity}</div>
                      <div className="text-[10px] text-surface-400">
                        剩{b.totalQuantity}
                        {typeInfo.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 多维查看 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-600" />
            多维追踪
          </h3>

          <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-4">
            {[
              { key: 'batch', label: '按批次', icon: Package },
              { key: 'station', label: '按采血位', icon: MapPin },
              { key: 'direction', label: '按用途', icon: Filter },
            ].map((m) => {
              const Icon = m.icon;
              const active = viewMode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setViewMode(m.key as ViewMode)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    active ? 'bg-white text-primary-600 shadow-sm' : 'text-surface-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* 按批次 */}
          {viewMode === 'batch' && (
            <>
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 mb-3 -mx-1 px-1">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedType === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600'
                  }`}
                >
                  全部
                </button>
                {Object.entries(supplyTypeMap).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedType(key as SupplyType)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      selectedType === key
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 text-surface-600'
                    }`}
                  >
                    <span>{val.icon}</span>
                    {val.name}
                  </button>
                ))}
              </div>

              <div className="space-y-2 mb-4">
                {filteredBatches.map((b) => {
                  const typeInfo = supplyTypeMap[b.supplyType];
                  const isSelected = selectedBatchId === b.id;
                  const ratio = b.totalQuantity > 0 ? b.remainingQuantity / b.totalQuantity : 0;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBatchId(isSelected ? null : b.id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-100 bg-white hover:border-surface-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{typeInfo.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-surface-800 text-sm">
                              {b.supplyTypeName}
                            </span>
                            <span
                              className={`tag ${
                                ratio > 0.5 ? 'tag-success' : ratio > 0.2 ? 'tag-warning' : 'tag-danger'
                              }`}
                            >
                              {Math.round(ratio * 100)}%
                            </span>
                          </div>
                          <div className="text-xs text-surface-400 font-mono truncate">{b.batchNo}</div>
                        </div>
                        <ArrowRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'rotate-90 text-primary-500' : 'text-surface-300'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedBatch && (
                <div className="border-t border-surface-100 pt-4">
                  <h4 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-secondary-600" />
                    批次 {selectedBatch.batchNo} 使用记录
                  </h4>
                  {renderTimeline(batchUsages)}
                </div>
              )}
            </>
          )}

          {/* 按采血位 */}
          {viewMode === 'station' && (
            <>
              <div className="space-y-2 mb-4">
                {stationUsageStats.map((st) => {
                  const isSelected = selectedStationId === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStationId(isSelected ? null : st.id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-100 bg-white hover:border-surface-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            st.status === 'idle'
                              ? 'bg-emerald-100 text-emerald-600'
                              : st.status === 'occupied'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-surface-100 text-surface-500'
                          }`}
                        >
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-surface-800 text-sm">{st.name}</div>
                          <div className="text-xs text-surface-400">{st.location}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary-600">
                            {st.usageCount}次
                          </div>
                          <div className="text-[10px] text-surface-400">今日</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedStation && (
                <div className="border-t border-surface-100 pt-4">
                  <h4 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-secondary-600" />
                    {selectedStation.name} 今日耗材
                  </h4>
                  {renderTimeline(stationUsages)}
                </div>
              )}
            </>
          )}

          {/* 按用途 */}
          {viewMode === 'direction' && (
            <>
              <div className="space-y-2 mb-4">
                {directionData.map((d) => {
                  const isSelected = selectedDirection === d.name;
                  return (
                    <button
                      key={d.name}
                      onClick={() => setSelectedDirection(isSelected ? null : d.name)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-100 bg-white hover:border-surface-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                          <Filter className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-surface-800 text-sm">{d.name}</div>
                          <div className="text-xs text-surface-400">共 {d.value} 件耗材</div>
                        </div>
                        <div className="text-primary-600 text-sm font-semibold">
                          {Math.round((d.value / directionData.reduce((s, x) => s + x.value, 0)) * 100)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDirection && (
                <div className="border-t border-surface-100 pt-4">
                  <h4 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-secondary-600" />
                    {selectedDirection} 使用记录
                  </h4>
                  {renderTimeline(directionUsages)}
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => navigate('/supplies')}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <Package className="w-4 h-4" />
          前往耗材管理
        </button>
      </div>
    </div>
  );
}
