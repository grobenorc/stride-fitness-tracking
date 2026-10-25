import { describe, expect, it } from 'vitest';
import { demoActivities, demoWellness, trainingTrend } from '@/lib/training';

describe('Training data mapping', () => {
  it('maps every demo activity to a defined name and numeric metrics', () => {
    const activities = demoActivities();
    expect(activities).toHaveLength(68);
    for (const activity of activities) {
      expect(typeof activity.name).toBe('string');
      expect(activity.name.length).toBeGreaterThan(0);
      expect(Number.isFinite(activity.distance_m)).toBe(true);
      expect(Number.isFinite(activity.duration_s)).toBe(true);
    }
  });
  it('maps wellness and training trends to finite chart values', () => {
    expect(demoWellness()).toHaveLength(28);
    const trend = trainingTrend(demoActivities(), '2026-10-24');
    expect(trend).toHaveLength(84);
    expect(trend.at(-1)?.day).toBe('2026-10-24');
    expect(trend.every(point => Number.isFinite(point.fitness) && Number.isFinite(point.fatigue) && Number.isFinite(point.form))).toBe(true);
  });
});