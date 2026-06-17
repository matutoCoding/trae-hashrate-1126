import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupplyBatch, SupplyUsage } from '@/types';
import { mockSupplyBatches, mockSupplyUsages } from '@/utils/mock';

interface SupplyState {
  batches: SupplyBatch[];
  usages: SupplyUsage[];
  addBatch: (batch: SupplyBatch) => void;
  updateBatch: (id: string, data: Partial<SupplyBatch>) => void;
  splitOutbound: (
    batchId: string,
    quantity: number,
    appointmentId: string,
    donorName: string,
    direction: string,
  ) => SupplyUsage | null;
  addUsage: (usage: SupplyUsage) => void;
  getLowStockBatches: () => SupplyBatch[];
  getBatchUsages: (batchId: string) => SupplyUsage[];
}

export const useSupplyStore = create<SupplyState>()(
  persist(
    (set, get) => ({
      batches: mockSupplyBatches,
      usages: mockSupplyUsages,

      addBatch: (batch) => set((state) => ({ batches: [batch, ...state.batches] })),

      updateBatch: (id, data) =>
        set((state) => ({
          batches: state.batches.map((b) => (b.id === id ? { ...b, ...data } : b)),
        })),

      splitOutbound: (batchId, quantity, appointmentId, donorName, direction) => {
        const batch = get().batches.find((b) => b.id === batchId);
        if (!batch || batch.remainingQuantity < quantity) return null;

        const usage: SupplyUsage = {
          id: `su${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`,
          batchId: batch.id,
          batchNo: batch.batchNo,
          appointmentId,
          donorName,
          quantity,
          direction,
          usedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };

        set((state) => ({
          usages: [usage, ...state.usages],
          batches: state.batches.map((b) =>
            b.id === batchId ? { ...b, remainingQuantity: b.remainingQuantity - quantity } : b,
          ),
        }));

        return usage;
      },

      addUsage: (usage) => set((state) => ({ usages: [usage, ...state.usages] })),

      getLowStockBatches: () => {
        return get().batches.filter(
          (b) => b.remainingQuantity <= b.totalQuantity * 0.1 || b.remainingQuantity < 50,
        );
      },

      getBatchUsages: (batchId) => {
        return get().usages.filter((u) => u.batchId === batchId);
      },
    }),
    {
      name: 'blood-donation-supply',
      partialize: (state) => ({ batches: state.batches, usages: state.usages }),
    },
  ),
);
