import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Sparkles } from 'lucide-react'
import { useStore } from '../store/useStore'
import { consultarIA, iaConfigurada, type MsgChat } from '../services/consultorIA'
import { fmtBRL } from '../lib/format'

const SUGESTOES = ['Qual meu CMV este mês?', 'Onde posso cortar custos?', 'Meu pró-labore está saudável?', 'Como está a margem?']

export function ChatbotIA() {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<MsgChat[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, carregando])

  const accent = s.perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'

  const construirContexto = (): string => {
    const perfil = s.perfilAtivo
    const mes = new Date().toISOString().slice(0, 7)
    const linhas: string[] = [`Perfil ativo: ${perfil}`, `Mês de referência: ${mes}`]
    if (perfil === 'empresa') {
      const emp = s.getEmpresaAtiva()
      const banco = s.getBanco('empresa')
      const tx = banco.transacoes.filter(t => t.categoria !== 'transferencia' && !t.transferenciaId && t.data.startsWith(mes))
      const receita = tx.filter(t => t.tipo === 'entrada').reduce((a, t) => a + t.valor, 0)
      const saidas = tx.filter(t => t.tipo === 'saida').reduce((a, t) => a + t.valor, 0)
      const cmvV = tx.filter(t => t.tipo === 'saida' && t.categoria === 'insumos').reduce((a, t) => a + t.valor, 0)
      const folha = tx.filter(t => t.tipo === 'saida' && t.categoria === 'folha').reduce((a, t) => a + t.valor, 0)
      const lucro = receita - saidas
      const cfg = s.getConfigPrecificacao()
      const saldoPJ = s.getSaldoTotal('empresa')
      linhas.push(
        `Empresa: ${emp?.nome ?? '-'} (${emp?.setor ?? '-'})`,
        `Saldo em contas (PJ): ${fmtBRL(saldoPJ)}`,
        `Faturamento do mês: ${fmtBRL(receita)}`,
        `Saídas do mês: ${fmtBRL(saidas)}`,
        `Lucro do mês: ${fmtBRL(lucro)} (margem ${receita > 0 ? ((lucro / receita) * 100).toFixed(1) : '0'}%)`,
        `CMV (insumos): ${fmtBRL(cmvV)} (${receita > 0 ? ((cmvV / receita) * 100).toFixed(1) : '0'}% da receita)`,
        `Folha/pessoal pago no mês: ${fmtBRL(folha)}`,
        `Pró-labore configurado: ${fmtBRL(cfg.proLabore)} | custos fixos: ${fmtBRL(cfg.custosFixosMensais)} | lucro desejado: ${cfg.lucroDesejadoPct}%`,
      )
      // contas a vencer
      const aVencer = (emp?.contasPagar ?? []).filter(c => c.status !== 'pago')
      if (aVencer.length) linhas.push(`Contas a pagar em aberto: ${aVencer.length} (total ${fmtBRL(aVencer.reduce((a, c) => a + c.valor, 0))})`)
      // top despesas por categoria
      const porCat = new Map<string, number>()
      tx.filter(t => t.tipo === 'saida').forEach(t => porCat.set(t.categoria, (porCat.get(t.categoria) ?? 0) + t.valor))
      const top = [...porCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      if (top.length) linhas.push('Maiores despesas: ' + top.map(([c, v]) => `${c} ${fmtBRL(v)}`).join(', '))
    } else {
      const saldo = s.getSaldoTotal('pessoal')
      const receita = s.getReceitasMes(mes, 'pessoal')
      const desp = s.getDespesasMes(mes, 'pessoal')
      linhas.push(
        `Saldo em contas (pessoal): ${fmtBRL(saldo)}`,
        `Receitas do mês: ${fmtBRL(receita)}`,
        `Despesas do mês: ${fmtBRL(desp)}`,
        `Sobra para investir: ${fmtBRL(receita - desp)}`,
        `Renda passiva mensal: ${fmtBRL(s.getRendaPassivaMensal())}`,
        `Independência financeira: ${s.getIndependenciaFinanceira().toFixed(0)}%`,
      )
    }
    return linhas.join('\n')
  }

  const enviar = async (texto: string) => {
    const q = texto.trim()
    if (!q || carregando) return
    const novo = [...msgs, { role: 'user' as const, content: q }]
    setMsgs(novo); setInput(''); setCarregando(true)
    const r = await consultarIA(novo, construirContexto())
    setCarregando(false)
    setMsgs(m => [...m, { role: 'assistant', content: r.ok ? (r.texto ?? '') : `⚠️ ${r.error}` }])
  }

  if (!iaConfigurada()) return null // plugável: sem chave, não aparece

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button onClick={() => setOpen(true)}
          className="hidden md:flex fixed z-40 items-center justify-center w-12 h-12 rounded-full shadow-lg"
          style={{ right: 'calc(1rem + var(--safe-right))', bottom: 'calc(1rem + var(--safe-bottom))', background: accent }}
          title="Consultor IA">
          <Bot size={22} className="text-white" />
        </button>
      )}

      {open && (
        <div className="fixed z-[60] flex flex-col bg-[#0d1117] border border-[#21262d] shadow-2xl
                        inset-x-0 bottom-0 top-0 sm:inset-auto sm:right-4 sm:bottom-4 sm:top-auto sm:w-[380px] sm:h-[540px] sm:rounded-2xl overflow-hidden"
          style={{ paddingTop: 'var(--safe-top)' }}>
          {/* header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#21262d]">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}22` }}><Bot size={15} style={{ color: accent }} /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#e6edf3]">Consultor IA</p>
              <p className="text-[11px] text-[#8b949e]">{s.perfilAtivo === 'pessoal' ? 'Finanças pessoais' : s.getEmpresaAtiva()?.nome ?? 'Empresa'}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 text-[#8b949e] hover:text-[#e6edf3]"><X size={18} /></button>
          </div>

          {/* mensagens */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {msgs.length === 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-[#8b949e]"><Sparkles size={15} style={{ color: accent }} /> Pergunte sobre seus números reais.</div>
                <div className="flex flex-col gap-2">
                  {SUGESTOES.map(sug => (
                    <button key={sug} onClick={() => enviar(sug)} className="text-left text-sm px-3 py-2 rounded-lg border text-[#e6edf3]" style={{ borderColor: '#30363d', background: '#141a14' }}>{sug}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'self-end text-white' : 'self-start text-[#e6edf3]'}`}
                style={{ background: m.role === 'user' ? accent : '#161b22' }}>{m.content}</div>
            ))}
            {carregando && <div className="self-start px-3 py-2 rounded-2xl text-sm text-[#8b949e] bg-[#161b22]">Analisando...</div>}
            <div ref={fimRef} />
          </div>

          {/* input */}
          <div className="p-3 border-t border-[#21262d] flex gap-2" style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar(input) }}
              placeholder="Pergunte algo..." style={{ fontSize: 16 }}
              className="flex-1 bg-[#141a14] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none" />
            <button onClick={() => enviar(input)} disabled={!input.trim() || carregando} className="px-3 rounded-lg text-white disabled:opacity-40" style={{ background: accent }}><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  )
}
