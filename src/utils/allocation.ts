import type { Station, Appointment, StationAllocationResult } from '@/types';

interface AllocationContext {
  appointmentDate: string;
  timeSlot: string;
  stations: Station[];
  appointments: Appointment[];
}

export function allocateStation(ctx: AllocationContext): StationAllocationResult {
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
    .filter((s) => s.status !== 'maintenance')
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
    const fallback = stations.find((s) => s.status !== 'maintenance')!;
    return {
      stationId: fallback.id,
      stationName: fallback.name,
      score: 0,
      reason: '剩余容量紧张，强制分配',
    };
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
