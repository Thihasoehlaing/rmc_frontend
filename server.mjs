/**
 * server.mjs — Custom JSON Server with role-based application filtering
 *              and batch-sitting date enforcement.
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
 * POST /applications is intercepted to enforce batch constraints:
 *   - An active batch must exist.
 *   - Today must fall within batch.startDate and batch.endDate.
 *   - Submissions outside this window are rejected with HTTP 422.
 *
 * All other routes (PATCH, DELETE /applications/:id, /batches, etc.) are
 * handled normally by json-server's built-in router.
 *
 * NOTE: In production, user identity must be verified via a signed JWT token,
 * not query parameters.  This file is demo/development only.
 */

import jsonServer from 'json-server'
import { readFileSync } from 'fs'

const server      = jsonServer.create()
const router      = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()
const allowedOrigins = new Set([
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

server.disable('x-powered-by')

server.use(middlewares)
server.use(jsonServer.bodyParser)

server.use((req, res, next) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : ''

  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      error: 'Origin not allowed',
      message: 'Requests from this browser origin are blocked by the local demo server.',
    })
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})

// ─── Helper ────────────────────────────────────────────────────────────────

function readDb() {
  return JSON.parse(readFileSync('./db.json', 'utf-8'))
}

function todayStr() {
  return new Date().toISOString().substring(0, 10)
}

// ─── Terminal workflow statuses (used by history view) ─────────────────────
const TERMINAL_STATUSES = [
  'approved',
  'rejected_hos',
  'rejected_rmc',
  'rejected_rdig_chair',
  'rejected_vc',
  'rejected_ceo',
]

// ─── Role-based GET /notifications ─────────────────────────────────────────
//
// Mirrors the same visibility rules used for GET /applications:
//   Admin          → all notifications
//   HOS            → recipientRole === 'HOS' AND recipientDepartment matches
//   Other roles    → recipientRole matches any of the user's roles
//   Specific users → recipientUserId matches (applicant, assigned reviewer)
//
server.get('/notifications', (req, res) => {
  const db            = readDb()
  const notifications = (db.notifications ?? []).slice().reverse() // newest first

  const userId     = String(req.query.userId     ?? '')
  const roles      = req.query.roles ? String(req.query.roles).split(',') : []
  const department = String(req.query.department ?? '')

  if (roles.includes('Admin')) {
    return res.json(notifications)
  }

  const visible = notifications.filter(n => {
    // Targeted at a specific user (applicant, reviewer)
    if (n.recipientUserId) return n.recipientUserId === userId

    // Role-based
    if (n.recipientRole && roles.includes(n.recipientRole)) {
      // HOS: must also match department
      if (n.recipientRole === 'HOS') {
        return !n.recipientDepartment || !department || n.recipientDepartment === department
      }
      return true
    }

    return false
  })

  res.json(visible)
})

// ─── Role-based GET /applications ──────────────────────────────────────────
//
// Supports an optional ?view= query parameter:
//
//   (default / 'inbox') — applications currently awaiting the user's action.
//                          Drafts (isDraft === true) are always excluded.
//
//   'my'     — ALL applications that belong to the requesting user as applicant
//               (matched by applicantUserId or leaderName). Used for the Drafts
//               and Pending pages where applicants see their own submissions.
//
//   'history' — Applications that the user has already acted on but that are no
//               longer in their active queue. For applicants this also includes
//               terminal applications (approved / rejected) regardless of history.

