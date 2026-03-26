/**
 * server.mjs — Custom JSON Server with role-based application filtering.
 *
 * Run with:  node server.mjs
 * (replaces: json-server --watch db.json --port 3000)
 *
 * How it works
 * ────────────
 * GET /applications is intercepted BEFORE json-server's generic handler.
 * The Angular client passes the current user's context as query params:
 *
 *   ?userId=<id>&roles=<comma-separated groups>&leaderName=<display name>
 *
 * The middleware applies the following visibility rules server-side:
 *
 *   Admin       → sees ALL applications (unrestricted)
 *   RMC         → sees apps where workflow.nextRoles includes "RMC"
 *                 OR workflow.nextUsers includes their userId
 *   Reviewer    → sees ONLY apps where workflow.nextUsers includes their userId
 *                 (explicit assignment by RMC — NOT generic role match)
 *   HOS / RDIG_Chair / VC / CEO
 *               → sees apps where workflow.nextRoles includes their role
 *   Applicant   → sees apps where workflow.nextRoles includes "Applicant"
 *                 AND teamDetails.leaderName === their display name
 *
 * All other routes (POST, PATCH, DELETE /applications/:id, etc.) are handled
 * normally by json-server's built-in router.
 *
 * NOTE: In production, user identity must be verified via a signed JWT token,
 * not query parameters.  This file is demo/development only.
 */

import jsonServer from 'json-server'
import { readFileSync } from 'fs'

const server   = jsonServer.create()
const router   = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)

// ─── Role-based GET /applications ──────────────────────────────────────────

server.get('/applications', (req, res) => {
  const db   = JSON.parse(readFileSync('./db.json', 'utf-8'))
  const apps = db.applications ?? []

  console.log('--- Incoming GET /applications request ---');
  console.log('Query:', req.query);

  const userId     = String(req.query.userId     ?? '')
  const roles      = req.query.roles ? String(req.query.roles).split(',') : []
  const leaderName = String(req.query.leaderName ?? '')
  const department = String(req.query.department ?? '')

  // ── Admin: unrestricted ──────────────────────────────────────────────────
  if (roles.includes('Admin')) {
    return res.json(apps)
  }

  // ── Everyone else: filter per visibility rules ───────────────────────────
  const visible = apps.filter(app => {
    const wf = app.workflow
    if (!wf) return false

    const nextRoles = Array.isArray(wf.nextRoles) ? wf.nextRoles : []
    const nextUsers = Array.isArray(wf.nextUsers) ? wf.nextUsers : []

    // 1. Explicitly assigned (Reviewer1 / Reviewer2 set by RMC via dropdown)
    //    This check applies to ANY role — it is the only way Reviewers can see apps.
    if (userId && nextUsers.includes(userId)) return true

    // 2. RMC: workflow is waiting on RMC action
    if (roles.includes('RMC') && nextRoles.includes('RMC')) return true

    // 3. Role-based approvers: HOS, RDIG_Chair, VC, CEO
    for (const role of ['HOS', 'RDIG_Chair', 'VC', 'CEO']) {
      if (roles.includes(role) && nextRoles.includes(role)) {
        // HOS should only see applications from their own department
        if (role === 'HOS') {
          const appDept = app.teamDetails?.department ?? '';
          if (appDept && department && appDept !== department) {
            continue;
          }
        }
        return true;
      }
    }

    // 4. Applicant: action needed on their own application
    if (
      nextRoles.includes('Applicant') &&
      leaderName &&
      (app.teamDetails?.leaderName ?? '') === leaderName
    ) return true

    return false
  })

  res.json(visible)
})

// ─── All other routes handled by json-server ───────────────────────────────
server.use(router)

server.listen(3000, () => {
  console.log('JSON Server running at http://localhost:3000  (role-based filtering active)')
})
