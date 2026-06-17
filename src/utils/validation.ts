import type { ValidationResult, DonationRecord } from '@/types';

const WHOLE_TO_WHOLE = 180;
const WHOLE_TO_COMPONENT = 90;
const COMPONENT_TO_COMPONENT = 14;
const COMPONENT_TO_WHOLE = 28;

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const daysBetween = (from: string, to: string): number => {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  return Math.floor((t - f) / (1000 * 60 * 60 * 24));
};

export function validateDonationInterval(
  lastDate: string | null,
  lastType: 'whole' | 'component' | null,
  planType: 'whole' | 'component' = 'whole',
  planDate: string = formatDate(new Date()),
): ValidationResult {
  if (!lastDate || !lastType) {
    return { valid: true, message: '无献血记录，可正常预约' };
  }

  let requiredDays = 0;
  if (lastType === 'whole' && planType === 'whole') requiredDays = WHOLE_TO_WHOLE;
  else if (lastType === 'whole' && planType === 'component') requiredDays = WHOLE_TO_COMPONENT;
  else if (lastType === 'component' && planType === 'component') requiredDays = COMPONENT_TO_COMPONENT;
  else if (lastType === 'component' && planType === 'whole') requiredDays = COMPONENT_TO_WHOLE;

  const passedDays = daysBetween(lastDate, planDate);
  const remaining = requiredDays - passedDays;

  if (passedDays >= requiredDays) {
    return {
      valid: true,
      message: `献血间隔符合要求，距上次献血已过${passedDays}天`,
      daysRemaining: 0,
      nextDonationDate: planDate,
    };
  }

  const nextDate = addDays(lastDate, requiredDays);
  return {
    valid: false,
    message: `献血间隔不足，上次${lastType === 'whole' ? '全血' : '成分血'}献血距今仅${passedDays}天，需满${requiredDays}天`,
    daysRemaining: remaining,
    nextDonationDate: nextDate,
  };
}

export function validateIdCard(idCard: string): { valid: boolean; message: string; birthDate?: string; gender?: string } {
  const clean = idCard.trim();

  if (clean.length !== 18) {
    return { valid: false, message: '身份证号必须为18位' };
  }

  if (!/^\d{17}[\dXx]$/.test(clean)) {
    return { valid: false, message: '身份证号格式不正确' };
  }

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(clean[i]) * weights[i];
  }
  const checkCode = codes[sum % 11];
  if (checkCode !== clean[17].toUpperCase()) {
    return { valid: false, message: '身份证号校验位错误' };
  }

  const birthYear = parseInt(clean.substr(6, 4));
  const birthMonth = parseInt(clean.substr(10, 2));
  const birthDay = parseInt(clean.substr(12, 2));
  const birthDate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;

  const genderCode = parseInt(clean[16]);
  const gender = genderCode % 2 === 1 ? '男' : '女';

  const now = new Date();
  const birth = new Date(birthDate);
  const age = now.getFullYear() - birth.getFullYear();
  if (age < 18 || age > 55) {
    return { valid: false, message: `献血年龄需在18-55周岁之间，当前年龄${age}岁`, birthDate, gender };
  }

  return { valid: true, message: '身份证校验通过', birthDate, gender };
}

export function validatePhone(phone: string): { valid: boolean; message: string } {
  const clean = phone.trim();
  if (!/^1[3-9]\d{9}$/.test(clean)) {
    return { valid: false, message: '手机号格式不正确' };
  }
  return { valid: true, message: '手机号格式正确' };
}

export function getIntervalDescription(lastType: 'whole' | 'component' | null, planType: 'whole' | 'component' = 'whole'): string {
  if (!lastType) return '首次献血，无间隔要求';

  let desc = '';
  if (lastType === 'whole' && planType === 'whole') desc = '全血 → 全血：需间隔 6 个月 (180天)';
  else if (lastType === 'whole' && planType === 'component') desc = '全血 → 成分血：需间隔 3 个月 (90天)';
  else if (lastType === 'component' && planType === 'component') desc = '成分血 → 成分血：需间隔 2 周 (14天)';
  else if (lastType === 'component' && planType === 'whole') desc = '成分血 → 全血：需间隔 4 周 (28天)';

  return desc;
}

export function summarizeDonations(records: DonationRecord[]): {
  totalTimes: number;
  totalVolume: number;
  lastDate: string | null;
  lastType: 'whole' | 'component' | null;
} {
  if (records.length === 0) {
    return { totalTimes: 0, totalVolume: 0, lastDate: null, lastType: null };
  }
  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalVolume = records.reduce((sum, r) => sum + r.volume, 0);
  return {
    totalTimes: records.length,
    totalVolume,
    lastDate: sorted[0].date,
    lastType: sorted[0].type,
  };
}
