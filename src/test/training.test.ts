import { describe, expect, it } from 'vitest';
import { activityDays, demoActivities, demoWellness, periodActivities, sportStatistics, trainingTrend } from '@/lib/training';

describe('Training data mapping', () => {
  it('filters the selected period and keeps charts and sport totals consistent', () => {
    const rows = periodActivities(demoActivities(), '2026-10-24', 7);
    expect(rows).toHaveLength(6);
    const stats = sportStatistics(rows);
    const daily = activityDays(rows, '2026-10-24', 7);
    expect(daily.reduce((sum, day) => sum + day.distance, 0)).toBeCloseTo(stats.distance);
    expect(daily.reduce((sum, day) => sum + day.hours, 0)).toBeCloseTo(stats.hours);
    expect(sportStatistics([]).pace).toBeNull();
    expect(sportStatistics([]).power).toBeNull();
  });
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