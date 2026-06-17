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
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useSupplyStore } from '@/store/supplyStore';
import PageHeader from '@/components/layout/PageHeader';

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appointments, stations, completeAppointment } = useAppStore();
  const { batches, splitOutbound } = useSupplyStore();

  const [animated, setAnimated] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleComplete = () => {
    if (!appointment) return;
    completeAppointment(appointment.id);

    const relevantBatches = batches.filter((b) => b.remainingQuantity > 0);
    relevantBatches.slice(0, 3).forEach((batch, idx) => {
      const qty = batch.supplyType === 'tube' ? 4 : batch.supplyType === 'swab' ? 2 : 1;
      const directions: Record<string, string> = {
        needle: '静脉穿刺采血',
        bag: '血液采集袋',
        tube: '留样检测',
        swab: '皮肤消毒',
      };
      splitOutbound(
        batch.id,
        Math.min(qty, batch.remainingQuantity),
        appointment.id,
        appointment.donorName,
        directions[batch.supplyType] || '采血使用',
      );
    });

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

  const statusConfig = {
    pending: { label: '待确认', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    confirmed: { label: '已确认', color: 'bg-secondary-50 text-secondary-700 border-secondary-200' },
    completed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: '已取消', color: 'bg-surface-100 text-surface-500 border-surface-200' },
  };

  const statusInfo = statusConfig[appointment.status];

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
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
              {statusInfo.label}
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

        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
          <button onClick={handleComplete} className="btn-primary w-full flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            标记为采血完成
          </button>
        )}

        {showSuccess && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <div className="font-semibold">采血完成</div>
                <div className="text-sm text-emerald-100">耗材已自动出库</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
