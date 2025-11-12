import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
  llm,
} from '@livekit/agents';
import { RoomEvent } from '@livekit/rtc-node';
import * as google from '@livekit/agents-plugin-google';
import * as silero from '@livekit/agents-plugin-silero';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import dotenv from 'dotenv';
import { createServerClient } from './lib/supabase.js';
import * as helpRequests from './lib/db-help-requests.js';
import * as knowledgeBase from './lib/db-knowledge-base.js';
import {
  type Calendar,
  type AvailableSlot,
  CalComCalendar,
  FakeCalendar,
  SlotUnavailableError,
  getUniqueHash,
} from './lib/calendar-integration.js';

dotenv.config({ path: '.env.local' });

// Verify environment variables are loaded
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL not found in environment variables');
  process.exit(1);
}

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
- Always offer to help with scheduling or other questions
- You can help customers book appointments by checking available slots and scheduling them`;


let currentRoomName = '';
let currentParticipantIdentity = '';

//Tool to request help from supervisor
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
      //Get room and participant info
      const userData = ctx.userData as Userdata;
      const roomName = userData?.roomName || 'unknown-room';
      const participantIdentity = userData?.participantIdentity || 'unknown';

      console.log(`\n Creating help request:`);
      console.log(`   Question: "${question}"`);
      console.log(`   Room: ${roomName}`);
      console.log(`   Participant: ${participantIdentity}`);

      //Create help request in database
      const request = await helpRequests.createHelpRequest(
        roomName,
        participantIdentity,
        question
      );

      //Notify supervisor (simulated via console log)
      console.log(`\n📞 SUPERVISOR NOTIFICATION:`);
      console.log(`Hey, I need help answering: "${question}"`);
      console.log(`Request ID: ${request.id}`);
      console.log(`Room: ${roomName}`);
      console.log(`Participant: ${participantIdentity}`);
      console.log(`View at: http://localhost:3000/supervisor\n`);

      // In production, we would send a webhook or SMS here
      

      return 'Help has been requested from a supervisor. I will get back to you shortly.';
    } catch (error: any) {
      // Log detailed error information
      console.error('\n  Error creating help request:');
      if (error?.stack) {
        console.error('   Stack trace:', error.stack);
      }
      
    }
  },
});

interface Userdata {
  cal: Calendar;
  roomName: string;
  participantIdentity: string;
}

class SalonAssistant extends voice.Agent {
  private tz: string;
  private _slotsMap: Map<string, AvailableSlot> = new Map();

