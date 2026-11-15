# Reviewer Assignment System (DBMS Level 3 Project)

This project automates the assignment of research papers to peer reviewers using vector-based semantic search, while enforcing workload caps and blocking conflicts of interest. 

## Technology Stack
* **Frontend/Backend:** Next.js (TypeScript, Tailwind CSS)
* **Database:** PostgreSQL with `pgvector`
* **AI Embeddings:** HuggingFace `all-MiniLM-L6-v2` via `@xenova/transformers`

## Setup Instructions

1. **Install Dependencies:**
   Run `npm install` in the project root.
2. **Database Setup:**
   Ensure PostgreSQL is installed with the `pgvector` extension.
   Create a database named `reviewer_db`.
3. **Environment Variables:**
   Create a `.env` file in the root directory:
   `DATABASE_URL="postgres://username:password@localhost:5432/reviewer_db"`
4. **Initialize Database:**
   Run the `schema.sql` script in your PostgreSQL database to create tables and triggers.
5. **Run the Application:**
   Run `npm run dev` and navigate to `http://localhost:3000`.