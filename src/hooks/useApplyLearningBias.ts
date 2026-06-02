// Keeps the process-wide generation bias in sync with performance data when the
// Learning Engine is enabled. Mounted once in the Layout; sets NO_BIAS when off.
import { useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { usePostPerformance } from './usePostPerformance';
import { deriveBias } from '../lib/analytics/learning';
import { setActiveBias } from '../lib/analytics/biasState';
import { NO_BIAS } from '../types/analytics';

export function useApplyLearningBias(): void {
  const { brand } = useBusiness();
  const { items } = usePostPerformance();
  const enabled = brand?.learningEnabled ?? false;

  useEffect(() => {
    setActiveBias(enabled ? deriveBias(items) : NO_BIAS);
    return () => setActiveBias(NO_BIAS);
  }, [enabled, items]);
}
