export interface PendingRequest {
  titre: string;
  brief: string;
  plateformes: string[];
  ton: string;
  langue: string;
  paymentMethod: string;
  createdAt: number;
}

export interface CompletedResult {
  copy: string;
  createdAt: number;
}

const pending = new Map<string, PendingRequest>();
const results = new Map<string, CompletedResult>();

export function storePending(token: string, data: PendingRequest) {
  pending.set(token, data);
}

export function getPending(token: string): PendingRequest | undefined {
  return pending.get(token);
}

export function deletePending(token: string) {
  pending.delete(token);
}

export function storeResult(token: string, copy: string) {
  results.set(token, { copy, createdAt: Date.now() });
}

export function getResult(token: string): CompletedResult | undefined {
  return results.get(token);
}
