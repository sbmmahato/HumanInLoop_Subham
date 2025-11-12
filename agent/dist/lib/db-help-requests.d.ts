import { type HelpRequest } from './supabase.js';
export declare function createHelpRequest(roomName: string, participantIdentity: string, question: string): Promise<HelpRequest>;
export declare function getHelpRequest(requestId: string): Promise<HelpRequest | null>;
export declare function resolveHelpRequest(requestId: string, answer: string): Promise<HelpRequest>;
//# sourceMappingURL=db-help-requests.d.ts.map