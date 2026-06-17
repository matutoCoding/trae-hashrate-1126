import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupplyBatch, SupplyUsage, SupplyType } from '@/types';
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
    stationId: string,
    stationName: string,
    supplyType: SupplyType,
    supplyTypeName: string,
  ) => SupplyUsage | null;
  addUsage: (usage: SupplyUsage) => void;
  getLowStockBatches: () => SupplyBatch[];
  getBatchUsages: (batchId: string) => SupplyUsage[];
  getAppointmentUsages: (appointmentId: string) => SupplyUsage[];
  getStationUsages: (stationId: string, date?: string) => SupplyUsage[];
  getUsagesByDirection: (direction: string) => SupplyUsage[];
  getUsageByDate: (date: string) => SupplyUsage[];
  getRecommendedBatch: (type: SupplyType, quantity: number) => {
    batch: SupplyBatch | null;
    reason: string;
    alternatives: SupplyBatch[];
  };
  validateSupplyRequest: (
    items: { supplyType: SupplyType; batchId: string; quantity: number }[],
  ) => {
    valid: boolean;
    errors: { type: SupplyType; message: string }[];
  };
}

export type { SupplyState };

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

      splitOutbound: (
        batchId,
        quantity,
        appointmentId,
        donorName,
        direction,
        stationId,
        stationName,
        supplyType,
        supplyTypeName,
      ) => {
        const batch = get().batches.find((b) => b.id === batchId);
        if (!batch || batch.remainingQuantity < quantity) return null;

        const usage: SupplyUsage = {
          id: `su${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`,
          batchId: batch.id,
          batchNo: batch.batchNo,
          appointmentId,
          donorName,
          stationId,
          stationName,
          quantity,
          direction,
          supplyType,
          supplyTypeName,
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

      getAppointmentUsages: (appointmentId) => {
        return get().usages.filter((u) => u.appointmentId === appointmentId);
      },

      getStationUsages: (stationId, date) => {
        let list = get().usages.filter((u) => u.stationId === stationId);
        if (date) {
          list = list.filter((u) => u.usedAt.startsWith(date));
        }
        return list;
      },

      getUsagesByDirection: (direction) => {
        return get().usages.filter((u) => u.direction === direction);
      },

      getUsageByDate: (date) => {
        return get().usages.filter((u) => u.usedAt.startsWith(date));
      },

      getRecommendedBatch: (type, quantity) => {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0];

        const sameTypeBatches = get()
          .batches.filter((b) => b.supplyType === type && b.remainingQuantity > 0)
          .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

        if (sameTypeBatches.length === 0) {
          return { batch: null, reason: '该类型无可用库存', alternatives: [] };
        }

        const expiringSoon = sameTypeBatches.filter((b) => b.expiryDate <= thirtyDaysLater);
        const hasEnoughExpiring = expiringSoon.find((b) => b.remainingQuantity >= quantity);

        if (hasEnoughExpiring) {
          return {
            batch: hasEnoughExpiring,
            reason: `临期优先（${hasEnoughExpiring.expiryDate}到期）`,
            alternatives: sameTypeBatches.filter((b) => b.id !== hasEnoughExpiring.id),
          };
        }

        const hasEnough = sameTypeBatches.find((b) => b.remainingQuantity >= quantity);
        if (hasEnough) {
          return {
            batch: hasEnough,
            reason: `库存充足（${hasEnough.remainingQuantity}件，${hasEnough.expiryDate}到期）`,
            alternatives: sameTypeBatches.filter((b) => b.id !== hasEnough.id),
          };
        }

        const totalAvailable = sameTypeBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
        return {
          batch: sameTypeBatches[0],
          reason: `库存不足！需${quantity}件，可用${totalAvailable}件`,
          alternatives: sameTypeBatches.slice(1),
        };
      },

      validateSupplyRequest: (items) => {
        const errors: { type: SupplyType; message: string }[] = [];

        items.forEach((item) => {
          const batch = get().batches.find((b) => b.id === item.batchId);
          if (!batch) {
            errors.push({ type: item.supplyType, message: '批次不存在' });
            return;
          }
          if (batch.remainingQuantity < item.quantity) {
            errors.push({
              type: item.supplyType,
              message: `${batch.batchNo}剩余${batch.remainingQuantity}件，需${item.quantity}件，不足`,
            });
          }
        });

        return { valid: errors.length === 0, errors };
      },
    }),
    {
      name: 'blood-donation-supply',
      partialize: (state) => ({ batches: state.batches, usages: state.usages }),
    },
  ),
);