server.get('/applications', (req, res) => {
  const db   = readDb()
  const apps = db.applications ?? []

  const userId     = String(req.query.userId     ?? '')
  const roles      = req.query.roles ? String(req.query.roles).split(',') : []
  const leaderName = String(req.query.leaderName ?? '')   // current user's display name
  const department = String(req.query.department ?? '')
  const view       = String(req.query.view       ?? 'inbox')

  // ── Shared helper: is this user currently the next actor? ────────────────
  function stillInQueue(app) {
    const wf       = app.workflow ?? {}
    const nextRoles = Array.isArray(wf.nextRoles) ? wf.nextRoles : []
    const nextUsers = Array.isArray(wf.nextUsers) ? wf.nextUsers : []

    if (userId && nextUsers.includes(userId)) return true
    if (roles.some(r => nextRoles.includes(r))) return true
    if (
      nextRoles.includes('Applicant') &&
      leaderName &&
      (app.teamDetails?.leaderName ?? '') === leaderName
    ) return true
    return false
  }

  // ── "my" view: all applications submitted by the current user ────────────
  if (view === 'my') {
    const mine = apps.filter(app =>
      (userId && String(app.metadata?.applicantUserId) === userId) ||
      (leaderName && (app.teamDetails?.leaderName ?? '') === leaderName)
    )
    return res.json(mine)
  }

  if (view === 'admin') {
    if (!roles.includes('Admin')) return res.json([])
    return res.json(apps.filter(a => !a.isDraft))
  }

  // ── "history" view: acted on by the user but no longer their active task ─
  //
  // Visibility rules:
  //   Applicant (own app)  → ONLY when the application has reached a terminal
  //                          status (approved / rejected). In-progress submitted
  //                          apps belong to the Pending page, not History.
  //   Reviewer / Approver  → Apps they explicitly acted on (entry in workflow
  //                          history) that are no longer in their active queue.
  if (view === 'history') {
    const hist = apps.filter(app => {
      if (app.isDraft === true) return false       // never show drafts in history
      const wf        = app.workflow ?? {}
      const wfHistory = Array.isArray(wf.history) ? wf.history : []

      // Is this the user's own submitted application?
      const isOwnApp =
        (userId && String(app.metadata?.applicantUserId) === userId) ||
        (leaderName && (app.teamDetails?.leaderName ?? '') === leaderName)

      if (isOwnApp) {
        // Applicants only see their app in history once a final decision is made.
        // While the app is still in review it belongs to the Pending page.
        return TERMINAL_STATUSES.includes(wf.currentStatus ?? '')
      }

      // For reviewer / approver roles: show if they took an action on this app
      // AND it has since left their active queue.
      const userActed = wfHistory.some(h => leaderName && h.performedBy === leaderName)
      if (!userActed) return false
      if (stillInQueue(app)) return false
      return true
    })
    return res.json(hist)
  }

  // ── Admin: unrestricted inbox (drafts excluded) ──────────────────────────

  // ── Default "inbox" view: apps currently awaiting the user's action ───────
  // Drafts (isDraft === true) have nextRoles: [] so they never surface here,
  // but we also guard explicitly to be safe.
  const visible = apps.filter(app => {
    if (app.isDraft === true) return false

    const wf       = app.workflow
    if (!wf) return false
    const nextRoles = Array.isArray(wf.nextRoles) ? wf.nextRoles : []
    const nextUsers = Array.isArray(wf.nextUsers) ? wf.nextUsers : []

    // 1. Explicitly assigned (Reviewer1 / Reviewer2 set by RMC via dropdown)
    if (userId && nextUsers.includes(userId)) return true

    // 2. RMC: workflow is waiting on RMC action
    if (roles.includes('RMC') && nextRoles.includes('RMC')) return true

    // 3. Role-based approvers: HOS, RDIG_Chair, VC, CEO
    for (const role of ['HOS', 'RDIG_Chair', 'VC', 'CEO']) {
      if (roles.includes(role) && nextRoles.includes(role)) {
        if (role === 'HOS') {
          const appDept = app.teamDetails?.department ?? ''
          if (appDept && department && appDept !== department) continue
        }
        return true
      }
    }

    // 4. Applicant: action needed on their own application
    if (nextRoles.includes('Applicant')) {
      const isOwner = (userId && String(app.metadata?.applicantUserId) === userId) ||
                      (leaderName && (app.teamDetails?.leaderName ?? '') === leaderName)
      if (isOwner) return true
    }

    return false
  })

  res.json(visible)
})

// ─── Batch-enforced POST /applications ─────────────────────────────────────
// Drafts (isDraft === true) bypass batch enforcement so applicants can save
// progress even when no batch is currently open.

server.post('/applications', (req, res, next) => {
  // Drafts are always allowed — no batch needed to save a draft
  if (req.body && req.body.isDraft === true) {
    return next()
  }

  const db      = readDb()
  const batches = db.batches ?? []
  const today   = todayStr()

  const activeBatch = batches.find(b => b.status === 'active')

  if (!activeBatch) {
    return res.status(422).json({
      error: 'No active batch',
      message: 'RDIG application submission is not allowed. No active batch exists.',
    })
  }

  if (today < activeBatch.startDate || today > activeBatch.endDate) {
    return res.status(422).json({
      error: 'Outside batch window',
      message: `Submission is only allowed between ${activeBatch.startDate} and ${activeBatch.endDate}. Current date: ${today}, contact with RMC if you need an extension.`,
    })
  }

  // Auto-stamp the active batch id onto the application metadata
  if (req.body && req.body.metadata) {
    req.body.metadata.batch = activeBatch.id
  }

  // Hand off to json-server for the actual persistence
  next()
})

// ─── All other routes handled by json-server ───────────────────────────────
server.use(router)

server.listen(3000, () => {
  console.log('JSON Server running at http://localhost:3000  (batch-based filtering + date enforcement active)')
})

