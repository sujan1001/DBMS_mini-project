import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { paper_id, reviewer_id } = await req.json();

    // Execute PostgreSQL Stored Atomic Transaction Function
    const result = await query(
      'SELECT assign_reviewer_atomic($1, $2) AS outcome',
      [paper_id, reviewer_id]
    );

    const outcome = result.rows[0].outcome;

    if (outcome.status === 'error') {
      return NextResponse.json({ success: false, message: outcome.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: outcome.message });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}