import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Calendar,
  MapPin,
  Clock,
  Heart,
  AlertCircle,
  CheckCircle2,
  Shield,
  Info,
  FileClock,
  AlertTriangle,
  ChevronRight,
  FileSpreadsheet,
  User,
  Package,
  Users,
  FileCheck2,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import {
  validateDonationInterval,
  getIntervalDescription,
  summarizeDonations,
} from '@/utils/validation';
import PageHeader from '@/components/layout/PageHeader';

const aptStatusLabel: Record<string, string> = {
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

const aptStatusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-secondary-100 text-secondary-700',
  'checked-in': 'bg-blue-100 text-blue-700',
  called: 'bg-red-100 text-red-700',
  collecting: 'bg-primary-100 text-primary-700',
  completed: 'bg-emerald-100 text-emerald-700',
  deferred: 'bg-amber-100 text-amber-700',
  rescheduled: 'bg-violet-100 text-violet-700',
  'no-show': 'bg-orange-100 text-orange-700',
  cancelled: 'bg-surface-200 text-surface-500',
};

export default function Records() {
  const navigate = useNavigate();
  const { donor, donationRecords, appointments, shiftRecords } = useAppStore();
  const today = new Date().toISOString().split('T')[0];

  const summary = useMemo(() => summarizeDonations(donationRecords), [donationRecords]);

  const intervalStatus = useMemo(
    () =>
      validateDonationInterval(
        summary.lastDate || donor.lastDonationDate,
        summary.lastType || donor.donationType,
        'whole',
        today,
      ),
    [summary, donor, today],
  );

  const componentInterval = useMemo(
    () =>
      validateDonationInterval(
        summary.lastDate || donor.lastDonationDate,
        summary.lastType || donor.donationType,
        'component',
        today,
      ),
    [summary, donor, today],
  );

  const daysSinceLast = summary.lastDate
    ? Math.floor((new Date(today).getTime() - new Date(summary.lastDate).getTime()) / 86400000)
    : null;

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader title="献血记录" />

      <div className="p-4 space-y-4">
        {/* 献血卡 */}
        <div className="card bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 text-white overflow-hidden relative">
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-secondary-500/20 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary-400" fill="currentColor" />
                <span className="text-sm text-white/70">无偿献血荣誉卡</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                {donor.bloodType !== 'unknown' ? `${donor.bloodType}型` : '血型待定'}
              </span>
            </div>

            <h2 className="text-2xl font-bold">{donor.name}</h2>
            <p className="text-sm text-white/60 mt-1 font-mono">
              {donor.idCard.replace(/^(\d{6})\d{8}(\d{4})$/, '$1********$2')}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-2xl font-bold">{summary.totalTimes}</div>
                <div className="text-xs text-white/60 mt-0.5">累计次数</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-2xl font-bold">{summary.totalVolume}</div>
                <div className="text-xs text-white/60 mt-0.5">毫升总量</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/10 backdrop-blur">
                <div className="text-2xl font-bold">
                  {summary.totalVolume >= 800 ? '免费用血' : summary.totalVolume >= 400 ? '等量报销' : '互助'}
                </div>
                <div className="text-xs text-white/60 mt-0.5">用血优惠</div>
              </div>
            </div>
          </div>
        </div>

        {/* 献血间隔校验卡 */}
        <div className={`card ${!intervalStatus.valid ? 'border-amber-200' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-secondary-600" />
              献血间隔校验
            </h3>
            <span className={`tag ${intervalStatus.valid ? 'tag-success' : 'tag-warning'}`}>
              {intervalStatus.valid ? '可正常献血' : '间隔不足'}
            </span>
          </div>

          {daysSinceLast !== null && (
            <div className="text-center py-3 mb-3 bg-surface-50 rounded-xl">
              <div className="text-3xl font-bold text-gradient">{daysSinceLast}</div>
              <div className="text-sm text-surface-500 mt-0.5">距上次献血（天）</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className={`p-3 rounded-xl ${intervalStatus.valid ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets className={`w-3.5 h-3.5 ${intervalStatus.valid ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className={`text-xs font-medium ${intervalStatus.valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  全血献血
                </span>
              </div>
              {intervalStatus.valid ? (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs text-emerald-700">已满足180天</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-amber-700">还需 {intervalStatus.daysRemaining} 天</span>
                </div>
              )}
            </div>

            <div className={`p-3 rounded-xl ${componentInterval.valid ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets className={`w-3.5 h-3.5 ${componentInterval.valid ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className={`text-xs font-medium ${componentInterval.valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  成分血
                </span>
              </div>
              {componentInterval.valid ? (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs text-emerald-700">已满足间隔</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span className="text-xs text-amber-700">还需 {componentInterval.daysRemaining} 天</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              {getIntervalDescription(summary.lastType || donor.donationType, 'whole')}
              {!intervalStatus.valid && intervalStatus.nextDonationDate && (
                <div className="mt-1">下次可献全血日期：<strong>{intervalStatus.nextDonationDate}</strong></div>
              )}
            </div>
          </div>

          {!intervalStatus.valid && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 flex items-start gap-2 border border-amber-100">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{intervalStatus.message}</p>
            </div>
          )}
        </div>

        {/* 间隔规则说明 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-500" />
            法定献血间隔规则
          </h3>
          <div className="space-y-2.5">
            {[
              { from: '全血', to: '全血', days: 180, desc: '6个月' },
              { from: '全血', to: '成分血', days: 90, desc: '3个月' },
              { from: '成分血', to: '成分血', days: 14, desc: '2周' },
              { from: '成分血', to: '全血', days: 28, desc: '4周' },
            ].map((r) => (
              <div key={`${r.from}-${r.to}`} className="flex items-center gap-3 p-2.5 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-violet-700">
                    {r.from}
                  </span>
                  <span className="text-surface-400">→</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary-100 text-secondary-700">
                    {r.to}
                  </span>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-sm font-bold text-surface-800">≥ {r.days}</span>
                  <span className="text-xs text-surface-400 ml-1">天 ({r.desc})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 历史记录时间轴 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-600" />
            献血历史
          </h3>

          {donationRecords.length === 0 ? (
            <div className="text-center py-10 text-surface-400">
              <Droplets className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无献血记录</p>
              <p className="text-xs mt-1">您的爱心献血记录将在此展示</p>
            </div>
          ) : (
            <div className="relative space-y-0">
              {donationRecords.map((r, idx) => {
                const isLatest = idx === 0;
                return (
                  <div key={r.id} className="relative pl-7 pb-5 last:pb-0">
                    {idx !== donationRecords.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-px bg-surface-200" />
                    )}
                    <div
                      className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        isLatest ? 'bg-primary-500' : r.type === 'whole' ? 'bg-secondary-500' : 'bg-violet-500'
                      }`}
                    >
                      <Droplets className="w-2.5 h-2.5 text-white" />
                    </div>

                    <div className={`p-4 rounded-2xl ${isLatest ? 'bg-primary-50 border-2 border-primary-100' : 'bg-surface-50'}`}>
                      {isLatest && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-medium mb-2">
                          <CheckCircle2 className="w-3 h-3" />
                          最近一次
                        </span>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-surface-800">
                          {r.type === 'whole' ? '全血捐献' : '成分血捐献'}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          r.type === 'whole' ? 'bg-secondary-100 text-secondary-700' : 'bg-violet-100 text-violet-700'
                        }`}>
                          {r.volume}ml
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-surface-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {r.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {r.stationName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 预约历史 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <FileClock className="w-4 h-4 text-secondary-600" />
            预约历史
          </h3>

          {appointments.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <FileClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无预约记录</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {[...appointments]
                .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate) || b.timeSlot.localeCompare(a.timeSlot))
                .slice(0, 30)
                .map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => navigate(`/result/${apt.id}`)}
                    className="w-full text-left p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-surface-800">
                        {apt.appointmentDate} {apt.timeRange}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${aptStatusClass[apt.status] || 'tag-default'}`}
                      >
                        {aptStatusLabel[apt.status] || apt.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-surface-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {apt.stationName}
                      </span>
                      <ChevronRight className="w-3 h-3 text-surface-400" />
                    </div>
                    {apt.remark && (
                      <div className="flex items-start gap-1 mt-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        {apt.remark}
                      </div>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 交班记录 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-secondary-600" />
            交班记录
          </h3>

          {shiftRecords.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无交班记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shiftRecords.map((record) => (
                <div
                  key={record.id}
                  className="p-4 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-surface-800">{record.date}</span>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                      已交班
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-surface-800">
                        {record.summary.totalAppointments}
                      </div>
                      <div className="text-[10px] text-surface-500">总预约</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-emerald-700">
                        {record.summary.completed}
                      </div>
                      <div className="text-[10px] text-emerald-600">已完成</div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-primary-700">
                        {record.summary.collecting}
                      </div>
                      <div className="text-[10px] text-primary-600">进行中</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-amber-700">
                        {record.summary.abnormal}
                      </div>
                      <div className="text-[10px] text-amber-600">异常</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-surface-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        交班人
                      </span>
                      <span className="text-surface-700 font-medium">{record.operatorName}</span>
                    </div>
                    <div className="flex items-center justify-between text-surface-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        交班时间
                      </span>
                      <span className="text-surface-700">
                        {record.closedAt.replace('T', ' ').slice(0, 19)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-surface-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        耗材用量
                      </span>
                      <span className="text-surface-700 font-medium">
                        {record.summary.totalSupplyUsed} 件
                      </span>
                    </div>
                  </div>

                  {record.abnormalList.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-surface-200">
                      <div className="text-xs text-surface-500 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        异常记录（{record.abnormalList.length}条）
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {record.abnormalList.slice(0, 3).map((item) => (
                          <div
                            key={item.appointmentId}
                            className="text-xs bg-amber-50 rounded-lg px-2 py-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-surface-700">{item.donorName}</span>
                              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                {aptStatusLabel[item.status] || item.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-700 mt-0.5">{item.remark}</div>
                          </div>
                        ))}
                        {record.abnormalList.length > 3 && (
                          <div className="text-xs text-center text-surface-400">
                            还有 {record.abnormalList.length - 3} 条...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-surface-200">
                    <div className="text-xs text-surface-500 mb-2 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      各采血位完成情况
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {record.byStation
                        .filter((s) => s.total > 0)
                        .map((s) => (
                          <div
                            key={s.stationId}
                            className="text-xs bg-white rounded-lg px-2 py-1.5 flex items-center justify-between"
                          >
                            <span className="text-surface-600">{s.stationName}</span>
                            <span className="text-emerald-700 font-medium">
                              {s.completed}/{s.total}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
