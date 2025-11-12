import { type KnowledgeBaseEntry } from './supabase.js';
export declare function searchKnowledgeBase(question: string): Promise<KnowledgeBaseEntry | null>;
export declare function addToKnowledgeBase(question: string, answer: string, sourceRequestId?: string): Promise<KnowledgeBaseEntry>;
export declare function incrementKnowledgeUsage(entryId: string): Promise<void>;
//# sourceMappingURL=db-knowledge-base.d.ts.map