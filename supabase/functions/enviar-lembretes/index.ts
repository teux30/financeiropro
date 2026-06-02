// Supabase Edge Function — enviar-lembretes
// Envia e-mails de contas a vencer via Resend. Chamada pelo cron (diário) ou
// em modo teste pelo app. A RESEND_API_KEY fica como secret do Supabase.
//
// Deploy:  supabase functions deploy enviar-lembretes
// Secret:  supabase secrets set RESEND_API_KEY=re_xxx
//
// Deno runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM = Deno.env.get('NOTIF_FROM') ?? 'Finance Pro <onboarding@resend.dev>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://financeiropro-lemon.vercel.app'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Aviso { descricao: string; valor: number; vencimento: string; dias: number; empresa: string }

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

const diasAte = (iso: string) => {
  const hoje = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  const d = new Date(iso.slice(0, 10) + 'T00:00:00').getTime()
  return Math.floor((d - hoje) / 86400000)
}

const textoUrg = (dias: number) =>
  dias < 0 ? `vencido há ${Math.abs(dias)} dia(s)` : dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `vence em ${dias} dias`

const corUrg = (dias: number) => (dias <= 0 ? '#ef4444' : dias <= 2 ? '#e8a020' : '#3b82f6')

interface Lembrete { titulo: string; quando: string; dias: number; perfil: string }

