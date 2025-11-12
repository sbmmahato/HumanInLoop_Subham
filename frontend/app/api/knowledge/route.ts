import { NextResponse } from 'next/server';
import * as knowledgeBase from '@/lib/db-knowledge-base';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const entries = await knowledgeBase.getAllKnowledgeEntries();
    
    return NextResponse.json(
      { entries },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { question, answer, sourceRequestId } = await request.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Missing question or answer' },
        { status: 400 }
      );
    }

    const entry = await knowledgeBase.addToKnowledgeBase(
      question,
      answer,
      sourceRequestId
    );

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Error adding to knowledge base:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
