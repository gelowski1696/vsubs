import { PlanInterval } from '../common/constants/domain';

export function addInterval(date: Date, interval: PlanInterval, count: number) {
  const d = new Date(date);
  if (interval === 'DAILY') d.setDate(d.getDate() + count);
  if (interval === 'WEEKLY') d.setDate(d.getDate() + count * 7);
  if (interval === 'MONTHLY') d.setMonth(d.getMonth() + count);
  if (interval === 'YEARLY') d.setFullYear(d.getFullYear() + count);
  return d;
}

export function isBeforeDay(a: Date, b: Date) {
  const left = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const right = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return left.getTime() < right.getTime();
}
