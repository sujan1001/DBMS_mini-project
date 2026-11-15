'use client';
import React, { useState } from 'react';

export default function AssignmentDashboard() {
  const [paperId, setPaperId] = useState<string>('1');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 1. Initialize DB Embeddings
  const handleInit = async () => {
    setMessage('Initializing AI embeddings (this might take a few seconds)...');
    try {
      const res = await fetch('/api/init');
      const data = await res.json();
      setMessage(data.message || data.error);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
  };

  // 2. Fetch Matching Reviewers
  const fetchMatches = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_id: parseInt(paperId) }),
      });
      const data = await res.json();
      if (res.ok) {
        setCandidates(data.matches);
        if (data.matches.length === 0) setMessage('No reviewers found.');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Assign Reviewer
  const handleAssign = async (reviewerId: number) => {
    try {
      const res = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper_id: parseInt(paperId), reviewer_id: reviewerId }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchMatches(); // Refresh the table to update workload numbers
      } else {
        setMessage(`❌ Assignment Blocked: ${data.message}`);
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <header className="mb-8 border-b pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reviewer Assignment System</h1>
            <p className="text-gray-600">Vector-based abstract similarity with automated constraints</p>
          </div>
          <button 
            onClick={handleInit}
            className="text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded font-semibold transition"
          >
            1. Initialize AI Embeddings
          </button>
        </header>

        <section className="mb-6 flex gap-4 items-center bg-gray-100 p-4 rounded-lg border">
          <label className="font-semibold text-gray-700">2. Select Paper ID:</label>
          <input 
            type="number" 
            value={paperId} 
            onChange={(e) => setPaperId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-24 text-center focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button 
            onClick={fetchMatches}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded transition shadow-sm"
          >
            {loading ? 'Analyzing Vectors...' : 'Find Candidate Reviewers'}
          </button>
        </section>

        {message && (
          <div className={`p-4 rounded-md mb-6 font-medium ${message.includes('❌') || message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white text-sm">
                <th className="p-4 rounded-tl-lg">Reviewer Name</th>
                <th className="p-4">Similarity Match</th>
                <th className="p-4">Workload</th>
                <th className="p-4">System Constraints</th>
                <th className="p-4 rounded-tr-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((cand) => {
                const isFull = cand.current_workload >= cand.max_workload;
                const blocked = cand.has_coi || cand.is_author || isFull;

                return (
                  <tr key={cand.reviewer_id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{cand.name}</td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono text-sm font-bold">
                        {(cand.similarity_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4">{cand.current_workload} / {cand.max_workload}</td>
                    <td className="p-4 text-sm">
                      {cand.is_author && <span className="text-red-600 font-bold block">🚨 Author</span>}
                      {cand.has_coi && <span className="text-red-600 font-bold block">🚨 Conflict of Interest</span>}
                      {isFull && <span className="text-orange-600 font-bold block">⚠️ Max Capacity</span>}
                      {!blocked && <span className="text-green-600 font-bold block">✅ Eligible</span>}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleAssign(cand.reviewer_id)}
                        disabled={blocked}
                        className={`px-4 py-2 rounded text-sm font-bold shadow-sm transition ${
                          blocked 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                );
              })}
              {candidates.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No candidates to display. Enter a Paper ID and search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}