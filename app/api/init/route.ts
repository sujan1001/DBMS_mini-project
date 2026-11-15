import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';

export async function GET() {
  try {
    const reviewers = await query('SELECT reviewer_id, expertise_text FROM reviewer_profiles WHERE expertise_embedding IS NULL');
    let count = 0;
    
    for (const row of reviewers.rows) {
      const vectorArray = await generateEmbedding(row.expertise_text);
      const embedding = `[${vectorArray.join(',')}]`;
      await query('UPDATE reviewer_profiles SET expertise_embedding = $1 WHERE reviewer_id = $2', [embedding, row.reviewer_id]);
      count++;
    }
    
    return NextResponse.json({ message: `Successfully initialized ${count} reviewer profiles with AI embeddings.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}