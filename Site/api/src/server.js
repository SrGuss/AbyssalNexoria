import { createHash, pbkdf2Sync, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

const usersPath = fileURLToPath(new URL('../data/users.json', import.meta.url))
const adminsPath = fileURLToPath(new URL('../data/admins.json', import.meta.url))
const sessions = new Map()
const adminChallenges = new Map()
const adminSessions = new Map()

async function loadUsers() {
  return JSON.parse(await readFile(usersPath, 'utf8'))
}
async function saveUsers(users) { await writeFile(usersPath, `${JSON.stringify(users, null, 2)}\n`) }
async function loadAdmins() { return JSON.parse(await readFile(adminsPath, 'utf8')) }
async function saveAdmins(admins) { await writeFile(adminsPath, `${JSON.stringify(admins, null, 2)}\n`) }

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': process.env.WEB_ORIGIN || '*', 'Access-Control-Allow-Credentials': 'true' })
  response.end(JSON.stringify(payload))
}

function jsonWithCookie(response, status, payload, cookie) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Set-Cookie': cookie, 'Access-Control-Allow-Origin': process.env.WEB_ORIGIN || '*', 'Access-Control-Allow-Credentials': 'true' })
  response.end(JSON.stringify(payload))
}

function cookieFrom(request, name) {
  const value = request.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1)
  return value ? decodeURIComponent(value) : null
}

function sessionCookie(name, token, days) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${name}=${encodeURIComponent(token)}; Max-Age=${days * 86400}; Path=/; HttpOnly; SameSite=Lax${secure}`
}

function clearCookie(name) { return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax` }
function pluginAuthorized(request) {
  const key = request.headers['x-nexoria-plugin-key']
  const expected = process.env.PLUGIN_LOGIN_KEY
  return Boolean(expected) && typeof key === 'string' && key.length === expected.length && timingSafeEqual(Buffer.from(key), Buffer.from(expected))
}

function publicPlayer(user) {
  return { id: user.id, nick: user.nick, ...user.profile }
}

function validPassword(password, stored) {
  const attempted = pbkdf2Sync(password, stored.salt, stored.iterations, 32, 'sha256')
  return timingSafeEqual(attempted, Buffer.from(stored.hash, 'hex'))
}

function sessionFrom(request) {
  const auth = request.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : cookieFrom(request, 'abyssal_player')
  if (!token) return null
  const session = sessions.get(createHash('sha256').update(token).digest('hex'))
  return session?.expiresAt > Date.now() ? session.id : null
}

async function bodyFrom(request) {
  let raw = ''
  for await (const piece of request) raw += piece
  return JSON.parse(raw)
}

function configuredOwner() {
  const { OWNER_NICK, OWNER_EMAIL, OWNER_WHATSAPP, OWNER_PASSWORD_SALT, OWNER_PASSWORD_HASH } = process.env
  if (!OWNER_NICK || !OWNER_EMAIL || !OWNER_WHATSAPP || !OWNER_PASSWORD_SALT || !OWNER_PASSWORD_HASH) return null
  return { id: 'owner', nick: OWNER_NICK, email: OWNER_EMAIL.toLowerCase(), whatsapp: OWNER_WHATSAPP, role: 'owner', password: { salt: OWNER_PASSWORD_SALT, hash: OWNER_PASSWORD_HASH, iterations: 310000 } }
}

