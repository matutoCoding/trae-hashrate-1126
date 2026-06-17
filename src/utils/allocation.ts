import type { Station, Appointment, StationAllocationResult } from '@/types';

interface AllocationContext {
  appointmentDate: string;
  timeSlot: string;
  stations: Station[];
  appointments: Appointment[];
}

export function allocateStation(ctx: AllocationContext): StationAllocationResult | null {
  const { appointmentDate, timeSlot, stations, appointments } = ctx;

  const stationSlotUsage = new Map<string, number>();
  stations.forEach((s) => stationSlotUsage.set(s.id, 0));

  appointments
    .filter((a) => a.appointmentDate === appointmentDate && a.timeSlot === timeSlot)
    .filter((a) => a.status !== 'cancelled')
    .forEach((a) => {
      const cur = stationSlotUsage.get(a.stationId) ?? 0;
      stationSlotUsage.set(a.stationId, cur + 1);
    });

  const stationDayUsage = new Map<string, number>();
  stations.forEach((s) => stationDayUsage.set(s.id, 0));
  appointments
    .filter((a) => a.appointmentDate === appointmentDate)
    .filter((a) => a.status !== 'cancelled')
    .forEach((a) => {
      const cur = stationDayUsage.get(a.stationId) ?? 0;
      stationDayUsage.set(a.stationId, cur + 1);
    });

  const slotIndex = parseInt(timeSlot);
  const prevSlots = [`${(slotIndex - 100).toString().padStart(4, '0')}`];
  const nextSlots = [`${(slotIndex + 100).toString().padStart(4, '0')}`];
  const adjUsage = new Map<string, number>();
  stations.forEach((s) => adjUsage.set(s.id, 0));
  appointments
    .filter((a) => a.appointmentDate === appointmentDate)
    .filter((a) => a.status !== 'cancelled')
    .filter((a) => [...prevSlots, ...nextSlots].includes(a.timeSlot))
    .forEach((a) => {
      const cur = adjUsage.get(a.stationId) ?? 0;
      adjUsage.set(a.stationId, cur + 1);
    });

  const candidates = stations
    .filter((s) => s.status === 'idle')
    .map((s) => {
      const slotUsed = stationSlotUsage.get(s.id) ?? 0;
      const remaining = s.capacity - slotUsed;
      if (remaining <= 0) return null;

      const capacityScore = (remaining / s.capacity) * 40;

      const dayUsed = stationDayUsage.get(s.id) ?? 0;
      const maxDayUsed = Math.max(...stationDayUsage.values(), 1);
      const loadScore = ((maxDayUsed - dayUsed) / maxDayUsed) * 30;

      const adj = adjUsage.get(s.id) ?? 0;
      const adjScore = Math.min(adj * 10, 30);

      const score = Math.round(capacityScore + loadScore + adjScore);

      let reason = '';
      if (remaining >= s.capacity * 0.7) reason += '剩余容量充足 ';
      if (dayUsed < Math.max(...stationDayUsage.values())) reason += '负载均衡优选 ';
      if (adj > 0) reason += '相邻时段预约集中';

      return {
        stationId: s.id,
        stationName: s.name,
        score,
        reason: reason.trim() || '系统智能分配',
      };
    })
    .filter((x): x is StationAllocationResult => x !== null)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0];
}

export function getDonationDistribution(
  stations: Station[],
  appointments: Appointment[],
  date: string,
): { name: string; value: number }[] {
  const result = new Map<string, number>();
  stations.forEach((s) => result.set(s.name, 0));
  appointments
    .filter((a) => a.appointmentDate === date)
    .filter((a) => a.status !== 'cancelled')
    .forEach((a) => {
      const cur = result.get(a.stationName) ?? 0;
      result.set(a.stationName, cur + 1);
    });
  return Array.from(result.entries()).map(([name, value]) => ({ name, value }));
}

export function getAvailableSlotCount(
  date: string,
  timeSlotId: string,
  stations: Station[],
  appointments: Appointment[],
): { total: number; available: number; idleStations: number } {
  const idleStations = stations.filter((s) => s.status === 'idle');
  const totalCapacity = idleStations.reduce((sum, s) => sum + s.capacity, 0);

  const usedCount = appointments.filter(
    (a) =>
      a.appointmentDate === date &&
      a.timeSlot === timeSlotId &&
      a.status !== 'cancelled' &&
      idleStations.some((s) => s.id === a.stationId),
  ).length;

  return {
    total: totalCapacity,
    available: Math.max(0, totalCapacity - usedCount),
    idleStations: idleStations.length,
  };
}

export function getSlotOccupancy(
  date: string,
  timeSlotId: string,
  stations: Station[],
  appointments: Appointment[],
): {
  total: number;
  used: number;
  byStatus: Record<string, number>;
  appointments: Appointment[];
} {
  const slotApps = appointments.filter(
    (a) => a.appointmentDate === date && a.timeSlot === timeSlotId && a.status !== 'cancelled',
  );

  const totalCapacity = stations.reduce((sum, s) => sum + s.capacity, 0);

  const byStatus: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    'checked-in': 0,
    collecting: 0,
    completed: 0,
  };
  slotApps.forEach((a) => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  });

  return {
    total: totalCapacity,
    used: slotApps.length,
    byStatus,
    appointments: slotApps.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
  };
}
