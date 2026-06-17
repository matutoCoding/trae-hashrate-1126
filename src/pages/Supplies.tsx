import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Calendar, AlertTriangle, TrendingDown, Eye, Save, X, SplitSquareHorizontal, Filter, AlertCircle } from 'lucide-react';
import { useSupplyStore } from '@/store/supplyStore';
import { generateId, supplyTypeMap } from '@/utils/mock';
import PageHeader from '@/components/layout/PageHeader';
import type { SupplyBatch, SupplyType } from '@/types';

export default function Supplies() {
  const navigate = useNavigate();
  const { batches, addBatch, splitOutbound, getBatchUsages } = useSupplyStore();
  const today = new Date();

  const [showForm, setShowForm] = useState(false);
  const [showSplit, setShowSplit] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<SupplyType | 'all'>('all');
  const [formData, setFormData] = useState({
    batchNo: '',
    supplyType: 'needle' as SupplyType,
    totalQuantity: '500',
    expiryDate: new Date(today.setMonth(today.getMonth() + 6)).toISOString().split('T')[0],
  });
  const [splitData, setSplitData] = useState({
    quantity: '10',
    appointmentId: '',
    donorName: '',
    direction: '全血采集',
  });
  const [splitError, setSplitError] = useState<string>('');

  const filteredBatches = useMemo(() => {
    let list = [...batches];
    if (filterType !== 'all') {
      list = list.filter((b) => b.supplyType === filterType);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [batches, filterType]);

  const stats = useMemo(() => {
    const totalValue = batches.reduce((s, b) => s + b.totalQuantity, 0);
    const remainValue = batches.reduce((s, b) => s + b.remainingQuantity, 0);
    const lowStock = batches.filter(
      (b) => b.remainingQuantity <= b.totalQuantity * 0.1 || b.remainingQuantity < 50,
    ).length;
    const nearExpiry = batches.filter((b) => {
      const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
      return days <= 90;
    }).length;
    return { totalValue, remainValue, lowStock, nearExpiry };
  }, [batches]);

  const handleAddBatch = () => {
    if (!formData.batchNo.trim()) return;

    const typeInfo = supplyTypeMap[formData.supplyType];
    const newBatch: SupplyBatch = {
      id: generateId('sb'),
      batchNo: formData.batchNo.toUpperCase(),
      supplyType: formData.supplyType,
      supplyTypeName: typeInfo.name,
      totalQuantity: parseInt(formData.totalQuantity) || 0,
      remainingQuantity: parseInt(formData.totalQuantity) || 0,
      expiryDate: formData.expiryDate,
      createdAt: new Date().toISOString().split('T')[0],
    };
    addBatch(newBatch);
    setShowForm(false);
  };

  const handleSplit = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    const qty = parseInt(splitData.quantity) || 0;

    if (qty <= 0) {
      setSplitError('请输入有效的出库数量');
      return;
    }

    if (!splitData.donorName.trim()) {
      setSplitError('请输入献血者姓名');
      return;
    }

    if (qty > batch.remainingQuantity) {
      setSplitError(`出库数量不能超过剩余库存 ${batch.remainingQuantity}${supplyTypeMap[batch.supplyType].unit}`);
      return;
    }

    setSplitError('');

    const result = splitOutbound(
      batchId,
      qty,
      splitData.appointmentId || generateId('apt'),
      splitData.donorName,
      splitData.direction,
    );

    if (result) {
      setShowSplit(null);
      setSplitData({ quantity: '10', appointmentId: '', donorName: '', direction: '全血采集' });
    }
  };

  const getExpiryInfo = (expiryDate: string) => {
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return { text: '已过期', color: 'bg-primary-50 text-primary-700', urgent: true };
    if (days <= 30) return { text: `${days}天后过期`, color: 'bg-primary-50 text-primary-700', urgent: true };
    if (days <= 90) return { text: `${days}天后过期`, color: 'bg-amber-50 text-amber-700', urgent: true };
    return { text: `${days}天后过期`, color: 'bg-emerald-50 text-emerald-700', urgent: false };
  };

  return (
    <div className="min-h-screen bg-surface-100 safe-bottom animate-fade-in">
      <PageHeader
        title="耗材批次"
        right={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            入库
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* 统计卡 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">总量入库</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</div>
          </div>
          <div className="card p-4 bg-gradient-to-br from-secondary-600 to-secondary-800 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/80">当前剩余</span>
            </div>
            <div className="text-2xl font-bold">{stats.remainValue.toLocaleString()}</div>
          </div>
        </div>

        {/* 预警提示 */}
        {(stats.lowStock > 0 || stats.nearExpiry > 0) && (
          <div className="card bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex flex-wrap gap-3 text-sm">
                  {stats.lowStock > 0 && (
                    <span className="text-amber-700">
                      <strong>{stats.lowStock}</strong> 种库存不足
                    </span>
                  )}
                  {stats.nearExpiry > 0 && (
                    <span className="text-amber-700">
                      <strong>{stats.nearExpiry}</strong> 种临期
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 类型筛选 */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          <Filter className="w-4 h-4 text-surface-400 flex-shrink-0" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-surface-600'
            }`}
          >
            全部
          </button>
          {Object.entries(supplyTypeMap).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFilterType(key as SupplyType)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                filterType === key ? 'bg-primary-600 text-white' : 'bg-white text-surface-600'
              }`}
            >
              <span>{val.icon}</span>
              {val.name}
            </button>
          ))}
        </div>

        {/* 批次列表 */}
        <div className="space-y-3">
          {filteredBatches.map((batch, idx) => {
            const ratio = batch.totalQuantity > 0 ? batch.remainingQuantity / batch.totalQuantity : 0;
            const usedCount = getBatchUsages(batch.id).length;
            const typeInfo = supplyTypeMap[batch.supplyType];
            const expiry = getExpiryInfo(batch.expiryDate);
            const barColor =
              ratio > 0.5 ? 'bg-secondary-500' : ratio > 0.2 ? 'bg-amber-500' : 'bg-primary-500';
            return (
              <div
                key={batch.id}
                className="card card-hover animate-slide-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-secondary-100 flex items-center justify-center text-2xl">
                      {typeInfo.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-surface-800">{batch.supplyTypeName}</h4>
                        {ratio <= 0.2 && (
                          <span className="tag tag-danger">库存告急</span>
                        )}
                      </div>
                      <div className="text-sm text-surface-500 font-mono">{batch.batchNo}</div>
                    </div>
                  </div>
                  <span className={`tag ${expiry.color}`}>
                    <Calendar className="w-3 h-3" />
                    {expiry.text}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-surface-600">剩余量</span>
                    <span className="font-semibold text-surface-800">
                      {batch.remainingQuantity} / {batch.totalQuantity} {typeInfo.unit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-inner ${barColor}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-surface-400 mt-1.5">
                    <span>已使用 {Math.round((1 - ratio) * 100)}%</span>
                    <span>拆单 {usedCount} 次</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSplit(batch.id);
                      setSplitError('');
                    }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SplitSquareHorizontal className="w-4 h-4" />
                    拆分出库
                  </button>
                  <button
                    onClick={() => navigate('/tracking')}
                    className="flex-1 py-2 rounded-xl text-sm font-medium bg-secondary-50 text-secondary-700 hover:bg-secondary-100 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    追踪详情
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 入库表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
          <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-surface-900">耗材入库登记</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-surface-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">耗材类型</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(supplyTypeMap).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setFormData((f) => ({ ...f, supplyType: key as SupplyType }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        formData.supplyType === key
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-100 bg-surface-50'
                      }`}
                    >
                      <div className="text-xl">{val.icon}</div>
                      <div className="text-sm font-medium text-surface-800 mt-1">{val.name}</div>
                      <div className="text-xs text-surface-400">单位：{val.unit}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">批次编号</label>
                <input
                  type="text"
                  value={formData.batchNo}
                  onChange={(e) => setFormData((f) => ({ ...f, batchNo: e.target.value }))}
                  className="input-field"
                  placeholder="如：XZ-2026-0615-A"
                />
              </div>

              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">入库数量</label>
                <input
                  type="number"
                  min="1"
                  value={formData.totalQuantity}
                  onChange={(e) => setFormData((f) => ({ ...f, totalQuantity: e.target.value }))}
                  className="input-field"
                  placeholder="请输入入库数量"
                />
              </div>

              <div>
                <label className="text-sm text-surface-600 mb-1.5 block">有效期至</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData((f) => ({ ...f, expiryDate: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                取消
              </button>
              <button onClick={handleAddBatch} className="btn-primary flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                确认入库
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 拆分出库弹窗 */}
      {showSplit && (() => {
        const batch = batches.find((b) => b.id === showSplit);
        if (!batch) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in">
            <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900">拆分出库</h3>
                <button onClick={() => setShowSplit(null)} className="p-2 rounded-full hover:bg-surface-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{supplyTypeMap[batch.supplyType].icon}</div>
                  <div>
                    <div className="font-semibold text-surface-800">{batch.supplyTypeName}</div>
                    <div className="text-xs text-surface-400 font-mono">{batch.batchNo}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-lg font-bold text-primary-600">{batch.remainingQuantity}</div>
                    <div className="text-xs text-surface-400">可出库数量</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-surface-600 mb-1.5 block">出库数量</label>
                  <input
                    type="number"
                    min="1"
                    max={batch.remainingQuantity}
                    value={splitData.quantity}
                    onChange={(e) => {
                      setSplitData((f) => ({ ...f, quantity: e.target.value }));
                      setSplitError('');
                    }}
                    className={`input-field ${splitError ? 'border-primary-400 focus:ring-primary-100' : ''}`}
                  />
                  {splitError && (
                    <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {splitError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-surface-600 mb-1.5 block">献血者姓名</label>
                  <input
                    type="text"
                    value={splitData.donorName}
                    onChange={(e) => setSplitData((f) => ({ ...f, donorName: e.target.value }))}
                    className="input-field"
                    placeholder="请输入献血者姓名"
                  />
                </div>
                <div>
                  <label className="text-sm text-surface-600 mb-1.5 block">去向用途</label>
                  <select
                    value={splitData.direction}
                    onChange={(e) => setSplitData((f) => ({ ...f, direction: e.target.value }))}
                    className="input-field"
                  >
                    <option>全血采集</option>
                    <option>成分血采集</option>
                    <option>留样检测</option>
                    <option>皮肤消毒</option>
                    <option>应急使用</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => setShowSplit(null)} className="btn-secondary">
                  取消
                </button>
                <button
                  onClick={() => handleSplit(batch.id)}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <SplitSquareHorizontal className="w-4 h-4" />
                  确认出库
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
