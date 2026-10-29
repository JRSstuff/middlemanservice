import Dexie, { type Table } from 'dexie';

export type OfflineMutationType =
  | 'ADD_NOTE'
  | 'DRAFT_DELIVERY_PROOF'
  | 'DRAFT_DEAL'
  | 'SEND_DISPUTE_MESSAGE';

export type OfflineMutationStatus = 'queued' | 'syncing' | 'failed';

export interface OfflineMutation {
  id?: number;
  type: OfflineMutationType;
  dealId?: string;
  payload: any;
  status: OfflineMutationStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export class SafeSwapOfflineDB extends Dexie {
  mutations!: Table<OfflineMutation, number>;

  constructor() {
    super('SafeSwapOfflineDB');
    this.version(1).stores({
      mutations: '++id, type, dealId, status, createdAt',
    });
  }
}

export const offlineDb = new SafeSwapOfflineDB();

/**
 * Enqueue a non-money action for offline sync.
 * (Money actions like pay, release, refund are forbidden from offline queue)
 */
export async function enqueueOfflineMutation(
  type: OfflineMutationType,
  payload: any,
  dealId?: string
): Promise<number> {
  const now = new Date().toISOString();
  const id = await offlineDb.mutations.add({
    type,
    dealId,
    payload,
    status: 'queued',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/**
 * Get all pending/failed mutations
 */
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  return offlineDb.mutations
    .where('status')
    .anyOf(['queued', 'failed'])
    .toArray();
}

/**
 * Sync processor
 */
export async function processOfflineQueue(
  handler: (mutation: OfflineMutation) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const pending = await getPendingMutations();
  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    if (!item.id) continue;
    try {
      await offlineDb.mutations.update(item.id, {
        status: 'syncing',
        updatedAt: new Date().toISOString(),
      });

      const success = await handler(item);
      if (success) {
        await offlineDb.mutations.delete(item.id);
        processed++;
      } else {
        await offlineDb.mutations.update(item.id, {
          status: 'failed',
          retryCount: item.retryCount + 1,
          updatedAt: new Date().toISOString(),
        });
        failed++;
      }
    } catch (err: any) {
      await offlineDb.mutations.update(item.id, {
        status: 'failed',
        retryCount: item.retryCount + 1,
        errorMessage: err.message || 'Sync failed',
        updatedAt: new Date().toISOString(),
      });
      failed++;
    }
  }

  return { processed, failed };
}
