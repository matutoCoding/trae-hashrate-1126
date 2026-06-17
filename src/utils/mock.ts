import type {
  Station,
  TimeSlot,
  Appointment,
  SupplyBatch,
  SupplyUsage,
  Donor,
  DonationRecord,
} from '@/types';

const today = new Date();
const formatDate = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, days: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
};

export const mockStations: Station[] = [
  { id: 'st1', name: 'A01采血位', location: '采血车一层-左1', status: 'idle', capacity: 10, todayAppointments: 3 },
  { id: 'st2', name: 'A02采血位', location: '采血车一层-左2', status: 'occupied', capacity: 10, todayAppointments: 6 },
  { id: 'st3', name: 'A03采血位', location: '采血车一层-右1', status: 'idle', capacity: 10, todayAppointments: 4 },
  { id: 'st4', name: 'B01采血位', location: '采血车二层-1号', status: 'idle', capacity: 8, todayAppointments: 2 },
  { id: 'st5', name: 'B02采血位', location: '采血车二层-2号', status: 'maintenance', capacity: 8, todayAppointments: 0 },
  { id: 'st6', name: 'B03采血位', location: '采血车二层-3号', status: 'idle', capacity: 8, todayAppointments: 5 },
];

export const generateTimeSlots = (date: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const baseCapacity = 60;
  const seed = date.split('-').reduce((a, b) => a + parseInt(b), 0);

  for (let hour = 8; hour < 17; hour++) {
    if (hour === 12) continue;
    for (let min = 0; min < 60; min += 30) {
      const startH = hour.toString().padStart(2, '0');
      const startM = min.toString().padStart(2, '0');
      const endMin = min + 30;
      const endH = (endMin >= 60 ? hour + 1 : hour).toString().padStart(2, '0');
      const endM = (endMin % 60).toString().padStart(2, '0');

      const pseudoRand = ((seed + hour * 7 + min * 13) % 11);
      const used = Math.min(baseCapacity, 20 + pseudoRand * 4);

      slots.push({
        id: `${startH}${startM}`,
        startTime: `${startH}:${startM}`,
        endTime: `${endH}:${endM}`,
        available: Math.max(0, baseCapacity - used),
        total: baseCapacity,
      });
    }
  }
  return slots;
};

export const mockAppointments: Appointment[] = [
  {
    id: 'apt1',
    donorId: 'd1',
    donorName: '张三',
    idCard: '110101199001011234',
    phone: '13800138001',
    stationId: 'st1',
    stationName: 'A01采血位',
    appointmentDate: formatDate(today),
    timeSlot: '0800',
    timeRange: '08:00 - 08:30',
    status: 'completed',
    supplyUsages: ['su1', 'su2'],
    createdAt: formatDate(addDays(today, -1)) + 'T09:30:00',
    completedAt: formatDate(today) + 'T08:15:00',
  },
  {
    id: 'apt2',
    donorId: 'd2',
    donorName: '李四',
    idCard: '110101199203154321',
    phone: '13900139002',
    stationId: 'st3',
    stationName: 'A03采血位',
    appointmentDate: formatDate(today),
    timeSlot: '0900',
    timeRange: '09:00 - 09:30',
    status: 'confirmed',
    supplyUsages: [],
    createdAt: formatDate(addDays(today, -2)) + 'T14:20:00',
  },
  {
    id: 'apt3',
    donorId: 'd3',
    donorName: '王五',
    idCard: '110101198812255678',
    phone: '13700137003',
    stationId: 'st2',
    stationName: 'A02采血位',
    appointmentDate: formatDate(today),
    timeSlot: '1000',
    timeRange: '10:00 - 10:30',
    status: 'pending',
    supplyUsages: [],
    createdAt: formatDate(addDays(today, -3)) + 'T11:05:00',
  },
  {
    id: 'apt4',
    donorId: 'd4',
    donorName: '赵六',
    idCard: '110101199507088901',
    phone: '13600136004',
    stationId: 'st6',
    stationName: 'B03采血位',
    appointmentDate: formatDate(addDays(today, 1)),
    timeSlot: '1400',
    timeRange: '14:00 - 14:30',
    status: 'pending',
    supplyUsages: [],
    createdAt: formatDate(addDays(today, -1)) + 'T16:45:00',
  },
];

