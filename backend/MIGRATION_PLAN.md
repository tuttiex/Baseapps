# Implementation Plan: Migrate Dapps & Votes to PostgreSQL

This plan mitigates data loss risks (race conditions) by moving critical data from flat JSON files to the existing PostgreSQL database.

## 1. Database Schema Update (`backend/setup-db.js`)
We will create two new tables in your existing database.

### Table: `dapps`
Stores both live and pending dapps (replacing `approved_dapps.json` and `submitted_dapps.json`).
*   `id` (SERIAL PRIMARY KEY)
*   `name` (VARCHAR, Unique)
*   `description` (TEXT)
*   `category` (VARCHAR)
*   `subcategory` (VARCHAR)
*   `website_url` (VARCHAR)
*   `logo_url` (VARCHAR)
*   `chain` (VARCHAR)
*   `status` (VARCHAR) - Enum: `pending`, `approved`, `rejected`
*   `submitted_by` (VARCHAR) - Wallet address (Optional)
*   `created_at` (TIMESTAMP)

### Table: `votes`
Stores individual votes (replacing `votes.json`).
*   `id` (SERIAL PRIMARY KEY)
*   `dapp_id` (INTEGER, FK -> dapps.id)
*   `voter_address` (VARCHAR)
*   `vote_value` (SMALLINT) - +1 or -1
*   `timestamp` (TIMESTAMP)
*   **Constraint:** Unique(`dapp_id`, `voter_address`) to prevent double voting at the DB level.

## 2. Update Database Queries (`backend/db/queries.js`)
Add helper functions to interact with these new tables:
*   `getAllDapps(status)`: Returns list of dapps.
*   `getDappByName(name)`: Needed for looking up dapps by legacy names.
*   `createDapp(data)`: Check if exists -> Insert.
*   `approveDapp(id)`: `UPDATE dapps SET status='approved' WHERE id=...`
*   `deleteDapp(id)`: `DELETE FROM dapps ...`
*   `castVote(dappId, voter, value)`: Insert or Update (Upsert) vote logic.
*   `getDappScore(dappId)`: `SELECT SUM(vote_value) ...` (Much faster than calculating in JS).

## 3. Data Migration Script (One-Time)
Write a script `backend/scripts/migrate-data.js` to:
1.  Read `approved_dapps.json` -> Insert into DB with status `approved`.
2.  Read `submitted_dapps.json` -> Insert into DB with status `pending`.
3.  Read `votes.json` -> Match Dapp Name to DB ID -> Insert votes.

## 4. Refactor Backend Logic (`backend/server.js`)
Replace file-system logic with DB calls.

**Key Changes:**
*   **Startup:** Remove `loadDappIdMap`, `loadVotes`. Database is always "loaded".
*   **GET /api/dapps:** Query DB `WHERE status='approved'`.
*   **GET /api/admin/submissions:** Query DB `WHERE status='pending'`.
*   **POST /api/submit-dapp:** `db.createDapp({... status: 'pending'})`.
*   **POST /api/admin/approve:** `db.approveDapp(...)`.
*   **Voting Logic:** Call `db.castVote(...)`.

## 5. Clean Up
*   Rename `votes.json` -> `votes.json.bak` (backup).
*   Rename `approved_dapps.json` -> `approved_dapps.json.bak`.

## Verification
*   Verify one user can vote.
*   Verify "concurrency" (simulated) doesn't lose data.
