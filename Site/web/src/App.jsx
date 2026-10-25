import { useEffect, useState } from 'react'
import {
  ArrowUpRight, Menu, X, Copy, Check, Shield, Sparkles,
  Sword, Crown, Gem, Compass, ChevronRight, Gamepad2, LogIn, LogOut, LockKeyhole,
  MapPin, Clock3, Home, Coins, Backpack, BarChart3, Ban, VolumeX, MessageSquare, UserX
} from 'lucide-react'

const SERVER_IP = 'play.abyssalnexoria.com'
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const api = path => `${API_URL}${path}`

const ranks = [
  {
    name: 'Eco',
    subtitle: 'O primeiro passo',
    price: 'R$ 9,90',
    color: 'mint',
    icon: Sparkles,
    perks: ['Prefixo exclusivo', 'Kit inicial especial', 'Acesso a cosméticos básicos'],
  },
  {
    name: 'Arauto',
    subtitle: 'O chamado do abismo',
    price: 'R$ 19,90',
    color: 'blue',
    icon: Sword,
    perks: ['Todos os benefícios Eco', 'Mais opções de personalização', 'Kit de aventura'],
  },
  {
    name: 'Senhor',
    subtitle: 'Domine as sombras',
    price: 'R$ 29,90',
    color: 'violet',
    icon: Shield,
    perks: ['Todos os benefícios Arauto', 'Cosméticos avançados', 'Benefícios extras de progressão'],
    featured: true,
  },
  {
    name: 'Soberano',
    subtitle: 'A coroa esquecida',
    price: 'R$ 39,90',
    color: 'gold',
    icon: Crown,
    perks: ['Todos os benefícios Senhor', 'Efeitos visuais exclusivos', 'Kit premium'],
  },
  {
    name: 'Ascendente',
    subtitle: 'Além dos limites',
    price: 'R$ 49,90',
    color: 'cosmic',
    icon: Gem,
    perks: ['Todos os benefícios Soberano', 'Cosméticos lendários', 'Reconhecimento especial'],
  },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedRank, setSelectedRank] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [credentials, setCredentials] = useState({ nick: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [page, setPage] = useState(window.location.hash === '#conta' ? 'account' : window.location.hash === '#admin' ? 'admin' : 'home')

  useEffect(() => {
    fetch(api('/api/player/me'), { credentials: 'include' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setPlayer(data.player))
      .catch(() => setPlayer(null))
  }, [])

  useEffect(() => {
    const syncPage = () => setPage(window.location.hash === '#conta' ? 'account' : window.location.hash === '#admin' ? 'admin' : 'home')
    window.addEventListener('hashchange', syncPage)
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(SERVER_IP)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copie o endereço do servidor:', SERVER_IP)
    }
  }

  function startPurchase(rank) {
    setSelectedRank(rank)
    document.getElementById('loja')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function login(event) {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const response = await fetch(api('/api/auth/login'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      setPlayer(data.player)
      setLoginOpen(false)
      setCredentials({ nick: '', password: '' })
      window.location.hash = 'conta'
    } catch (error) {
      setLoginError(error.message || 'Não foi possível entrar.')
    } finally { setLoggingIn(false) }
  }

  function logout() { fetch(api('/api/auth/logout'), { method: 'POST', credentials: 'include' }); setPlayer(null); window.location.hash = '' }

  function openAccount() {
    if (player) window.location.hash = 'conta'
    else setLoginOpen(true)
  }

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#" aria-label="Abyssal Nexoria início">
          <span className="brand-mark"><Compass size={22} /></span>
          <span className="brand-copy">
            <strong>ABYSSAL <em>NEXORIA</em></strong>
            <small>O REINO ALÉM DO VÉU</small>
          </span>
        </a>

        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? 'nav nav-open' : 'nav'}>
          <a href="#" onClick={() => setMenuOpen(false)}>Início</a>
          <a href="#universo" onClick={() => setMenuOpen(false)}>O universo</a>
          <a href="#loja" onClick={() => setMenuOpen(false)}>Loja VIP</a>
          <a href="#como-jogar" onClick={() => setMenuOpen(false)}>Como jogar</a>
          <a className="nav-cta" href="#loja" onClick={() => setMenuOpen(false)}>Explorar loja <ArrowUpRight size={16} /></a>
          <button className="account-link" onClick={openAccount}>{player ? <><Compass size={15} /> Minha conta</> : <><LogIn size={15} /> Minha conta</>}</button>
          {player && <button className="account-link account-logout" onClick={logout}><LogOut size={15} /> Sair</button>}
          <a className="admin-link" href="#admin" onClick={() => setMenuOpen(false)}><LockKeyhole size={14} /> Admin</a>
        </nav>
      </header>

      <main>{page === 'admin' ? <AdminArea /> : page === 'account' ? (
        player ? <PlayerPanel player={player} /> : <section className="account-gate section-wrap"><span className="login-mark"><Shield size={24} /></span><h1>Área <span>restrita.</span></h1><p>Entre com sua conta do servidor para acessar seu perfil, inventário e progresso.</p><button className="button button-primary" onClick={() => setLoginOpen(true)}>Entrar na conta <LogIn size={17} /></button></section>
      ) : <>
        <section className="hero" id="inicio">
          <div className="hero-grid" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> UM NOVO MUNDO AGUARDA</div>
            <h1>O abismo<br />esconde <span>lendas.</span></h1>
            <p className="hero-description">
              Atravesse ruínas esquecidas, descubra poderes antigos e escreva
              seu nome na história de um mundo que nunca deixa de surpreender.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#como-jogar">Entrar na aventura <ChevronRight size={18} /></a>
              <a className="button button-ghost" href="#universo"><Compass size={17} /> Conhecer o mundo</a>
            </div>
            <div className="server-chip">
              <span className="server-status"><i /></span>
              <span><strong>Endereço do servidor</strong><small>{SERVER_IP}</small></span>
              <button onClick={copyIp} aria-label="Copiar endereço" title="Copiar endereço">
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
            <p className="demo-note">Endereço ilustrativo — substitua pelo IP real antes de publicar.</p>
          </div>
          <div className="hero-art" aria-label="Ilustração abstrata de um cristal mágico">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="rune rune-one">ᚷ</div>
            <div className="rune rune-two">✧</div>
            <div className="crystal-glow" />
            <div className="crystal">
              <div className="crystal-face face-one" />
              <div className="crystal-face face-two" />
              <div className="crystal-face face-three" />
              <div className="crystal-core" />
            </div>
            <div className="art-caption"><span>01 / O DESPERTAR</span><span>✦</span></div>
          </div>
          <div className="hero-bottom"><span>DESCUBRA O DESCONHECIDO</span><span className="scroll-line" /><span>ROLE PARA EXPLORAR</span></div>
        </section>

        <section className="intro section-wrap" id="universo">
          <div className="section-kicker"><span>01</span> UM UNIVERSO À SUA ESPERA</div>
          <div className="intro-layout">
            <h2>Não é apenas<br />um servidor.<br /><span>É outro mundo.</span></h2>
            <div className="intro-copy">
              <p>Uma aventura em constante evolução, onde exploração, progressão e comunidade se encontram. Prepare seu equipamento: há segredos escondidos para quem ousa ir além.</p>
              <div className="feature-list">
                <div><span className="feature-icon"><Compass /></span><span><strong>Explore sem limites</strong><small>Descubra regiões e ruínas misteriosas.</small></span></div>
                <div><span className="feature-icon"><Sword /></span><span><strong>Construa sua lenda</strong><small>Progrida, enfrente desafios e evolua.</small></span></div>
                <div><span className="feature-icon"><Gamepad2 /></span><span><strong>Faça parte da história</strong><small>Uma comunidade moldando o mundo.</small></span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="shop-section" id="loja">
          <div className="section-wrap">
            <div className="section-kicker"><span>02</span> A LOJA DO ABISMO</div>
            <div className="shop-heading">
              <div><h2>Seu próximo nível<br />começa <span>aqui.</span></h2></div>
              <p>Escolha seu rank e prepare-se para viver Nexoria de uma nova perspectiva. Os valores e benefícios abaixo são demonstrativos nesta primeira versão.</p>
            </div>
            <div className="rank-grid">
              {ranks.map((rank, index) => {
                const Icon = rank.icon
                return (
                  <article className={`rank-card ${rank.color} ${rank.featured ? 'rank-featured' : ''} ${selectedRank === rank.name ? 'rank-selected' : ''}`} key={rank.name}>
                    {rank.featured && <div className="popular-tag">MAIS ESCOLHIDO</div>}
                    <div className="rank-top"><span className="rank-icon"><Icon size={24} /></span><span className="rank-number">0{index + 1}</span></div>
                    <p className="rank-subtitle">{rank.subtitle}</p>
                    <h3>{rank.name}</h3>
                    <div className="price">{rank.price}<span> / 30 dias</span></div>
                    <div className="rank-divider" />
                    <ul>{rank.perks.map(perk => <li key={perk}><Check size={15} />{perk}</li>)}</ul>
                    <button className="rank-button" onClick={() => startPurchase(rank.name)}>Escolher rank <ArrowUpRight size={16} /></button>
                  </article>
                )
              })}
            </div>
            <div className="shop-disclaimer">
              <Shield size={17} />
              <p><strong>Compra segura em construção.</strong> O checkout ainda não está conectado. Nenhum pagamento será realizado nesta versão.</p>
            </div>
          </div>
        </section>

        <section className="join-section section-wrap" id="como-jogar">
          <div className="join-card">
            <div className="join-sigil"><Compass size={38} /></div>
            <div className="join-copy">
              <div className="section-kicker"><span>03</span> SUA JORNADA COMEÇA AGORA</div>
              <h2>O abismo está<br /><span>chamando.</span></h2>
              <p>Prepare seu Minecraft, reúna seus amigos e venha descobrir o que existe além do véu.</p>
            </div>
            <div className="join-actions">
              <button className="button button-primary" onClick={copyIp}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Endereço copiado' : 'Copiar endereço'}</button>
              <span>Java / Bedrock — compatibilidade a confirmar</span>
            </div>
          </div>
        </section>
      </>}</main>

      {loginOpen && <div className="login-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <form className="login-card" onSubmit={login}>
          <button type="button" className="login-close" onClick={() => setLoginOpen(false)} aria-label="Fechar"><X size={19} /></button>
          <span className="login-mark"><Compass size={24} /></span>
          <p className="section-kicker"><span>ÁREA DO JOGADOR</span></p>
          <h2 id="login-title">Sua jornada<br /><span>continua aqui.</span></h2>
          <p>Entre com o mesmo nick e senha cadastrados no servidor.</p>
          <label>Nick<input required value={credentials.nick} onChange={event => setCredentials({ ...credentials, nick: event.target.value })} autoComplete="username" placeholder="Seu nick no Minecraft" /></label>
          <label>Senha<input required type="password" value={credentials.password} onChange={event => setCredentials({ ...credentials, password: event.target.value })} autoComplete="current-password" placeholder="Sua senha" /></label>
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="button button-primary" disabled={loggingIn}>{loggingIn ? 'Entrando...' : 'Entrar na conta'} <ChevronRight size={17} /></button>
        </form>
      </div>}

      <footer className="footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark"><Compass size={20} /></span><span className="brand-copy"><strong>ABYSSAL <em>NEXORIA</em></strong><small>O REINO ALÉM DO VÉU</small></span></a>
        <p>Um mundo de fantasia, feito para exploradores.</p>
        <span className="footer-copy">© {new Date().getFullYear()} Abyssal Nexoria. Projeto independente.</span>
      </footer>
    </div>
  )
}

function PlayerPanel({ player }) {
  const percent = Math.min(100, Math.round(((player.experience || 0) / Math.max(1, player.experienceNextLevel || 1)) * 100))
  const date = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem dados'
  const location = player.lastLocation || { world: '—', x: '—', y: '—', z: '—' }
  const inventory = Array.isArray(player.inventory) ? player.inventory : []
  const homes = Array.isArray(player.homes) ? player.homes : []
  return <section className="account-area section-wrap" id="conta">
    <div className="account-heading"><div><div className="section-kicker"><span>SEU PERFIL · SINCRONIZADO PELO SERVIDOR</span></div><h2>Olá, <span>{player.nick}</span>.</h2></div><div className="profile-badges"><span className={player.online ? 'online-badge' : 'offline-badge'}><i />{player.online ? 'Online no servidor' : 'Offline'}</span><span className="vip-badge"><Crown size={15} /> {player.vip || 'Sem VIP'}</span></div></div>
    <div className="account-grid">
      <article className="profile-card"><span className="profile-avatar">{player.nick.slice(0, 1)}</span><strong>{player.nick}</strong><small>Nível {player.level || 0}</small><div className="xp"><span><BarChart3 size={14} /> {(player.experience || 0).toLocaleString('pt-BR')} / {(player.experienceNextLevel || 0).toLocaleString('pt-BR')} XP</span><i><b style={{ width: `${percent}%` }} /></i></div></article>
      <article className="stat-card"><Coins /><span>Saldo</span><strong>{(player.money || 0).toLocaleString('pt-BR')} moedas</strong></article>
      <article className="stat-card"><Clock3 /><span>Último login</span><strong>{date(player.lastLoginAt)}</strong></article>
      <article className="stat-card"><MapPin /><span>Última localização</span><strong>{location.world} · {location.x}, {location.y}, {location.z}</strong></article>
      <article className="details-card"><Home /><div><span>Homes salvas</span><p>{homes.length ? homes.join(' · ') : 'Nenhuma home sincronizada.'}</p></div></article>
      <article className="details-card"><Shield /><div><span>Proteções</span><p>{player.claims || 0} claims registradas no servidor.</p></div></article>
      <article className="inventory-card"><div className="inventory-title"><Backpack /><div><span>Inventário</span><small>Dados sincronizados pelo NexoriaBridge</small></div></div><div className="minecraft-inventory">{Array.from({ length: 27 }, (_, slot) => <InventorySlot key={slot} item={inventory.find(item => item.slot === slot)} />)}</div></article>
    </div>
  </section>
}

function InventorySlot({ item }) {
  if (typeof item === 'string') return <div className="inventory-slot inventory-loading" title={item} />
  return <div className="inventory-slot" title={item ? `${item.name}${item.amount > 1 ? ` (${item.amount})` : ''}` : 'Slot vazio'}>
    {item && <><span className={`minecraft-item ${item.type}`} aria-label={item.name}><i /><b /><em /></span>{item.amount > 1 && <strong>{item.amount}</strong>}</>}
  </div>
}

function AdminArea() {
  const [stage, setStage] = useState('checking')
  const [form, setForm] = useState({ nick: '', email: '', password: '', code: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [admin, setAdmin] = useState(null)
  const update = event => setForm({ ...form, [event.target.name]: event.target.value })
  useEffect(() => {
    fetch(api('/api/admin/me'), { credentials: 'include' }).then(async response => ({ ok: response.ok, data: await response.json() })).then(({ ok, data }) => { if (ok) { setAdmin(data.admin); setStage('dashboard') } else setStage(data.denied ? 'denied' : 'credentials') }).catch(() => setStage('credentials'))
  }, [])

  async function requestCode(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(api('/api/admin/auth/request-code'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json(); if (!response.ok) throw new Error(data.message)
      setStage('code')
    } catch (issue) { setError(issue.message || 'Não foi possível autenticar.') } finally { setBusy(false) }
  }
  async function verifyCode(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch(api('/api/admin/auth/verify-code'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json(); if (!response.ok) throw new Error(data.message)
      setAdmin(data.admin); setStage(data.admin.temporaryPassword ? 'change' : 'dashboard')
    } catch (issue) { setError(issue.message || 'Não foi possível validar o código.') } finally { setBusy(false) }
  }
  if (stage === 'checking') return <section className="admin-area section-wrap"><div className="admin-check">Validando acesso seguro…</div></section>
  if (stage === 'denied') return <section className="admin-area section-wrap"><div className="admin-denied"><LockKeyhole size={31} /><div className="section-kicker"><span>ACESSO BLOQUEADO</span></div><h1>O abismo viu<br />sua <span>tentativa.</span></h1><p>Não há nada para ver aqui sem uma sessão administrativa válida e 2FA confirmado. Se você é o administrador, sua sessão pode ter expirado ou a API foi reiniciada.</p><button className="button button-primary" onClick={() => setStage('credentials')}>Fazer login novamente <LogIn size={17} /></button></div></section>
  if (stage === 'change') return <TemporaryPasswordChange onDone={() => setStage('dashboard')} />
  if (stage === 'dashboard') return <section className="admin-area section-wrap"><div className="admin-heading"><div><div className="section-kicker"><span>PAINEL ADMINISTRATIVO · {admin.role}</span></div><h1>Bem-vindo, <span>{admin.nick}</span>.</h1></div><span className="secure-badge"><LockKeyhole size={14} /> 2FA verificado</span></div><PlayerManagement />{admin.role === 'owner' && <AdminCreation />}<div className="admin-placeholder"><Shield size={22} /><div><strong>Conexão administrativa segura</strong><p>As ações são enfileiradas pela API e somente o NexoriaBridge autenticado pode aplicá-las no servidor.</p></div></div></section>
  return <section className="admin-area section-wrap"><form className="admin-login" onSubmit={stage === 'credentials' ? requestCode : verifyCode}><span className="login-mark"><LockKeyhole size={24} /></span><div className="section-kicker"><span>ACESSO RESTRITO</span></div><h1>{stage === 'credentials' ? <>Painel <span>administrativo.</span></> : <>Confirme seu <span>acesso.</span></>}</h1>{stage === 'credentials' ? <><p>Informe suas três credenciais. Um código de confirmação será enviado para o WhatsApp cadastrado.</p><label>Nickname<input name="nick" value={form.nick} onChange={update} required autoComplete="username" /></label><label>E-mail<input name="email" type="email" value={form.email} onChange={update} required autoComplete="email" /></label><label>Senha<input name="password" type="password" value={form.password} onChange={update} required autoComplete="current-password" /></label></> : <><p>Enviamos um código de seis dígitos para o WhatsApp cadastrado. Ele expira em 10 minutos.</p><label>Código de autenticação<input name="code" value={form.code} onChange={update} required inputMode="numeric" maxLength="6" autoComplete="one-time-code" placeholder="000000" /></label></>}{error && <p className="login-error">{error}</p>}<button className="button button-primary" disabled={busy}>{busy ? 'Validando...' : stage === 'credentials' ? 'Enviar código' : 'Confirmar acesso'} <ChevronRight size={17} /></button>{stage === 'code' && <button type="button" className="back-button" onClick={() => setStage('credentials')}>Voltar para login</button>}</form></section>
}

function TemporaryPasswordChange({ onDone }) {
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); if (password !== confirm) return setError('As senhas não coincidem.'); const response = await fetch(api('/api/admin/change-password'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) }); const data = await response.json(); if (!response.ok) return setError(data.message); onDone() }
  return <section className="admin-area section-wrap"><form className="admin-login" onSubmit={submit}><span className="login-mark"><LockKeyhole size={24} /></span><div className="section-kicker"><span>PRIMEIRO ACESSO</span></div><h1>Defina uma <span>nova senha.</span></h1><p>Por segurança, a senha temporária não dá acesso ao painel até ser substituída.</p><label>Nova senha<input type="password" required minLength="10" value={password} onChange={e => setPassword(e.target.value)} /></label><label>Confirmar senha<input type="password" required minLength="10" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>{error && <p className="login-error">{error}</p>}<button className="button button-primary">Salvar nova senha <ChevronRight size={17} /></button></form></section>
}

function AdminCreation() {
  const [form, setForm] = useState({ nick: '', email: '', whatsapp: '' }); const [created, setCreated] = useState(null); const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setError(''); setCreated(null); try { const response = await fetch(api('/api/admin/admins'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setCreated(data); setForm({ nick: '', email: '', whatsapp: '' }) } catch (issue) { setError(issue.message) } }
  return <form className="create-admin" onSubmit={submit}><div><div className="section-kicker"><span>GESTÃO DO DONO</span></div><h2>Criar administrador</h2><p>O sistema gera uma senha temporária, que deve ser entregue ao novo administrador uma única vez.</p></div><label>Nickname<input required value={form.nick} onChange={e => setForm({ ...form, nick: e.target.value })} /></label><label>E-mail<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>WhatsApp<input required inputMode="tel" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" /></label><button className="button button-primary">Gerar acesso temporário</button>{created && <p className="temporary-password">Senha temporária de <strong>{created.admin.nick}</strong>: <code>{created.temporaryPassword}</code><small>Copie agora. Ela não será mostrada novamente.</small></p>}{error && <p className="login-error">{error}</p>}</form>
}

function PlayerManagement() {
  const [players, setPlayers] = useState([]); const [actions, setActions] = useState([]); const [notice, setNotice] = useState('Carregando jogadores…')
  const load = () => fetch(api('/api/admin/players'), { credentials: 'include' }).then(response => response.ok ? response.json() : Promise.reject()).then(data => { setPlayers(data.players); setActions(data.actions || []); setNotice(data.players.length ? '' : 'Nenhum jogador sincronizado ainda.') }).catch(() => setNotice('Não foi possível carregar os jogadores.'))
  useEffect(() => { load() }, [])
  async function action(player, type) { const reason = window.prompt(`Motivo para ${type} em ${player.nick}:`); if (reason === null) return; const response = await fetch(api(`/api/admin/players/${encodeURIComponent(player.id)}/actions`), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, reason }) }); const data = await response.json(); if (response.ok) { setNotice(`Ação ${type} enviada para ${player.nick}.`); load() } else setNotice(data.message) }
  const online = players.filter(player => player.online).length
  return <section className="player-management"><div className="management-head"><div><div className="section-kicker"><span>JOGADORES DO SERVIDOR · NEXORIABRIDGE</span></div><h2>Controle em tempo real</h2></div><button className="refresh-button" onClick={load}>Atualizar</button></div><div className="admin-stats bridge-stats"><article><strong>{online}</strong><span>Jogadores online</span></article><article><strong>{players.length}</strong><span>Contas sincronizadas</span></article><article><strong>{actions.length}</strong><span>Ações aguardando servidor</span></article></div>{notice && <p className="management-notice">{notice}</p>}<div className="player-table">{players.map(player => <article key={player.id}><div><strong><i className={player.online ? 'online-dot' : ''} />{player.nick}</strong><small>{player.online ? `Online · ${player.lastLocation?.world || 'mundo desconhecido'}` : `Último login: ${player.lastLoginAt ? new Date(player.lastLoginAt).toLocaleString('pt-BR') : 'sem dados'}`}</small></div><span>Nível {player.level}</span><span>{player.money?.toLocaleString('pt-BR') || 0} moedas</span><span>{player.vip || 'Sem VIP'}</span><div className="moderation-actions"><button title="Kick" onClick={() => action(player, 'kick')}><UserX size={14} /></button><button title="Silenciar" onClick={() => action(player, 'mute')}><VolumeX size={14} /></button><button title="Advertir" onClick={() => action(player, 'warn')}><MessageSquare size={14} /></button><button className="danger" title="Banir" onClick={() => action(player, 'ban')}><Ban size={14} /></button></div></article>)}</div></section>
}

export default App