function sendWhatsAppTwoFactorCode(whatsapp, code) {
  // Adaptador temporário: conecte aqui o futuro bot/provedor de WhatsApp.
  if (process.env.NODE_ENV !== 'production') console.log(`[2FA WhatsApp desenvolvimento] Código para ${whatsapp}: ${code}`)
}
function hashPassword(password) { const salt = randomBytes(16).toString('hex'); return { algorithm: 'pbkdf2-sha256', iterations: 310000, salt, hash: pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex') } }
function temporaryPassword() { return randomBytes(9).toString('base64url') }
function adminSessionFrom(request) { const auth = request.headers.authorization; const token = auth?.startsWith('Bearer ') ? auth.slice(7) : cookieFrom(request, 'abyssal_admin'); if (!token) return null; const session = adminSessions.get(createHash('sha256').update(token).digest('hex')); return session?.expiresAt > Date.now() ? session : null }

createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Origin': process.env.WEB_ORIGIN || '*', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Nexoria-Plugin-Key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' })
      return response.end()
    }
    if (request.method === 'GET' && request.url === '/health') {
      return json(response, 200, { ok: true, service: 'abyssal-nexoria-api', timestamp: new Date().toISOString() })
    }
    if (request.method === 'POST' && request.url === '/api/auth/login') {
      const { nick, password } = await bodyFrom(request)
      const users = await loadUsers()
      const user = users.find(item => item.nick.toLowerCase() === String(nick).trim().toLowerCase())
      if (!user || typeof password !== 'string' || !validPassword(password, user.password)) {
        return json(response, 401, { message: 'Nick ou senha inválidos.' })
      }
      const token = randomBytes(32).toString('base64url')
      sessions.set(createHash('sha256').update(token).digest('hex'), { id: user.id, expiresAt: Date.now() + 30 * 86400 * 1000 })
      return jsonWithCookie(response, 200, { player: publicPlayer(user) }, sessionCookie('abyssal_player', token, 30))
    }
    if (request.method === 'POST' && request.url === '/api/plugin/login/verify') {
      if (!pluginAuthorized(request)) return json(response, 403, { message: 'Plugin não autorizado.' })
      const { nick, password } = await bodyFrom(request)
      const users = await loadUsers()
      const user = users.find(item => item.nick.toLowerCase() === String(nick).trim().toLowerCase())
      if (!user || typeof password !== 'string' || !validPassword(password, user.password)) return json(response, 401, { message: 'Credenciais inválidas.' })
      return json(response, 200, { ok: true, player: { id: user.id, nick: user.nick, temporaryPassword: Boolean(user.temporaryPassword) } })
    }
    if (request.method === 'POST' && request.url === '/api/plugin/login/register') {
      if (!pluginAuthorized(request)) return json(response, 403, { message: 'Plugin não autorizado.' })
      const { nick, uuid, password } = await bodyFrom(request)
      const cleanNick = String(nick ?? '').trim()
      if (!/^[A-Za-z0-9_]{3,16}$/.test(cleanNick) || !/^[0-9a-f-]{36}$/i.test(String(uuid ?? ''))) return json(response, 400, { message: 'Dados de jogador inválidos.' })
      if (typeof password !== 'string' || password.length < 10) return json(response, 400, { message: 'A senha precisa ter ao menos 10 caracteres.' })
      const users = await loadUsers()
      if (users.some(item => item.nick.toLowerCase() === cleanNick.toLowerCase())) return json(response, 409, { message: 'Esta conta já está registrada.' })
      const user = { id: `player-${uuid}`, nick: cleanNick, minecraftUuid: uuid, password: hashPassword(password), temporaryPassword: false, profile: { level: 1, experience: 0, experienceNextLevel: 100, money: 0, vip: null, vipExpiresAt: null, lastLoginAt: new Date().toISOString(), lastLogoutAt: null, lastLocation: { world: 'world', x: 0, y: 64, z: 0 }, homes: [], inventory: [] } }
      users.push(user); await saveUsers(users)
      return json(response, 201, { ok: true, player: { id: user.id, nick: user.nick } })
    }
    if (request.method === 'POST' && request.url === '/api/admin/auth/request-code') {
      const { nick, email, password } = await bodyFrom(request)
      const owner = configuredOwner()
      const admins = await loadAdmins()
      const admin = [owner, ...admins].find(item => item && item.nick.toLowerCase() === String(nick).trim().toLowerCase() && item.email === String(email).trim().toLowerCase())
      const matches = admin && typeof password === 'string' && validPassword(password, admin.password)
      if (!matches) return json(response, 401, { message: 'Credenciais administrativas inválidas.' })
      const code = String(randomInt(100000, 1000000))
      adminChallenges.set(admin.email, { codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 })
      sendWhatsAppTwoFactorCode(admin.whatsapp, code)
      return json(response, 200, { message: 'Código enviado para o WhatsApp cadastrado.' })
    }
    if (request.method === 'POST' && request.url === '/api/admin/auth/verify-code') {
      const { email, code } = await bodyFrom(request)
      const owner = configuredOwner()
      const admins = await loadAdmins()
      const admin = [owner, ...admins].find(item => item && item.email === String(email).trim().toLowerCase())
      const challenge = adminChallenges.get(String(email).trim().toLowerCase())
      if (!admin || String(email).trim().toLowerCase() !== admin.email || !challenge || challenge.expiresAt < Date.now() || challenge.attempts >= 5 || createHash('sha256').update(String(code)).digest('hex') !== challenge.codeHash) {
        if (challenge) challenge.attempts += 1
        return json(response, 401, { message: 'Código inválido ou expirado.' })
      }
      adminChallenges.delete(admin.email)
      const token = randomBytes(32).toString('base64url')
      adminSessions.set(createHash('sha256').update(token).digest('hex'), { id: admin.id, nick: admin.nick, role: admin.role, expiresAt: Date.now() + 7 * 86400 * 1000 })
      return jsonWithCookie(response, 200, { admin: { nick: admin.nick, email: admin.email, role: admin.role, temporaryPassword: Boolean(admin.temporaryPassword) } }, sessionCookie('abyssal_admin', token, 7))
    }
    if (request.method === 'POST' && request.url === '/api/admin/admins') {
      const session = adminSessionFrom(request)
      if (!session || session.role !== 'owner') return json(response, 403, { message: 'Apenas o dono pode criar administradores.' })
      const { nick, email, whatsapp } = await bodyFrom(request)
      if (!nick || !email || !whatsapp) return json(response, 400, { message: 'Preencha nickname, e-mail e WhatsApp.' })
      const admins = await loadAdmins()
      if (admins.some(item => item.nick.toLowerCase() === String(nick).trim().toLowerCase() || item.email === String(email).trim().toLowerCase())) return json(response, 409, { message: 'Já existe um administrador com esses dados.' })
      const password = temporaryPassword()
      const admin = { id: `admin-${randomBytes(8).toString('hex')}`, nick: String(nick).trim(), email: String(email).trim().toLowerCase(), whatsapp: String(whatsapp).replace(/\D/g, ''), role: 'admin', password: hashPassword(password), temporaryPassword: true }
      admins.push(admin); await saveAdmins(admins)
      return json(response, 201, { admin: { id: admin.id, nick: admin.nick, email: admin.email, whatsapp: admin.whatsapp, role: admin.role }, temporaryPassword: password })
    }
    if (request.method === 'POST' && request.url === '/api/admin/change-password') {
      const session = adminSessionFrom(request); const { password } = await bodyFrom(request)
      if (!session) return json(response, 401, { message: 'Sessão inválida.' })
      if (typeof password !== 'string' || password.length < 10) return json(response, 400, { message: 'A senha precisa ter ao menos 10 caracteres.' })
      const admins = await loadAdmins(); const admin = admins.find(item => item.id === session.id)
      if (!admin) return json(response, 403, { message: 'A senha do dono é gerenciada nas variáveis de ambiente.' })
      admin.password = hashPassword(password); admin.temporaryPassword = false; await saveAdmins(admins)
      return json(response, 200, { message: 'Senha atualizada.' })
    }
    if (request.method === 'GET' && request.url === '/api/admin/me') {
      const session = adminSessionFrom(request)
      if (session) return json(response, 200, { admin: { nick: session.nick, role: session.role } })
      const hasAdminCookie = Boolean(cookieFrom(request, 'abyssal_admin'))
      if (hasAdminCookie) console.warn(`[segurança] Sessão administrativa inválida de ${request.socket.remoteAddress ?? 'origem desconhecida'}`)
      return json(response, 401, { message: 'Sessão inválida.', denied: hasAdminCookie })
    }
    if (request.method === 'GET' && request.url === '/api/player/me') {
      const playerId = sessionFrom(request)
      const users = await loadUsers()
      const user = users.find(item => item.id === playerId)
      return user ? json(response, 200, { player: publicPlayer(user) }) : json(response, 401, { message: 'Sessão inválida.' })
    }
    if (request.method === 'POST' && request.url === '/api/auth/logout') {
      return jsonWithCookie(response, 200, { message: 'Sessão encerrada.' }, clearCookie('abyssal_player'))
    }
    if (request.method === 'POST' && request.url === '/api/admin/auth/logout') {
      return jsonWithCookie(response, 200, { message: 'Sessão encerrada.' }, clearCookie('abyssal_admin'))
    }
    json(response, 404, { message: 'Rota não encontrada.' })
  } catch {
    json(response, 400, { message: 'Não foi possível processar a solicitação.' })
  }
}).listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log(`API em http://0.0.0.0:${process.env.PORT || 3001}`))