export const mockSupplyBatches: SupplyBatch[] = [
  {
    id: 'sb1',
    batchNo: 'XZ-2026-0601-A',
    supplyType: 'needle',
    supplyTypeName: '采血针',
    totalQuantity: 500,
    remainingQuantity: 326,
    expiryDate: formatDate(addDays(today, 180)),
    createdAt: formatDate(addDays(today, -10)),
  },
  {
    id: 'sb2',
    batchNo: 'XD-2026-0515-B',
    supplyType: 'bag',
    supplyTypeName: '采血袋(400ml)',
    totalQuantity: 200,
    remainingQuantity: 145,
    expiryDate: formatDate(addDays(today, 150)),
    createdAt: formatDate(addDays(today, -20)),
  },
  {
    id: 'sb3',
    batchNo: 'CG-2026-0605-C',
    supplyType: 'tube',
    supplyTypeName: '采血管',
    totalQuantity: 1000,
    remainingQuantity: 678,
    expiryDate: formatDate(addDays(today, 365)),
    createdAt: formatDate(addDays(today, -5)),
  },
  {
    id: 'sb4',
    batchNo: 'MZ-2026-0420-D',
    supplyType: 'swab',
    supplyTypeName: '消毒棉签',
    totalQuantity: 2000,
    remainingQuantity: 45,
    expiryDate: formatDate(addDays(today, 90)),
    createdAt: formatDate(addDays(today, -45)),
  },
  {
    id: 'sb5',
    batchNo: 'XZ-2026-0520-E',
    supplyType: 'needle',
    supplyTypeName: '采血针',
    totalQuantity: 300,
    remainingQuantity: 300,
    expiryDate: formatDate(addDays(today, 200)),
    createdAt: formatDate(addDays(today, -3)),
  },
];

export const mockSupplyUsages: SupplyUsage[] = [
  {
    id: 'su1',
    batchId: 'sb1',
    batchNo: 'XZ-2026-0601-A',
    appointmentId: 'apt1',
    donorName: '张三',
    stationId: 'st1',
    stationName: 'A01采血位',
    quantity: 1,
    direction: '全血采集',
    supplyType: 'needle',
    supplyTypeName: '采血针',
    usedAt: formatDate(today) + ' 08:12:00',
  },
  {
    id: 'su2',
    batchId: 'sb2',
    batchNo: 'XD-2026-0515-B',
    appointmentId: 'apt1',
    donorName: '张三',
    stationId: 'st1',
    stationName: 'A01采血位',
    quantity: 1,
    direction: '全血采集',
    supplyType: 'bag',
    supplyTypeName: '采血袋(400ml)',
    usedAt: formatDate(today) + ' 08:12:00',
  },
  {
    id: 'su3',
    batchId: 'sb3',
    batchNo: 'CG-2026-0605-C',
    appointmentId: 'apt1',
    donorName: '张三',
    stationId: 'st1',
    stationName: 'A01采血位',
    quantity: 4,
    direction: '留样检测',
    supplyType: 'tube',
    supplyTypeName: '采血管',
    usedAt: formatDate(today) + ' 08:15:00',
  },
  {
    id: 'su4',
    batchId: 'sb4',
    batchNo: 'MZ-2026-0420-D',
    appointmentId: 'apt1',
    donorName: '张三',
    stationId: 'st1',
    stationName: 'A01采血位',
    quantity: 2,
    direction: '皮肤消毒',
    supplyType: 'swab',
    supplyTypeName: '消毒棉签',
    usedAt: formatDate(today) + ' 08:05:00',
  },
];

export const mockDonor: Donor = {
  id: 'd1',
  name: '张三',
  idCard: '110101199001011234',
  phone: '13800138001',
  bloodType: 'A',
  lastDonationDate: formatDate(addDays(today, -200)),
  donationType: 'whole',
};

export const mockDonationRecords: DonationRecord[] = [
  {
    id: 'dr1',
    donorId: 'd1',
    date: formatDate(addDays(today, -200)),
    type: 'whole',
    volume: 400,
    stationName: '中心血站-主站',
  },
  {
    id: 'dr2',
    donorId: 'd1',
    date: formatDate(addDays(today, -550)),
    type: 'whole',
    volume: 400,
    stationName: '步行街采血车',
  },
  {
    id: 'dr3',
    donorId: 'd1',
    date: formatDate(addDays(today, -920)),
    type: 'component',
    volume: 200,
    stationName: '中心血站-主站',
  },
];

export const supplyTypeMap: Record<string, { name: string; icon: string; unit: string }> = {
  needle: { name: '采血针', icon: '🔬', unit: '支' },
  bag: { name: '采血袋', icon: '🩸', unit: '袋' },
  tube: { name: '采血管', icon: '🧪', unit: '支' },
  swab: { name: '消毒棉签', icon: '🧹', unit: '包' },
};

export const generateId = (prefix: string) => {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`;
};