function montarHtml(nome: string, avisos: Aviso[], lembretes: Lembrete[] = []): string {
  const linhas = avisos.map(a => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #21262d;color:#e6edf3;font-size:14px">
        <strong>${a.descricao}</strong><br>
        <span style="color:#8b949e;font-size:12px">${a.empresa}</span>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #21262d;color:#e6edf3;font-size:14px;text-align:right;white-space:nowrap">
        ${fmtBRL(a.valor)}<br>
        <span style="color:${corUrg(a.dias)};font-size:12px;font-weight:600">${textoUrg(a.dias)}</span>
      </td>
    </tr>`).join('')

  const total = avisos.reduce((s, a) => s + a.valor, 0)

  const blocoLembretes = lembretes.length === 0 ? '' : `
    <div style="background:#141a14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;margin-top:16px">
      <div style="padding:16px;border-bottom:1px solid #21262d">
        <h2 style="margin:0;color:#e6edf3;font-size:15px">📝 ${lembretes.length} lembrete(s) do Bloco de Notas</h2>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${lembretes.map(l => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #21262d;color:#e6edf3;font-size:14px">
            <strong>${l.titulo}</strong><br><span style="color:#8b949e;font-size:12px">${l.perfil}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #21262d;text-align:right;white-space:nowrap">
            <span style="color:${corUrg(l.dias)};font-size:12px;font-weight:600">${l.quando}</span>
          </td>
        </tr>`).join('')}
      </table>
    </div>`

  const blocoContas = avisos.length === 0 ? '' : `
    <div style="background:#141a14;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
      <div style="padding:20px 16px;border-bottom:1px solid #21262d">
        <h1 style="margin:0;color:#e6edf3;font-size:18px">Olá${nome ? ', ' + nome : ''}! 👋</h1>
        <p style="margin:8px 0 0;color:#8b949e;font-size:14px">Você tem <strong style="color:#e8a020">${avisos.length}</strong> conta(s) a vencer:</p>
      </div>
      <table style="width:100%;border-collapse:collapse">${linhas}</table>
      <div style="padding:16px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:#8b949e;font-size:13px">Total</span>
        <strong style="color:#e6edf3;font-size:16px">${fmtBRL(total)}</strong>
      </div>
    </div>`

  return `<!doctype html><html><body style="margin:0;background:#0a0f0a;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#1d9e75,#10b981)"></div>
      <span style="color:#fff;font-size:18px;font-weight:700">Finance Pro</span>
    </div>
    ${avisos.length === 0 ? `<h1 style="margin:0 0 12px;color:#e6edf3;font-size:18px">Olá${nome ? ', ' + nome : ''}! 👋</h1>` : ''}
    ${blocoContas}
    ${blocoLembretes}
    <div style="margin-top:16px">
      <a href="${APP_URL}" style="display:block;text-align:center;background:#1d9e75;color:#fff;text-decoration:none;padding:12px;border-radius:10px;font-weight:600;font-size:14px">Ver no app</a>
    </div>
    <p style="color:#484f58;font-size:12px;text-align:center;margin-top:16px">
      Você recebe isto porque ativou avisos no Finance Pro. Gerencie em Configurações → Avisos.
    </p>
  </div></body></html>`
}

async function enviarEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurada')
    const body = await req.json().catch(() => ({}))

    // ── Modo teste: envia um e-mail de exemplo ──────────────────────────────
    if (body.teste) {
      // descobre o e-mail do usuário autenticado
      const authHeader = req.headers.get('Authorization') ?? ''
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE)
      const { data: userData } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
      const dest = body.email || userData?.user?.email
      if (!dest) throw new Error('E-mail de destino não informado')
      const exemplo: Aviso[] = [
        { descricao: 'Conta de energia', valor: 480.5, vencimento: new Date(Date.now() + 86400000).toISOString().slice(0, 10), dias: 1, empresa: 'Minha Empresa' },
        { descricao: 'Fornecedor de insumos', valor: 1250, vencimento: new Date().toISOString().slice(0, 10), dias: 0, empresa: 'Minha Empresa' },
      ]
      const exemploLembretes: Lembrete[] = [
        { titulo: 'Ligar para o contador', quando: 'vence amanhã', dias: 1, perfil: 'Pessoal' },
      ]
      await enviarEmail(dest, '🔔 Teste — avisos (Finance Pro)', montarHtml(userData?.user?.user_metadata?.nome ?? '', exemplo, exemploLembretes))
      return new Response(JSON.stringify({ ok: true, modo: 'teste', enviadoPara: dest }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── Modo cron: varre todos os usuários e envia o que está a vencer ──────
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: profiles, error } = await sb.from('profiles').select('id, email, data')
    if (error) throw error

    let enviados = 0
    for (const p of profiles ?? []) {
      // preferências
      const { data: pref } = await sb.from('preferencias_notificacao').select('*').eq('user_id', p.id).maybeSingle()
      if (pref && pref.ativo === false) continue
      const antecedencias: number[] = pref?.antecedencias ?? [7, 3, 1, 0]
      const janela = Math.max(...antecedencias)
      const dest = pref?.email || p.email
      if (!dest) continue

      // contas a vencer no snapshot (profiles.data → empresas[].contasPagar)
      type NotaSnap = { id: string; tipo: string; titulo?: string; texto?: string; dataLembrete?: string; lembreteResolvido?: boolean; arquivada?: boolean }
      const snap = p.data as {
        notasPessoal?: NotaSnap[]
        empresas?: { id: string; nome: string; contasPagar?: { id: string; descricao: string; valor: number; vencimento: string; status: string }[]; notas?: NotaSnap[] }[]
      }
      const avisos: { aviso: Aviso; contaId: string; nivel: number }[] = []
      for (const emp of snap?.empresas ?? []) {
        for (const c of emp.contasPagar ?? []) {
          if (c.status !== 'pendente') continue
          const dias = diasAte(c.vencimento)
          if (dias > janela) continue
          // nível de aviso = a menor antecedência aplicável
          const nivel = antecedencias.filter(a => dias <= a).sort((x, y) => x - y)[0] ?? 0
          // já enviado neste nível?
          const { data: reg } = await sb.from('registro_notificacoes')
            .select('id').eq('user_id', p.id).eq('conta_id', c.id).eq('nivel_aviso', nivel).maybeSingle()
          if (reg) continue
          avisos.push({ aviso: { descricao: c.descricao, valor: c.valor, vencimento: c.vencimento, dias, empresa: emp.nome }, contaId: c.id, nivel })
        }
      }

      // lembretes do Bloco de Notas (pessoal + cada empresa)
      const lembretes: { lembrete: Lembrete; notaId: string; nivel: number }[] = []
      const coletarNotas = (notas: NotaSnap[] | undefined, perfil: string) => {
        for (const n of notas ?? []) {
          if (n.tipo !== 'lembrete' || !n.dataLembrete || n.lembreteResolvido || n.arquivada) continue
          const dias = diasAte(n.dataLembrete)
          if (dias > janela) continue
          const nivel = antecedencias.filter(a => dias <= a).sort((x, y) => x - y)[0] ?? 0
          lembretes.push({ lembrete: { titulo: n.titulo || (n.texto ?? '').slice(0, 50) || 'Lembrete', quando: textoUrg(dias), dias, perfil }, notaId: n.id, nivel })
        }
      }
      coletarNotas(snap?.notasPessoal, 'Pessoal')
      for (const emp of snap?.empresas ?? []) coletarNotas(emp.notas, emp.nome)

      // remove lembretes já enviados neste nível
      const lembretesNovos: typeof lembretes = []
      for (const l of lembretes) {
        const { data: reg } = await sb.from('registro_notificacoes')
          .select('id').eq('user_id', p.id).eq('conta_id', `nota:${l.notaId}`).eq('nivel_aviso', l.nivel).maybeSingle()
        if (!reg) lembretesNovos.push(l)
      }

      if (avisos.length === 0 && lembretesNovos.length === 0) continue

      const totalItens = avisos.length + lembretesNovos.length
      await enviarEmail(dest, `🔔 ${totalItens} aviso(s) — Finance Pro`,
        montarHtml((p as { data?: { usuario?: { nome?: string } } }).data?.usuario?.nome ?? '', avisos.map(a => a.aviso), lembretesNovos.map(l => l.lembrete)))
      enviados++

      // marca como notificadas
      for (const a of avisos) {
        await sb.from('registro_notificacoes').insert({ user_id: p.id, conta_id: a.contaId, nivel_aviso: a.nivel })
      }
      for (const l of lembretesNovos) {
        await sb.from('registro_notificacoes').insert({ user_id: p.id, conta_id: `nota:${l.notaId}`, nivel_aviso: l.nivel })
      }
    }

    return new Response(JSON.stringify({ ok: true, usuariosNotificados: enviados }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'erro' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
