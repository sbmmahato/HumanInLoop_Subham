import { NextResponse } from 'next/server';
import * as helpRequests from '@/lib/db-help-requests';

// This endpoint can be called by a cron job to check for timed out requests
export async function GET() {
  try {
    const count = await helpRequests.checkTimeouts();
    return NextResponse.json({ success: true, timedOut: count });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
