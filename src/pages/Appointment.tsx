import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarPlus, Clock, ChevronLeft, ChevronRight, User, Phone, AlertCircle, CheckCircle2, Droplets } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { generateTimeSlots, generateId } from '@/utils/mock';
import { allocateStation } from '@/utils/allocation';
import { validateDonationInterval, validateIdCard, validatePhone, getIntervalDescription } from '@/utils/validation';
import PageHeader from '@/components/layout/PageHeader';
import type { Appointment, TimeSlot } from '@/types';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function Appointment() {
  const navigate = useNavigate();
  const { appointments, stations, donor, addAppointment, updateDonor } = useAppStore();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<string>(() => today.toISOString().split('T')[0]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    name: donor.name,
    idCard: donor.idCard,
    phone: donor.phone,
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; idCard?: string; phone?: string }>({});
  const [intervalStatus, setIntervalStatus] = useState<ReturnType<typeof validateDonationInterval> | null>(null);

  const weekDays = useMemo(() => {
    const days: { date: string; day: number; weekday: string; isToday: boolean; isPast: boolean }[] = [];
    const start = new Date(today);
    start.setDate(start.getDate() + weekOffset * 7);
    start.setDate(start.getDate() - start.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isPast = d < new Date(today.toISOString().split('T')[0]);
      const isToday = dateStr === today.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        day: d.getDate(),
        weekday: WEEKDAYS[d.getDay()],
        isToday,
        isPast,
      });
    }
    return days;
  }, [weekOffset]);

  const timeSlots = useMemo(() => generateTimeSlots(selectedDate), [selectedDate]);

  useEffect(() => {
    const status = validateDonationInterval(
      donor.lastDonationDate,
      donor.donationType,
      'whole',
      selectedDate,
    );
    setIntervalStatus(status);
  }, [donor.lastDonationDate, donor.donationType, selectedDate]);

  const handleDateClick = (date: typeof weekDays[0]) => {
    if (date.isPast) return;
    setSelectedDate(date.date);
    setSelectedSlot(null);
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.available === 0) return;
    setSelectedSlot(slot);
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};

    if (!formData.name.trim()) {
      errors.name = '请输入姓名';
    }

    const idCardResult = validateIdCard(formData.idCard);
    if (!idCardResult.valid) {
      errors.idCard = idCardResult.message;
    }

    const phoneResult = validatePhone(formData.phone);
    if (!phoneResult.valid) {
      errors.phone = phoneResult.message;
    }

    if (!intervalStatus?.valid) {
      errors.name = errors.name || '献血间隔不足，请选择其他日期';
    }

    if (!selectedSlot) {
      errors.name = errors.name || '请选择采血时间段';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !selectedSlot) return;

    const allocationResult = allocateStation({
      appointmentDate: selectedDate,
      timeSlot: selectedSlot.id,
      stations,
      appointments,
    });

    const newAppointment: Appointment = {
      id: generateId('apt'),
      donorId: donor.id,
      donorName: formData.name,
      idCard: formData.idCard,
      phone: formData.phone,
      stationId: allocationResult.stationId,
      stationName: allocationResult.stationName,
      appointmentDate: selectedDate,
      timeSlot: selectedSlot.id,
      timeRange: `${selectedSlot.startTime} - ${selectedSlot.endTime}`,
      status: 'pending',
      supplyUsages: [],
      createdAt: new Date().toISOString(),
    };

    addAppointment(newAppointment);
    updateDonor({ name: formData.name, idCard: formData.idCard, phone: formData.phone });
    navigate(`/result/${newAppointment.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader title="预约采血" showBack />

      <div className="p-4 space-y-4">
        {/* 献血间隔校验卡 */}
        <div className={`card ${intervalStatus?.valid ? '' : 'border-amber-200'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              intervalStatus?.valid ? 'bg-secondary-50' : 'bg-amber-50'
            }`}>
              {intervalStatus?.valid ? (
                <CheckCircle2 className="w-5 h-5 text-secondary-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={`font-medium ${intervalStatus?.valid ? 'text-surface-800' : 'text-amber-800'}`}>
                  {intervalStatus?.valid ? '献血间隔校验通过' : '献血间隔校验提醒'}
                </h4>
              </div>
              <p className={`text-sm mt-1 ${intervalStatus?.valid ? 'text-surface-600' : 'text-amber-700'}`}>
                {intervalStatus?.message}
              </p>
              {!intervalStatus?.valid && intervalStatus?.nextDonationDate && (
                <p className="text-sm text-amber-600 mt-1">
                  下次可预约日期：{intervalStatus.nextDonationDate}
                </p>
              )}
              <p className="text-xs text-surface-400 mt-2">
                {getIntervalDescription(donor.donationType, 'whole')}
              </p>
            </div>
          </div>
        </div>

        {/* 日期选择器 */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-surface-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              选择日期
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                disabled={weekOffset === 0}
                className="p-1.5 rounded-lg hover:bg-surface-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-surface-600 px-2 min-w-[80px] text-center">
                {weekDays[0].date.slice(0, 7)}
              </span>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-1.5 rounded-lg hover:bg-surface-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const isSelected = selectedDate === d.date;
              const disabled = d.isPast;
              return (
                <button
                  key={d.date}
                  onClick={() => handleDateClick(d)}
                  disabled={disabled}
                  className={`relative flex flex-col items-center py-3 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-105'
                      : disabled
                      ? 'bg-surface-50 text-surface-300'
                      : 'bg-surface-50 text-surface-700 hover:bg-primary-50 active:scale-95'
                  }`}
                >
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-surface-400'}`}>
                    {d.weekday}
                  </span>
                  <span className={`text-lg font-semibold mt-1 ${d.isToday && !isSelected ? 'text-primary-600' : ''}`}>
                    {d.day}
                  </span>
                  {d.isToday && (
                    <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'
                    }`}>
                      今天
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 时间段选择 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-secondary-600" />
            选择时间段
          </h3>

          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id;
              const isFull = slot.available === 0;
              const ratio = slot.available / slot.total;
              const tagColor = ratio > 0.5 ? 'tag-success' : ratio > 0.2 ? 'tag-warning' : 'tag-danger';

              return (
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  disabled={isFull || !intervalStatus?.valid}
                  className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : isFull
                      ? 'border-surface-100 bg-surface-50 opacity-50'
                      : 'border-surface-100 bg-white hover:border-primary-200 active:scale-[0.97]'
                  }`}
                >
                  <div className="text-sm font-semibold text-surface-800">
                    {slot.startTime}
                  </div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    ~{slot.endTime}
                  </div>
                  <div className={`mt-2 tag ${isFull ? 'tag-default' : tagColor}`}>
                    {isFull ? '已满' : `余${slot.available}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 个人信息表单 */}
        <div className="card">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-violet-500" />
            个人信息
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-surface-600 mb-1.5 block">姓名</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className={`input-field ${formErrors.name ? 'border-primary-400 focus:ring-primary-100' : ''}`}
                  placeholder="请输入真实姓名"
                />
              </div>
              {formErrors.name && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-surface-600 mb-1.5 block">身份证号</label>
              <input
                type="text"
                value={formData.idCard}
                onChange={(e) => setFormData((f) => ({ ...f, idCard: e.target.value }))}
                className={`input-field ${formErrors.idCard ? 'border-primary-400 focus:ring-primary-100' : ''}`}
                placeholder="请输入18位身份证号"
                maxLength={18}
              />
              {formErrors.idCard && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.idCard}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-surface-600 mb-1.5 block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> 手机号
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                className={`input-field ${formErrors.phone ? 'border-primary-400 focus:ring-primary-100' : ''}`}
                placeholder="请输入11位手机号"
                maxLength={11}
              />
              {formErrors.phone && (
                <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 分配说明 */}
        <div className="card bg-gradient-to-br from-secondary-50 to-white border-secondary-100">
          <div className="flex items-start gap-3">
            <Droplets className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-surface-800">智能分配采血位</h4>
              <p className="text-sm text-surface-600 mt-1">
                系统将根据各采血位的实时负载情况智能分配，采用"负载均衡+避免碎片"算法，确保资源利用最优化。
              </p>
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={!intervalStatus?.valid}
          className="btn-primary w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <CalendarPlus className="w-5 h-5" />
          确认预约并智能分配
        </button>
      </div>
    </div>
  );
}
