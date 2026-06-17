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
  getOutboundPreview: (
    items: { supplyType: SupplyType; batchId: string; quantity: number }[],
  ) => {
    details: {
      batchNo: string;
      supplyTypeName: string;
      quantity: number;
      expiryDate: string;
      remainingAfter: number;
      isExpiring: boolean;
      isNearExpiry: boolean;
    }[];
    warnings: string[];
    totalQuantity: number;
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
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0];

        const validBatches = get()
          .batches.filter(
            (b) =>
              b.supplyType === type &&
              b.remainingQuantity > 0 &&
              b.expiryDate >= today,
          )
          .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

        if (validBatches.length === 0) {
          return { batch: null, reason: '该类型无可用库存（已过期或无货）', alternatives: [] };
        }

        const expiringSoon = validBatches.filter(
          (b) => b.expiryDate <= sevenDaysLater,
        );
        const hasEnoughExpiring = expiringSoon.find(
          (b) => b.remainingQuantity >= quantity,
        );

        if (hasEnoughExpiring) {
          const daysLeft = Math.ceil(
            (new Date(hasEnoughExpiring.expiryDate).getTime() - new Date(today).getTime()) /
              (24 * 3600 * 1000),
          );
          return {
            batch: hasEnoughExpiring,
            reason: `临期优先（${hasEnoughExpiring.expiryDate}到期，剩余${daysLeft}天）`,
            alternatives: validBatches.filter((b) => b.id !== hasEnoughExpiring.id),
          };
        }

        const nearExpiry = validBatches.filter(
          (b) => b.expiryDate > sevenDaysLater && b.expiryDate <= thirtyDaysLater,
        );
        const hasEnoughNear = nearExpiry.find((b) => b.remainingQuantity >= quantity);

        if (hasEnoughNear) {
          const daysLeft = Math.ceil(
            (new Date(hasEnoughNear.expiryDate).getTime() - new Date(today).getTime()) /
              (24 * 3600 * 1000),
          );
          return {
            batch: hasEnoughNear,
            reason: `近效期优先（${hasEnoughNear.expiryDate}到期，剩余${daysLeft}天）`,
            alternatives: validBatches.filter((b) => b.id !== hasEnoughNear.id),
          };
        }

        const hasEnough = validBatches.find((b) => b.remainingQuantity >= quantity);
        if (hasEnough) {
          const daysLeft = Math.ceil(
            (new Date(hasEnough.expiryDate).getTime() - new Date(today).getTime()) /
              (24 * 3600 * 1000),
          );
          return {
            batch: hasEnough,
            reason: `库存充足（${hasEnough.remainingQuantity}件，${hasEnough.expiryDate}到期，${daysLeft}天效期）`,
            alternatives: validBatches.filter((b) => b.id !== hasEnough.id),
          };
        }

        const totalAvailable = validBatches.reduce(
          (sum, b) => sum + b.remainingQuantity,
          0,
        );
        return {
          batch: validBatches[0],
          reason: `库存不足！需${quantity}件，可用${totalAvailable}件`,
          alternatives: validBatches.slice(1),
        };
      },

      validateSupplyRequest: (items) => {
        const today = new Date().toISOString().split('T')[0];
        const errors: { type: SupplyType; message: string }[] = [];

        items.forEach((item) => {
          const batch = get().batches.find((b) => b.id === item.batchId);
          if (!batch) {
            errors.push({ type: item.supplyType, message: '批次不存在' });
            return;
          }
          if (batch.expiryDate < today) {
            errors.push({
              type: item.supplyType,
              message: `${batch.batchNo}已过期（${batch.expiryDate}到期），请更换批次`,
            });
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

      getOutboundPreview: (items) => {
        const today = new Date().toISOString().split('T')[0];
        const warnings: string[] = [];
        const details: {
          batchNo: string;
          supplyTypeName: string;
          quantity: number;
          expiryDate: string;
          remainingAfter: number;
          isExpiring: boolean;
          isNearExpiry: boolean;
        }[] = [];
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 3600 * 1000)
          .toISOString()
          .split('T')[0];

        items.forEach((item) => {
          if (item.quantity <= 0) return;
          const batch = get().batches.find((b) => b.id === item.batchId);
          if (!batch) return;

          const isExpiring = batch.expiryDate <= sevenDaysLater;
          const isNearExpiry =
            batch.expiryDate > sevenDaysLater &&
            batch.expiryDate <=
              new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

          details.push({
            batchNo: batch.batchNo,
            supplyTypeName: batch.supplyTypeName,
            quantity: item.quantity,
            expiryDate: batch.expiryDate,
            remainingAfter: batch.remainingQuantity - item.quantity,
            isExpiring,
            isNearExpiry,
          });

          if (isExpiring) {
            warnings.push(
              `${batch.supplyTypeName}批次${batch.batchNo}临期（${batch.expiryDate}到期）`,
            );
          }
        });

        return {
          details,
          warnings,
          totalQuantity: details.reduce((s, d) => s + d.quantity, 0),
        };
      },
    }),
    {
      name: 'blood-donation-supply',
      partialize: (state) => ({ batches: state.batches, usages: state.usages }),
    },
  ),
);
