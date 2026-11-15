-- 1. Enable pgvector for Semantic Search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Users Table (Role-based access: Admin, Reviewer, Author)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'reviewer', 'author')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Reviewer Profiles (With vector data)
CREATE TABLE reviewer_profiles (
    reviewer_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    affiliation VARCHAR(150) NOT NULL,
    max_workload INT DEFAULT 3 CHECK (max_workload > 0),
    current_workload INT DEFAULT 0 CHECK (current_workload >= 0),
    expertise_text TEXT NOT NULL,
    expertise_embedding vector(384) 
);

-- 4. Create Papers Table
CREATE TABLE papers (
    paper_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    abstract TEXT NOT NULL,
    author_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    abstract_embedding vector(384),
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Conflicts of Interest (COI) Table
CREATE TABLE conflicts_of_interest (
    conflict_id SERIAL PRIMARY KEY,
    reviewer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_coi UNIQUE (reviewer_id, paper_id)
);

-- 6. Create Assignments Table
CREATE TABLE assignments (
    assignment_id SERIAL PRIMARY KEY,
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'declined')),
    CONSTRAINT unique_assignment UNIQUE (paper_id, reviewer_id)
);

-- 7. Advanced Feature 1: Trigger to Block COI and Cap Workload
CREATE OR REPLACE FUNCTION validate_reviewer_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_current_workload INT;
    v_max_workload INT;
    v_has_conflict INT;
    v_is_author INT;
BEGIN
    SELECT COUNT(*) INTO v_is_author FROM papers WHERE paper_id = NEW.paper_id AND author_id = NEW.reviewer_id;
    IF v_is_author > 0 THEN RAISE EXCEPTION 'Blocked: Reviewer is the author.'; END IF;

    SELECT COUNT(*) INTO v_has_conflict FROM conflicts_of_interest WHERE reviewer_id = NEW.reviewer_id AND paper_id = NEW.paper_id;
    IF v_has_conflict > 0 THEN RAISE EXCEPTION 'Blocked: Conflict of Interest detected.'; END IF;

    SELECT current_workload, max_workload INTO v_current_workload, v_max_workload FROM reviewer_profiles WHERE reviewer_id = NEW.reviewer_id;
    IF v_current_workload >= v_max_workload THEN RAISE EXCEPTION 'Blocked: Reviewer at max capacity.'; END IF;

    UPDATE reviewer_profiles SET current_workload = current_workload + 1 WHERE reviewer_id = NEW.reviewer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_assignment
BEFORE INSERT ON assignments FOR EACH ROW EXECUTE FUNCTION validate_reviewer_assignment();

-- 8. Advanced Feature 2: Transaction Function
CREATE OR REPLACE FUNCTION assign_reviewer_atomic(p_paper_id INT, p_reviewer_id INT)
RETURNS JSON AS $$
DECLARE v_assignment_id INT;
BEGIN
    INSERT INTO assignments (paper_id, reviewer_id, status) VALUES (p_paper_id, p_reviewer_id, 'assigned') RETURNING assignment_id INTO v_assignment_id;
    UPDATE papers SET status = 'under_review' WHERE paper_id = p_paper_id;
    RETURN json_build_object('status', 'success', 'assignment_id', v_assignment_id, 'message', 'Assigned successfully.');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('status', 'error', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 9. Advanced Feature 3: Analytical View
CREATE OR REPLACE VIEW vw_reviewer_workload_status AS
SELECT 
    u.user_id, u.name, rp.affiliation, rp.max_workload, rp.current_workload,
    (rp.max_workload - rp.current_workload) AS available_slots
FROM users u
JOIN reviewer_profiles rp ON u.user_id = rp.reviewer_id;

-- 10. Insert Seed Data
INSERT INTO users (name, email, password_hash, role) VALUES
('Dr. Alan Turing', 'alan@pes.edu', 'hashed_pw', 'reviewer'),
('Dr. Ada Lovelace', 'ada@pes.edu', 'hashed_pw', 'reviewer'),
('Alice Researcher', 'alice@pes.edu', 'hashed_pw', 'author');

INSERT INTO reviewer_profiles (reviewer_id, affiliation, max_workload, current_workload, expertise_text) VALUES
(1, 'PES University', 2, 0, 'Deep learning, neural networks, computer vision, artificial intelligence'),
(2, 'PES University', 2, 0, 'Database query optimization, transaction concurrency, distributed indexing');

INSERT INTO papers (title, abstract, author_id, status) VALUES
('Optimizing Semantic Search', 'This paper explores the application of transformer-based embeddings and cosine similarity indexing within relational database management systems.', 3, 'submitted');

INSERT INTO conflicts_of_interest (reviewer_id, paper_id, reason) VALUES
(2, 1, 'Co-authored previous paper');