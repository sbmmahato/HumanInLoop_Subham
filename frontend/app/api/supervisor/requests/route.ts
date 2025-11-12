import { NextResponse } from 'next/server';
import * as helpRequests from '@/lib/db-help-requests';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const requests = await helpRequests.getAllRequests();
    
    return NextResponse.json(
      { requests },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
