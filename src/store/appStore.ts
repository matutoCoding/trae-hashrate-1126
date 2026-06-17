import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Appointment,
  Station,
  Donor,
  DonationRecord,
  TabType,
  AppointmentStatus,
  ShiftRecord,
  SupplyUsage,
} from '@/types';
import { mockAppointments, mockStations, mockDonor, mockDonationRecords } from '@/utils/mock';
import { allocateStation } from '@/utils/allocation';

interface AppState {
  activeTab: TabType;
  stations: Station[];
  appointments: Appointment[];
  donor: Donor;
  donationRecords: DonationRecord[];
  shiftRecords: ShiftRecord[];
  currentCallIds: Record<string, string | null>;
  queueCounters: Record<string, number>;
  setActiveTab: (tab: TabType) => void;
  addStation: (station: Station) => void;
  updateStation: (id: string, data: Partial<Station>) => void;
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  checkInAppointment: (id: string) => void;
  callNextAppointment: (date?: string) => Appointment | null;
  recallAppointment: (id: string, date?: string) => void;
  markMissed: (id: string, date?: string) => void;
  startCollecting: (id: string, date?: string) => void;
  completeAppointment: (id: string) => void;
  markDeferred: (id: string, reason: string, date?: string) => void;
  markRescheduled: (id: string, reason: string, date?: string) => void;
  markNoShow: (id: string, reason: string, date?: string) => void;
  addDonationRecord: (record: DonationRecord) => void;
  updateDonor: (data: Partial<Donor>) => void;
  walkInRegister: (
    donorInfo: { name: string; idCard: string; phone: string },
    timeSlotId: string,
    date?: string,
  ) => Appointment | null;
  createShiftRecord: (
    date: string,
    operatorName: string,
    stations: Station[],
    supplyUsages: SupplyUsage[],
  ) => ShiftRecord | null;
  getTodayAppointments: (date?: string) => Appointment[];
  getStationAppointments: (stationId: string, date?: string) => Appointment[];
  getAppointmentsByStatus: (status: AppointmentStatus, date?: string) => Appointment[];
  getCurrentCalled: (date?: string) => Appointment | null;
  getWaitingQueue: (date?: string) => Appointment[];
  getMissedQueue: (date?: string) => Appointment[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      stations: mockStations,
      appointments: mockAppointments,
      donor: mockDonor,
      donationRecords: mockDonationRecords,
      shiftRecords: [],
      currentCallIds: {},
      queueCounters: {},

      setActiveTab: (tab) => set({ activeTab: tab }),

      addStation: (station) => {
        set((state) => ({ stations: [...state.stations, station] }));
      },

      updateStation: (id, data) => {
        set((state) => ({
          stations: state.stations.map((s) => (s.id === id ? { ...s, ...data } : s)),
        }));
      },

      addAppointment: (apt) => {
        set((state) => ({ appointments: [apt, ...state.appointments] }));
      },

      updateAppointment: (id, data) => {
        set((state) => ({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...data } : a)),
        }));
      },

      cancelAppointment: (id) => {
        get().updateAppointment(id, { status: 'cancelled', callStatus: 'done' });
      },

      checkInAppointment: (id) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const date = apt.appointmentDate;
        const currentCount = get().queueCounters[date] || 1;
        set((state) => ({
          queueCounters: { ...state.queueCounters, [date]: currentCount + 1 },
        }));
        get().updateAppointment(id, {
          status: 'checked-in',
          callStatus: 'waiting',
          queueNumber: currentCount,
        });
      },

      callNextAppointment: (date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const waiting = get()
          .appointments.filter(
            (a) =>
              a.appointmentDate === targetDate &&
              a.callStatus === 'waiting' &&
              a.status === 'checked-in',
          )
          .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));

        if (waiting.length === 0) return null;

        const next = waiting[0];
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate]) {
          get().updateAppointment(currentCallIds[targetDate]!, { callStatus: 'missed' });
        }

        get().updateAppointment(next.id, {
          status: 'called',
          callStatus: 'current',
          calledAt: new Date().toISOString(),
        });
        currentCallIds[targetDate] = next.id;
        set({ currentCallIds });

        return next;
      },

      recallAppointment: (id, date) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const targetDate = date || apt.appointmentDate;
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate]) {
          get().updateAppointment(currentCallIds[targetDate]!, { callStatus: 'missed' });
        }
        get().updateAppointment(id, {
          status: 'called',
          callStatus: 'current',
          calledAt: new Date().toISOString(),
        });
        currentCallIds[targetDate] = id;
        set({ currentCallIds });
      },

      markMissed: (id, date) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const targetDate = date || apt.appointmentDate;
        get().updateAppointment(id, { callStatus: 'missed' });
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate] === id) {
          currentCallIds[targetDate] = null;
          set({ currentCallIds });
        }
      },

      startCollecting: (id, date) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const targetDate = date || apt.appointmentDate;
        get().updateAppointment(id, { status: 'collecting', callStatus: 'done' });
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate] === id) {
          currentCallIds[targetDate] = null;
          set({ currentCallIds });
        }
      },

      completeAppointment: (id) => {
        get().updateAppointment(id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          callStatus: 'done',
        });
      },

      markDeferred: (id, reason, date) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const targetDate = date || apt.appointmentDate;
        get().updateAppointment(id, {
          status: 'deferred',
          callStatus: 'done',
          remark: reason,
        });
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate] === id) {
          currentCallIds[targetDate] = null;
          set({ currentCallIds });
        }
      },

      markRescheduled: (id, reason, date) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const targetDate = date || apt.appointmentDate;
        get().updateAppointment(id, {
          status: 'rescheduled',
          callStatus: 'done',
          remark: reason,
        });
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate] === id) {
          currentCallIds[targetDate] = null;
          set({ currentCallIds });
        }
      },

      markNoShow: (id, reason, date) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return;
        const targetDate = date || apt.appointmentDate;
        get().updateAppointment(id, {
          status: 'no-show',
          callStatus: 'missed',
          remark: reason,
        });
        const currentCallIds = { ...get().currentCallIds };
        if (currentCallIds[targetDate] === id) {
          currentCallIds[targetDate] = null;
          set({ currentCallIds });
        }
      },

      addDonationRecord: (record) => {
        set((state) => ({ donationRecords: [record, ...state.donationRecords] }));
      },

      updateDonor: (data) => {
        set((state) => ({ donor: { ...state.donor, ...data } }));
      },

      walkInRegister: (donorInfo, timeSlotId, date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const { stations, appointments } = get();

        const allocation = allocateStation({
          appointmentDate: targetDate,
          timeSlot: timeSlotId,
          stations,
          appointments,
        });

        if (!allocation) return null;

        const slot = [
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
        ].find((s) => s.id === timeSlotId);

        if (!slot) return null;

        const currentCount = get().queueCounters[targetDate] || 1;
        set((state) => ({
          queueCounters: { ...state.queueCounters, [targetDate]: currentCount + 1 },
        }));

        const apt: Appointment = {
          id: `walkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          donorId: `donor-${Date.now()}`,
          donorName: donorInfo.name,
          idCard: donorInfo.idCard,
          phone: donorInfo.phone,
          stationId: allocation.stationId,
          stationName: allocation.stationName,
          appointmentDate: targetDate,
          timeSlot: timeSlotId,
          timeRange: `${slot.start}-${slot.end}`,
          status: 'checked-in',
          callStatus: 'waiting',
          queueNumber: currentCount,
          supplyUsages: [],
          createdAt: new Date().toISOString(),
        };

        get().addAppointment(apt);
        return apt;
      },

      createShiftRecord: (date, operatorName, stations, supplyUsages) => {
        const state = get();
        const todaysApts = state.appointments.filter(
          (a) => a.appointmentDate === date && a.status !== 'cancelled',
        );

        const byStation = stations.map((s) => {
          const apts = todaysApts.filter((a) => a.stationId === s.id);
          return {
            stationId: s.id,
            stationName: s.name,
            total: apts.length,
            completed: apts.filter((a) => a.status === 'completed').length,
            collecting: apts.filter((a) => a.status === 'collecting').length,
            waiting: apts.filter(
              (a) =>
                a.status !== 'completed' &&
                a.status !== 'collecting' &&
                a.status !== 'deferred' &&
                a.status !== 'rescheduled' &&
                a.status !== 'no-show',
            ).length,
            abnormal: apts.filter(
              (a) =>
                a.status === 'deferred' || a.status === 'rescheduled' || a.status === 'no-show',
            ).length,
          };
        });

        const bySupplyMap: Record<string, number> = {};
        supplyUsages.forEach((u) => {
          bySupplyMap[u.supplyTypeName] = (bySupplyMap[u.supplyTypeName] || 0) + u.quantity;
        });

        const bySupply = Object.entries(bySupplyMap).map(([name, quantity]) => ({
          supplyTypeName: name,
          quantity,
        }));

        const abnormalList = todaysApts
          .filter(
            (a) =>
              a.status === 'deferred' ||
              a.status === 'rescheduled' ||
              a.status === 'no-show' ||
              a.callStatus === 'missed',
          )
          .map((a) => ({
            appointmentId: a.id,
            donorName: a.donorName,
            stationName: a.stationName,
            timeRange: a.timeRange,
            status: a.status,
            remark: a.callStatus === 'missed' ? '过号未到' : a.remark || '未备注',
          }));

        const totalCompleted = todaysApts.filter((a) => a.status === 'completed').length;
        const totalCollecting = todaysApts.filter((a) => a.status === 'collecting').length;
        const totalAbnormal = abnormalList.length;
        const totalSupplyUsed = supplyUsages.reduce((s, u) => s + u.quantity, 0);

        const record: ShiftRecord = {
          id: `shift-${Date.now()}`,
          date,
          closedAt: new Date().toISOString(),
          operatorName,
          summary: {
            totalAppointments: todaysApts.length,
            completed: totalCompleted,
            collecting: totalCollecting,
            abnormal: totalAbnormal,
            totalSupplyUsed,
          },
          byStation,
          bySupply,
          abnormalList,
        };

        set((state) => ({
          shiftRecords: [record, ...state.shiftRecords],
        }));

        return record;
      },

      getTodayAppointments: (date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return get().appointments.filter(
          (a) => a.appointmentDate === targetDate && a.status !== 'cancelled',
        );
      },

      getStationAppointments: (stationId, date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return get()
          .appointments.filter(
            (a) =>
              a.stationId === stationId &&
              a.appointmentDate === targetDate &&
              a.status !== 'cancelled',
          )
          .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
      },

      getAppointmentsByStatus: (status, date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return get().appointments.filter(
          (a) => a.appointmentDate === targetDate && a.status === status,
        );
      },

      getCurrentCalled: (date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const state = get();
        const callId = state.currentCallIds[targetDate];
        if (!callId) return null;
        const apt = state.appointments.find((a) => a.id === callId);
        return apt || null;
      },

      getWaitingQueue: (date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return get()
          .appointments.filter(
            (a) =>
              a.appointmentDate === targetDate &&
              a.callStatus === 'waiting' &&
              a.status === 'checked-in',
          )
          .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));
      },

      getMissedQueue: (date) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return get()
          .appointments.filter(
            (a) => a.appointmentDate === targetDate && a.callStatus === 'missed',
          )
          .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0));
      },
    }),
    {
      name: 'blood-donation-app',
      partialize: (state) => ({
        appointments: state.appointments,
        stations: state.stations,
        donor: state.donor,
        donationRecords: state.donationRecords,
        shiftRecords: state.shiftRecords,
        currentCallIds: state.currentCallIds,
        queueCounters: state.queueCounters,
      }),
    },
  ),
);