  constructor(knowledgeBaseInstructions: string = '', timezone: string = 'America/New_York') {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    });

    const fullInstructions = `${SALON_CONTEXT}${knowledgeBaseInstructions}

Today is ${today}.

IMPORTANT INSTRUCTIONS FOR ANSWERING QUESTIONS:
1. When a customer asks a question, check the KNOWLEDGE BASE section above for relevant information.
2. If you find relevant information in the knowledge base, use it as your source but REPHRASE it naturally.
3. DO NOT read knowledge base answers word-for-word or verbatim.
4. Instead, express the information in your own conversational style:
   - Add warmth and personality
   - Use natural phrasing like "We're open..." instead of listing times
   - Vary your responses each time
   - Make it sound like a friendly conversation
5. Keep the core facts from the knowledge base accurate, but make the delivery natural.
6. Don't mention that you're using a knowledge base.
7. If the knowledge base has the answer, do NOT call request_help.
8. If you don't find an answer in the knowledge base and are uncertain, call request_help with the exact question.
9. After calling request_help, say: "Let me check with my supervisor and get back to you."

APPOINTMENT SCHEDULING INSTRUCTIONS:
- When a customer wants to book an appointment, first call list_available_slots to see what times are available.
- Present the available slots in a friendly, conversational way (e.g., "Monday at 2 PM" or "tomorrow at 10 AM").
- Avoid mentioning timezones, timestamps, or saying "AM" or "PM" explicitly - use natural phrases like "in the morning" or "in the evening".
- Offer a few options at a time, pause for their response, then guide them to confirm.
- Once they choose a slot, call schedule_appointment with the slotId from the list.
- If a slot is no longer available, let them know gently and offer the next available options.
- Always keep the conversation flowing - be proactive, human, and focused on helping them schedule with ease.

10. Always be helpful, professional, and conversational.`;

    super({
      instructions: fullInstructions,
      tools: {
        request_help: requestHelpTool,
        schedule_appointment: llm.tool({
          description: 'Schedule an appointment at the given slot.',
          parameters: z.object({
            slotId: z
              .string()
              .describe(
                'The identifier for the selected time slot (as shown in the list of available slots).',
              ),
            attendeeEmail: z
              .string()
              .email()
              .optional()
              .describe('The email address of the customer (optional, will use placeholder if not provided).'),
          }),
          execute: async ({ slotId, attendeeEmail }, { ctx }: llm.ToolOptions<Userdata>) => {
            const slot = this._slotsMap.get(slotId);
            if (!slot) {
              throw new llm.ToolError(`error: slot ${slotId} was not found`);
            }

            //We can use provided email or placeholder
            const email = attendeeEmail || 'customer@example.com';

            try {
              await ctx.userData.cal.scheduleAppointment({
                startTime: slot.startTime,
                attendeeEmail: email,
              });
            } catch (error) {
              if (error instanceof SlotUnavailableError) {
                throw new llm.ToolError("This slot isn't available anymore. Let me find you another time.");
              }
              throw error;
            }

            const local = new Date(slot.startTime.toLocaleString('en-US', { timeZone: this.tz }));
            const formatted = local.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
              timeZone: this.tz,
            });

            return `The appointment was successfully scheduled for ${formatted}.`;
          },
        }),
        list_available_slots: llm.tool({
          description: `Return a plain-text list of available slots, one per line.

<slot_id> - <Weekday>, <Month> <Day>, <Year> at <HH:MM> <TZ> (<relative time>)

You must infer the appropriate range implicitly from the conversational context and must not prompt the user to pick a value explicitly.`,
          parameters: z.object({
            range: z
              .enum(['+2week', '+1month', '+3month', 'default'])
              .describe('Determines how far ahead to search for free time slots.'),
          }),
          execute: async ({ range }, { ctx }: llm.ToolOptions<Userdata>) => {
            const now = new Date();
            const lines: string[] = [];

            let rangeDays: number;
            if (range === '+2week' || range === 'default') {
              rangeDays = 14;
            } else if (range === '+1month') {
              rangeDays = 30;
            } else if (range === '+3month') {
              rangeDays = 90;
            } else {
              rangeDays = 14;
            }

            const endTime = new Date(now.getTime() + rangeDays * 24 * 60 * 60 * 1000);

            const slots = await ctx.userData.cal.listAvailableSlots({
              startTime: now,
              endTime: endTime,
            });

            for (const slot of slots) {
              const local = new Date(slot.startTime.toLocaleString('en-US', { timeZone: this.tz }));
              const delta = local.getTime() - now.getTime();
              const days = Math.floor(delta / (24 * 60 * 60 * 1000));
              const seconds = Math.floor((delta % (24 * 60 * 60 * 1000)) / 1000);

              let rel: string;
              if (local.toDateString() === now.toDateString()) {
                if (seconds < 3600) {
                  rel = 'in less than an hour';
                } else {
                  rel = 'later today';
                }
              } else if (
                local.toDateString() ===
                new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
              ) {
                rel = 'tomorrow';
              } else if (days < 7) {
                rel = `in ${days} days`;
              } else if (days < 14) {
                rel = 'in 1 week';
              } else {
                rel = `in ${Math.floor(days / 7)} weeks`;
              }

              const uniqueHash = getUniqueHash(slot);
              const formatted = local.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
                timeZone: this.tz,
              });

              lines.push(`${uniqueHash} - ${formatted} (${rel})`);
              this._slotsMap.set(uniqueHash, slot);
            }

            return lines.join('\n') || 'No slots available at the moment.';
          },
        }),
      },
    });

    this.tz = timezone;
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    //Initialize calendar (Cal.com or FakeCalendar)
    const timezone = process.env.TIMEZONE || 'America/New_York';
    let cal: Calendar;
    const calApiKey = process.env.CAL_API_KEY;

    if (calApiKey) {
      console.log('\n  CAL_API_KEY detected, using cal.com calendar');
      cal = new CalComCalendar({ apiKey: calApiKey, timezone });
    } else {
      console.warn(
        '\n   CAL_API_KEY is not set. Falling back to FakeCalendar; set CAL_API_KEY to enable Cal.com integration.',
      );
      cal = new FakeCalendar({ timezone });
    }

    await cal.initialize();
    console.log('✅ Calendar initialized');

    //Load knowledge base at startup
    console.log('\n📚 Loading knowledge base...');
    const allKB = await knowledgeBase.getAllKnowledgeEntries();
    let kbInstructions = '';
    
    if (allKB && allKB.length > 0) {
      console.log(`✅ Loaded ${allKB.length} knowledge base entries`);
      kbInstructions = '\n\nKNOWLEDGE BASE (Use these verified answers when relevant):\n';
      allKB.forEach((entry, idx) => {
        kbInstructions += `${idx + 1}. Q: "${entry.question}" → A: "${entry.answer}"\n`;
        console.log(`   ${idx + 1}. "${entry.question}"`);
      });
    } else {
      console.log('ℹ️  No knowledge base entries found');
    }

    //Create assistant with knowledge base instructions
    const assistant = new SalonAssistant(kbInstructions, timezone);

    //Define userData for the session (will be updated after participant joins)
    const userdata: Userdata = {
      cal,
      roomName: ctx.room.name,
      participantIdentity: 'pending', // Will be updated after waitForParticipant
    };

    // Using Gemini Live API - handles STT, LLM, and TTS all in one
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad! as silero.VAD,
      llm: new google.beta.realtime.RealtimeModel(),
      userData: userdata,
    });

    // Listen for user speech to search knowledge base
    session.on('user_speech_committed' as any, async (event: any) => {
      try {
        const transcript = event.transcript || event.text || '';
        if (!transcript) return;
        
        console.log(`\n🎤 User said: "${transcript}"`);
        
        // Search knowledge base
        const kbEntry = await knowledgeBase.searchKnowledgeBase(transcript);
        
        if (kbEntry) {
          // If founnd in knowlwedge base
          await knowledgeBase.incrementKnowledgeUsage(kbEntry.id);
          console.log(`✅ KNOWLEDGE BASE HIT!`);
          console.log(`   Question: "${kbEntry.question}"`);
          console.log(`   Answer (will be rephrased by AI): "${kbEntry.answer}"`);
          console.log(`   Usage count: ${kbEntry.usage_count + 1}`);
          
        } else {
          console.log(`  No knowledge base entry found for: "${transcript}"`);
        }
      } catch (error) {
        console.error('Error searching knowledge base:', error);
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

    // Wait for the first participant to join and get their information
    console.log('\n⏳ Waiting for participant to join...');
    const participant = await ctx.waitForParticipant();
    
    // Now we have the actual participant information
    currentRoomName = ctx.room.name;
    currentParticipantIdentity = participant.identity;
    
    console.log(`✅ Participant connected:`);
    console.log(`   Room: ${currentRoomName}`);
    console.log(`   Participant: ${currentParticipantIdentity}`);
    
    // Update userData with real values
    userdata.roomName = currentRoomName;
    userdata.participantIdentity = currentParticipantIdentity;

    // Periodically check for new knowledge base entries (every 30 seconds)
    let currentKBCount = allKB.length;
    const kbCheckInterval = setInterval(async () => {
      try {
        const updatedKB = await knowledgeBase.getAllKnowledgeEntries();
        
        if (updatedKB.length !== currentKBCount) {
          console.log(`\n🔄 Knowledge base updated: ${currentKBCount} → ${updatedKB.length} entries`);
          currentKBCount = updatedKB.length;
          
          // Log new entries
          if (updatedKB.length > currentKBCount) {
            console.log('📝 New entries:');
            updatedKB.slice(currentKBCount).forEach((entry, idx) => {
              console.log(`   ${currentKBCount + idx + 1}. "${entry.question}"`);
            });
          }
        }
      } catch (error) {
        console.error('Error checking knowledge base:', error);
      }
    }, 30000); //Checking every 30 seconds

    // Clean up interval when room is disconnected
    ctx.room.on(RoomEvent.Disconnected as any, () => {
      clearInterval(kbCheckInterval);
    });

    
    const handle = session.generateReply({
      instructions: 'Greet the caller warmly and offer your assistance. Say something like: "Hello! Welcome to Glamour Hair Salon. How can I help you today?"',
    });
    await handle.waitForPlayout();

    
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log(`Participant ${participant.identity} disconnected from room ${ctx.room.name}`);
    });
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));

