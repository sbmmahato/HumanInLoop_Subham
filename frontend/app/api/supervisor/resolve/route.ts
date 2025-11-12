import { NextResponse } from 'next/server';
import * as helpRequests from '@/lib/db-help-requests';
import * as knowledgeBase from '@/lib/db-knowledge-base';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { requestId, answer, addToKnowledge } = await request.json();

    if (!requestId || !answer) {
      return NextResponse.json(
        { error: 'Missing requestId or answer' },
        { status: 400 }
      );
    }

    // Get the original request to add to knowledge base
    const originalRequest = await helpRequests.getHelpRequest(requestId);
    
    if (!originalRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    console.log(`Resolving request ${requestId} with answer: ${answer}`);
    
    // Resolve the request
    const resolved = await helpRequests.resolveRequest(requestId, answer, 'resolved');

    console.log(`Request ${requestId} resolved successfully. Status: ${resolved.status}`);

    // add to knowledge base
    if (addToKnowledge && originalRequest) {
      const kbEntry = await knowledgeBase.addToKnowledgeBase(
        originalRequest.question,
        answer,
        requestId
      );
      console.log(`Added to knowledge base: ${kbEntry.id}`);
    }

    // Simulate texting the original caller
    if (originalRequest) {
      console.log(`\n📱 CALLER FOLLOW-UP:`);
      console.log(`To: ${originalRequest.participant_identity} (Room: ${originalRequest.room_name})`);
      console.log(`Message: "Hi! I have an answer to your question: ${originalRequest.question}"`);
      console.log(`Answer: "${answer}"`);
      console.log(`\n`);
    }

    // In production, we would:
    // 1. Use LiveKit to send a message back to the room
    // 2. Or trigger a callback/webhook to contact the customer
    // 3. Or use a messaging service like Twilio

    return NextResponse.json({ 
      success: true, 
      request: resolved 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error resolving request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
