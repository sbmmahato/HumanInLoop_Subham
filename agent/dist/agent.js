import { WorkerOptions, cli, defineAgent, voice, llm, } from '@livekit/agents';
import { RoomEvent } from '@livekit/rtc-node';
import * as google from '@livekit/agents-plugin-google';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import * as helpRequests from './lib/db-help-requests.js';
import * as knowledgeBase from './lib/db-knowledge-base.js';
dotenv.config({ path: '.env.local' });
// Salon business information
const SALON_CONTEXT = `You are a helpful AI assistant for "Glamour Hair Salon", a professional hair salon.

Business Information:
- Name: Glamour Hair Salon
- Hours: Monday-Saturday 9am-7pm, Sunday 10am-5pm
- Services: Haircuts, coloring, highlights, perms, styling, extensions
- Location: 123 Main Street, Downtown
- Phone: (555) 123-4567
- We accept walk-ins but appointments are recommended
- Average haircut price: $45
- Average coloring service: $120
- We offer student discounts (10% off with valid ID)

When answering questions:
- Be friendly, professional, and concise
- If you don't know something specific, you should escalate to a human supervisor
- Always offer to help with scheduling or other questions`;
// Store room and participant context
let currentRoomName = '';
let currentParticipantIdentity = '';
// Tool to request help from supervisor
const requestHelpTool = llm.tool({
    description: 'Request help from a human supervisor when you cannot answer a question with certainty. Use this when you are unsure about specific information.',
    parameters: {
        type: 'object',
        properties: {
            question: {
                type: 'string',
                description: 'The exact question the customer asked that you cannot answer',
            },
        },
        required: ['question'],
    },
    execute: async ({ question }, { ctx }) => {
        try {
            // Create help request in database
            const request = await helpRequests.createHelpRequest(currentRoomName, currentParticipantIdentity, question);
            // Notify supervisor (simulated via console log)
            console.log(`\n📞 SUPERVISOR NOTIFICATION:`);
            console.log(`Hey, I need help answering: "${question}"`);
            console.log(`Request ID: ${request.id}`);
            console.log(`Room: ${currentRoomName}`);
            console.log(`Participant: ${currentParticipantIdentity}`);
            console.log(`View at: http://localhost:3000/supervisor\n`);
            // In production, you would send a webhook or SMS here
            // await fetch(process.env.SUPERVISOR_WEBHOOK_URL, {
            //   method: 'POST',
            //   body: JSON.stringify({ requestId: request.id, question }),
            // });
            return 'Help has been requested from a supervisor. I will get back to you shortly.';
        }
        catch (error) {
            console.error('Error creating help request:', error);
            throw new llm.ToolError('Failed to request help. Please try again.');
        }
    },
});
class SalonAssistant extends voice.Agent {
    constructor() {
        super({
            // Instructions for the agent (Gemini will also use its own instructions)
            instructions: `${SALON_CONTEXT}

IMPORTANT INSTRUCTIONS:
1. When a customer asks a question, first check if you know the answer from your business knowledge or the knowledge base.
2. If you have a clear answer, provide it confidently.
3. If you are uncertain or don't know the answer, you MUST call the request_help function with their exact question.
4. After calling request_help, tell the customer: "Let me check with my supervisor and get back to you."
5. Be helpful and professional at all times.`,
            // Tools are defined here - Gemini will use them
            tools: {
                request_help: requestHelpTool,
            },
        });
    }
}
export default defineAgent({
    prewarm: async (proc) => {
        proc.userData.vad = await silero.VAD.load();
    },
    entry: async (ctx) => {
        // Set room and participant context
        currentRoomName = ctx.room.name;
        const firstParticipant = ctx.room.remoteParticipants.values().next().value;
        currentParticipantIdentity = firstParticipant?.identity || 'unknown';
        const assistant = new SalonAssistant();
        // Define userData for the session
        const userdata = {
            roomName: currentRoomName,
            participantIdentity: currentParticipantIdentity,
        };
        // Use Gemini Live API - handles STT, LLM, and TTS all in one
        const session = new voice.AgentSession({
            vad: ctx.proc.userData.vad,
            llm: new google.beta.realtime.RealtimeModel(),
            userData: userdata,
        });
        // Listen for conversation items to check knowledge base
        session.on('conversation_item_added', async (event) => {
            // Check if it's a user message (ChatMessage with role 'user')
            if (event.item && typeof event.item === 'object' && 'role' in event.item && event.item.role === 'user' && 'content' in event.item) {
                // Check knowledge base for user messages
                try {
                    const content = String(event.item.content);
                    const kbEntry = await knowledgeBase.searchKnowledgeBase(content);
                    if (kbEntry) {
                        // Found in knowledge base - increment usage
                        await knowledgeBase.incrementKnowledgeUsage(kbEntry.id);
                        console.log(`Found knowledge base entry for: "${content}"`);
                        console.log(`Answer: "${kbEntry.answer}"`);
                        // The agent's instructions already tell it to use knowledge base information
                        // The LLM will naturally use this information in its response
                    }
                }
                catch (error) {
                    console.error('Error searching knowledge base:', error);
                }
            }
        });
        await session.start({
            agent: assistant,
            room: ctx.room,
            inputOptions: {
                noiseCancellation: BackgroundVoiceCancellation(),
            },
        });
        await ctx.connect();
        // Greet the caller
        const handle = session.generateReply({
            instructions: 'Greet the caller warmly and offer your assistance. Say something like: "Hello! Welcome to Glamour Hair Salon. How can I help you today?"',
        });
        await handle.waitForPlayout();
        // Listen for participant disconnect
        ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
            // Check if there are any pending requests for this participant
            // This could trigger a follow-up if needed
            console.log(`Participant ${participant.identity} disconnected from room ${ctx.room.name}`);
        });
    },
});
cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
//# sourceMappingURL=agent.js.map