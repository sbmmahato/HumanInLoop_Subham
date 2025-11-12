import { NextResponse } from 'next/server';
import * as helpRequests from '@/lib/db-help-requests';

export async function POST() {
  try {
    const count = await helpRequests.checkTimeouts();
    return NextResponse.json({ success: true, timedOut: count });
  } catch (error) {
    console.error('Error checking timeouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
