import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Appointment, Station, Donor, DonationRecord, TabType, AppointmentStatus } from '@/types';
import { mockAppointments, mockStations, mockDonor, mockDonationRecords } from '@/utils/mock';

interface AppState {
  activeTab: TabType;
  stations: Station[];
  appointments: Appointment[];
  donor: Donor;
  donationRecords: DonationRecord[];
  currentCallId: string | null;
  queueCounter: number;
  setActiveTab: (tab: TabType) => void;
  addStation: (station: Station) => void;
  updateStation: (id: string, data: Partial<Station>) => void;
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  checkInAppointment: (id: string) => void;
  callNextAppointment: (date?: string) => Appointment | null;
  recallAppointment: (id: string) => void;
  markMissed: (id: string) => void;
  startCollecting: (id: string) => void;
  completeAppointment: (id: string) => void;
  markDeferred: (id: string, reason: string) => void;
  markRescheduled: (id: string, reason: string) => void;
  markNoShow: (id: string, reason: string) => void;
  addDonationRecord: (record: DonationRecord) => void;
  updateDonor: (data: Partial<Donor>) => void;
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
      currentCallId: null,
      queueCounter: 1,

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
        const state = get();
        const nextQueue = state.queueCounter;
        set({ queueCounter: nextQueue + 1 });
        get().updateAppointment(id, {
          status: 'checked-in',
          callStatus: 'waiting',
          queueNumber: nextQueue,
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

        if (get().currentCallId) {
          get().updateAppointment(get().currentCallId!, { callStatus: 'missed' });
        }

        get().updateAppointment(next.id, {
          status: 'called',
          callStatus: 'current',
          calledAt: new Date().toISOString(),
        });
        set({ currentCallId: next.id });

        return next;
      },

      recallAppointment: (id) => {
        if (get().currentCallId) {
          get().updateAppointment(get().currentCallId!, { callStatus: 'missed' });
        }
        get().updateAppointment(id, {
          status: 'called',
          callStatus: 'current',
          calledAt: new Date().toISOString(),
        });
        set({ currentCallId: id });
      },

      markMissed: (id) => {
        get().updateAppointment(id, { callStatus: 'missed' });
        if (get().currentCallId === id) {
          set({ currentCallId: null });
        }
      },

      startCollecting: (id) => {
        get().updateAppointment(id, { status: 'collecting', callStatus: 'done' });
        if (get().currentCallId === id) {
          set({ currentCallId: null });
        }
      },

      completeAppointment: (id) => {
        get().updateAppointment(id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          callStatus: 'done',
        });
      },

      markDeferred: (id, reason) => {
        get().updateAppointment(id, {
          status: 'deferred',
          callStatus: 'done',
          remark: reason,
        });
        if (get().currentCallId === id) {
          set({ currentCallId: null });
        }
      },

      markRescheduled: (id, reason) => {
        get().updateAppointment(id, {
          status: 'rescheduled',
          callStatus: 'done',
          remark: reason,
        });
        if (get().currentCallId === id) {
          set({ currentCallId: null });
        }
      },

      markNoShow: (id, reason) => {
        get().updateAppointment(id, {
          status: 'no-show',
          callStatus: 'missed',
          remark: reason,
        });
        if (get().currentCallId === id) {
          set({ currentCallId: null });
        }
      },

      addDonationRecord: (record) => {
        set((state) => ({ donationRecords: [record, ...state.donationRecords] }));
      },

      updateDonor: (data) => {
        set((state) => ({ donor: { ...state.donor, ...data } }));
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
        const state = get();
        if (!state.currentCallId) return null;
        const apt = state.appointments.find((a) => a.id === state.currentCallId);
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
        currentCallId: state.currentCallId,
        queueCounter: state.queueCounter,
      }),
    },
  ),
);
