import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueOfflineMutation,
  getPendingMutations,
  processOfflineQueue,
  offlineDb,
} from './offline-queue';

describe('SafeSwap Offline Mutation Queue', () => {
  beforeEach(async () => {
    await offlineDb.mutations.clear();
  });

  it('enqueues safe offline actions (drafts, notes)', async () => {
    const id = await enqueueOfflineMutation(
      'ADD_NOTE',
      { note: 'Inspected package at warehouse.' },
      'deal-123'
    );
    expect(id).toBeDefined();

    const pending = await getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe('ADD_NOTE');
    expect(pending[0].dealId).toBe('deal-123');
    expect(pending[0].status).toBe('queued');
  });

  it('processes queued mutations on sync and removes successfully processed items', async () => {
    await enqueueOfflineMutation(
      'DRAFT_DELIVERY_PROOF',
      { trackingNumber: 'TRK-9901' },
      'deal-456'
    );

    const mockSyncHandler = async (item: any) => {
      expect(item.payload.trackingNumber).toBe('TRK-9901');
      return true; // success
    };

    const result = await processOfflineQueue(mockSyncHandler);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);

    const remaining = await getPendingMutations();
    expect(remaining).toHaveLength(0);
  });

  it('marks failed sync attempts and increments retry count', async () => {
    await enqueueOfflineMutation(
      'SEND_DISPUTE_MESSAGE',
      { message: 'Cannot reach seller' },
      'deal-789'
    );

    const failingSyncHandler = async () => {
      return false; // failure
    };

    const result = await processOfflineQueue(failingSyncHandler);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);

    const pending = await getPendingMutations();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('failed');
    expect(pending[0].retryCount).toBe(1);
  });
});
