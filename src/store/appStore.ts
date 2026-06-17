import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Appointment, Station, Donor, DonationRecord, TabType } from '@/types';
import { mockAppointments, mockStations, mockDonor, mockDonationRecords } from '@/utils/mock';

interface AppState {
  activeTab: TabType;
  stations: Station[];
  appointments: Appointment[];
  donor: Donor;
  donationRecords: DonationRecord[];
  setActiveTab: (tab: TabType) => void;
  addStation: (station: Station) => void;
  updateStation: (id: string, data: Partial<Station>) => void;
  addAppointment: (apt: Appointment) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  completeAppointment: (id: string) => void;
  addDonationRecord: (record: DonationRecord) => void;
  updateDonor: (data: Partial<Donor>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      stations: mockStations,
      appointments: mockAppointments,
      donor: mockDonor,
      donationRecords: mockDonationRecords,

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
        get().updateAppointment(id, { status: 'cancelled' });
      },

      completeAppointment: (id) => {
        get().updateAppointment(id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      },

      addDonationRecord: (record) => {
        set((state) => ({ donationRecords: [record, ...state.donationRecords] }));
      },

      updateDonor: (data) => {
        set((state) => ({ donor: { ...state.donor, ...data } }));
      },
    }),
    {
      name: 'blood-donation-app',
      partialize: (state) => ({
        appointments: state.appointments,
        stations: state.stations,
        donor: state.donor,
        donationRecords: state.donationRecords,
      }),
    },
  ),
);
