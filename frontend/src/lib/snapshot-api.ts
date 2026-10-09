import { apiRequest } from './api-client';
import type { SnapshotEvolutionPoint } from '../types/snapshot';

export function getSnapshotEvolution(signal?: AbortSignal): Promise<SnapshotEvolutionPoint[]> {
  return apiRequest(
    '/api/snapshots/evolution',
    { signal },
    'Could not load portfolio history.',
  );
}
