import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Share2,
  AlertCircle,
  Map,
  X,
  Plus,
  Minus,
  Package,
  Save,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSupplyStore } from '@/store/supplyStore';
import { supplyTypeMap } from '@/utils/mock';
import PageHeader from '@/components/layout/PageHeader';
import type { SupplyType, SupplyBatch } from '@/types';

interface SupplyItem {
  batchId: string;
  supplyType: SupplyType;
  quantity: number;
}

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appointments, stations, completeAppointment, updateAppointment } = useAppStore();
  const { batches, splitOutbound, getAppointmentUsages, getRecommendedBatch, validateSupplyRequest } =
    useSupplyStore();

  const [animated, setAnimated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [supplyErrors, setSupplyErrors] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const appointment = useMemo(
    () => appointments.find((a) => a.id === id),
    [appointments, id],
  );

  const station = useMemo(
    () => stations.find((s) => s.id === appointment?.stationId),
    [stations, appointment],
  );

  const usages = useMemo(
    () => (appointment ? getAppointmentUsages(appointment.id) : []),
    [appointment, getAppointmentUsages],
  );

  const availableBatches = useMemo(() => {
    return batches.filter((b) => b.remainingQuantity > 0);
  }, [batches]);

  const groupedBatches = useMemo(() => {
    const map: Record<string, SupplyBatch[]> = {};
    availableBatches.forEach((b) => {
      if (!map[b.supplyType]) map[b.supplyType] = [];
      map[b.supplyType].push(b);
    });
    return map;
  }, [availableBatches]);

  const openSupplyModal = () => {
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
      const item = { ...next[index] };
      item.batchId = batchId;
      const batch = batches.find((b) => b.id === batchId);
      if (batch && item.quantity > batch.remainingQuantity) {
        item.quantity = batch.remainingQuantity;
      }
      next[index] = item;
      return next;
    });
  };

  const handleCompleteWithSupplies = () => {
    if (!appointment || !station) return;

    const result = validateSupplyRequest(supplyItems);
    if (!result.valid) {
      setSupplyErrors(result.errors.map((e) => e.message));
      return;
    }

    const usageIds: string[] = [];
    supplyItems.forEach((item) => {
      if (item.quantity <= 0) return;
      const batch = batches.find((b) => b.id === item.batchId);
      if (!batch) return;
      const usage = splitOutbound(
        batch.id,
        item.quantity,
        appointment.id,
        appointment.donorName,
        '采血使用',
        station.id,
        station.name,
        batch.supplyType,
        batch.supplyTypeName,
      );
      if (usage) usageIds.push(usage.id);
    });

    completeAppointment(appointment.id);
    updateAppointment(appointment.id, { supplyUsages: usageIds });
    setShowSupplyModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (!appointment) {
    return (
      <div className="min-h-screen bg-surface-100 flex items-center justify-center p-4">
        <div className="card text-center">
          <AlertCircle className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-800">预约不存在</h3>
          <p className="text-sm text-surface-500 mt-1">未找到对应的预约记录</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full mt-4">
            返回首页
          </button>
        </div>
      </div>
    );
  }

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
    cancelled: '已取消',
  };

  const statusColorMap: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-secondary-50 text-secondary-700 border-secondary-200',
    'checked-in': 'bg-blue-50 text-blue-700 border-blue-200',
    called: 'bg-red-50 text-red-700 border-red-200',
    collecting: 'bg-primary-50 text-primary-700 border-primary-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    deferred: 'bg-amber-50 text-amber-700 border-amber-200',
    rescheduled: 'bg-violet-50 text-violet-700 border-violet-200',
    'no-show': 'bg-orange-50 text-orange-700 border-orange-200',
    cancelled: 'bg-surface-100 text-surface-500 border-surface-200',
  };

  const canComplete = appointment.status !== 'completed' && appointment.status !== 'cancelled';

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader title="分配结果" showBack />

      <div className="p-4 space-y-4">
        {/* 分配成功提示 */}
        <div className={`card bg-gradient-to-br from-primary-500 to-rose-500 text-white overflow-hidden relative transition-all duration-700 ${
          animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse-soft">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-white/80">智能分配成功</p>
                <h2 className="text-xl font-bold">已为您匹配最优采血位</h2>
              </div>
            </div>

            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur">
              <div className="text-sm text-white/70 mb-1">分配的采血位</div>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold tracking-tight animate-count-up">
                  {appointment.stationName.replace(/[^0-9]/g, '')}
                </span>
                <div className="pb-2">
                  <div className="text-lg font-semibold">{appointment.stationName}</div>
                  <div className="text-sm text-white/80 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {station?.location || '采血车'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 预约信息卡 */}
        <div className={`card transition-all duration-700 delay-100 ${
          animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800">预约详情</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColorMap[appointment.status]}`}>
              {statusLabelMap[appointment.status]}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                <Calendar className="w-4.5 h-4.5 text-primary-600" />
              </div>
              <div>
                <div className="text-xs text-surface-400">采血日期</div>
                <div className="font-medium text-surface-800">{appointment.appointmentDate}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-secondary-50 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-secondary-700" />
              </div>
              <div>
                <div className="text-xs text-surface-400">采血时间</div>
                <div className="font-medium text-surface-800">{appointment.timeRange}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-surface-400">献血者</div>
                <div className="font-medium text-surface-800">
                  {appointment.donorName} · {appointment.phone}
                </div>
              </div>
            </div>

            {appointment.queueNumber && (
              <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-sm">#</span>
                </div>
                <div>
                  <div className="text-xs text-primary-500">排队号</div>
                  <div className="font-bold text-primary-700">
                    No.{String(appointment.queueNumber).padStart(3, '0')}
                  </div>
                </div>
              </div>
            )}

            {appointment.remark && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <div className="text-xs text-amber-500">异常说明</div>
                  <div className="font-medium text-amber-800">{appointment.remark}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Map className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-surface-400">位置信息</div>
                <div className="font-medium text-surface-800">{station?.location || '采血车现场'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 已用耗材 */}
        {usages.length > 0 && (
          <div className={`card transition-all duration-700 delay-150 ${
            animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-600" />
              已用耗材
            </h3>
            <div className="space-y-2">
              {usages.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 bg-surface-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-surface-800">{u.supplyTypeName}</div>
                    <div className="text-xs text-surface-500">批次：{u.batchNo}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary-600">
                      {u.quantity}{supplyTypeMap[u.supplyType]?.unit || ''}
                    </div>
                    <div className="text-xs text-surface-400">{u.direction}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 二维码卡 */}
        <div className={`card transition-all duration-700 delay-200 ${
          animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            报到凭证
          </h3>

          <div className="flex flex-col items-center">
            <div className="p-4 bg-white rounded-2xl shadow-card border-2 border-primary-100">
              <QRCodeCanvas
                value={`BLOOD-APT-${appointment.id}-${appointment.createdAt}`}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#1f2937"
              />
            </div>
            <p className="text-sm text-surface-500 mt-3 text-center">
              请在采血时出示此二维码<br />
              <span className="text-xs text-surface-400">预约编号：{appointment.id.slice(0, 12).toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* 注意事项 */}
        <div className={`card bg-blue-50/50 border-blue-100 transition-all duration-700 delay-300 ${
          animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <h4 className="font-medium text-surface-800 mb-3">📋 献血注意事项</h4>
          <ul className="space-y-2 text-sm text-surface-600">
            <li className="flex gap-2">
              <span className="text-primary-500">•</span>
              献血前一天保证充足睡眠，避免饮酒和高脂饮食
            </li>
            <li className="flex gap-2">
              <span className="text-primary-500">•</span>
              献血当天务必用餐，请勿空腹
            </li>
            <li className="flex gap-2">
              <span className="text-primary-500">•</span>
              请携带有效身份证件（身份证、护照等）
            </li>
            <li className="flex gap-2">
              <span className="text-primary-500">•</span>
              如有感冒、服药等情况请暂缓献血
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className={`grid grid-cols-2 gap-3 transition-all duration-700 delay-400 ${
          animated ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <button onClick={() => navigate('/appointment')} className="btn-secondary flex items-center justify-center gap-2">
            再次预约
            <ArrowRight className="w-4 h-4" />
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            分享凭证
          </button>
        </div>

        {canComplete && (
          <button
            onClick={openSupplyModal}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-5 h-5" />
            完成采血 · 登记耗材
          </button>
        )}

        {showSuccess && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <div className="font-semibold">采血完成</div>
                <div className="text-sm text-emerald-100">耗材已登记出库</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 耗材登记弹窗 */}
      {showSupplyModal && appointment && station && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-surface-100">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">登记耗材使用</h3>
                <p className="text-sm text-surface-500 mt-0.5">
                  {appointment.donorName} · {appointment.timeRange}
                </p>
              </div>
              <button onClick={() => setShowSupplyModal(false)} className="p-2 rounded-full hover:bg-surface-50">
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  <div key={idx} className="p-3 bg-surface-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeInfo?.icon || '📦'}</span>
                        <span className="font-medium text-surface-800">{typeInfo?.name || item.supplyType}</span>
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

                    <div className="mb-2">
                      <label className="text-xs text-surface-500 mb-1 block">选择批次</label>
                      <select
                        value={item.batchId}
                        onChange={(e) => handleBatchChange(idx, e.target.value)}
                        className="w-full input-field text-sm"
                      >
                        {sameTypeBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchNo}（剩{b.remainingQuantity}，{b.expiryDate}到期）
                            {getRecommendedBatch(item.supplyType, item.quantity).batch?.id === b.id
                              ? ' · 推荐'
                              : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-surface-600">数量</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(idx, -1)}
                          className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center hover:bg-surface-100 text-surface-600"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold text-surface-800">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(idx, 1)}
                          className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center hover:bg-primary-100 text-primary-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-surface-400 ml-1">{typeInfo?.unit || ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-surface-100 space-y-2">
              <button
                onClick={handleCompleteWithSupplies}
                className="w-full btn-primary flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4" />
                确认完成
              </button>
              <button
                onClick={() => setShowSupplyModal(false)}
                className="w-full btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
