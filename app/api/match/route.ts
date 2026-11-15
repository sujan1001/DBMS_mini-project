import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: Request) {
  try {
    const { paper_id } = await req.json();

    // 1. Fetch paper abstract and embedding
    const paperRes = await query('SELECT paper_id, abstract, author_id, abstract_embedding FROM papers WHERE paper_id = $1', [paper_id]);
    if (paperRes.rowCount === 0) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const paper = paperRes.rows[0];
    let embedding = paper.abstract_embedding;

    // 2. Generate embedding dynamically if it hasn't been saved yet
    if (!embedding) {
      const vectorArray = await generateEmbedding(paper.abstract);
      embedding = `[${vectorArray.join(',')}]`; // Format for pgvector
      await query('UPDATE papers SET abstract_embedding = $1 WHERE paper_id = $2', [embedding, paper_id]);
    }

    // 3. Vector Similarity Query (Cosine Distance: 1 - (A <=> B) = Similarity)
    const matchQuery = `
      SELECT 
        u.user_id AS reviewer_id,
        u.name,
        rp.affiliation,
        rp.current_workload,
        rp.max_workload,
        ROUND((1 - (rp.expertise_embedding <=> $1::vector))::numeric, 4) AS similarity_score,
        EXISTS (
          SELECT 1 FROM conflicts_of_interest coi 
          WHERE coi.reviewer_id = u.user_id AND coi.paper_id = $2
        ) AS has_coi,
        (u.user_id = $3) AS is_author
      FROM reviewer_profiles rp
      JOIN users u ON u.user_id = rp.reviewer_id
      ORDER BY similarity_score DESC;
    `;

    const result = await query(matchQuery, [embedding, paper_id, paper.author_id]);
    return NextResponse.json({ matches: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}