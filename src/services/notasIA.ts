// IA opcional para o Bloco de Notas — detecta data de lembrete, tags e tarefas.
// Usa a API da Anthropic (texto). Acionada só por botão (custo controlado).

export interface SugestaoNota {
  ok: boolean
  error?: string
  tags?: string[]
  dataLembrete?: string   // ISO datetime
  checklist?: string[]
}

const MODEL = (import.meta.env.VITE_ANTHROPIC_MODEL as string) || 'claude-haiku-4-5-20251001'

export async function sugerirDaNota(texto: string): Promise<SugestaoNota> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) return { ok: false, error: 'IA não configurada (VITE_ANTHROPIC_API_KEY).' }
  if (!texto.trim()) return { ok: false, error: 'Escreva algo primeiro.' }

  const hoje = new Date().toISOString().slice(0, 10)
  const prompt = `Hoje é ${hoje}. Analise esta anotação de um usuário brasileiro e extraia metadados.
Anotação: """${texto.slice(0, 1000)}"""

Responda APENAS um JSON válido, sem markdown:
{
  "tags": ["palavras-chave curtas, minúsculas, sem #, máx 4"],
  "dataLembrete": "YYYY-MM-DDTHH:mm se houver uma data/prazo no texto (ex: 'dia 10', 'amanhã', 'sexta'), senão null",
  "checklist": ["se o texto for uma lista de tarefas, separe em itens; senão []"]
}
Interprete datas relativas com base na data de hoje. Se mencionar só o dia (ex: 'dia 10'), use o próximo dia 10. Hora padrão 09:00 se não especificada.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return { ok: false, error: `Erro IA ${res.status}` }
    const json = await res.json()
    const t: string = json?.content?.[0]?.text ?? ''
    const m = t.match(/\{[\s\S]*\}/)
    if (!m) return { ok: false, error: 'IA não retornou dados.' }
    const p = JSON.parse(m[0])
    return {
      ok: true,
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 4).map((x: unknown) => String(x).toLowerCase().replace('#', '')) : [],
      dataLembrete: p.dataLembrete && typeof p.dataLembrete === 'string' ? p.dataLembrete : undefined,
      checklist: Array.isArray(p.checklist) ? p.checklist.map((x: unknown) => String(x)) : [],
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro na IA.' }
  }
}
