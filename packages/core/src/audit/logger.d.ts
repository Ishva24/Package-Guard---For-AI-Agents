import type { AuditEvent } from '../types.js';
type SseWriter = (data: string) => void;
export declare function registerSseClient(id: string, write: SseWriter): () => void;
export declare function logAudit(event: Omit<AuditEvent, 'requestId' | 'timestamp'>): AuditEvent;
export {};
//# sourceMappingURL=logger.d.ts.map