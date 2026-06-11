// Consultor financeiro IA — responde sobre os números reais do usuário.
// Plugável: usa a mesma chave Anthropic das notas (VITE_ANTHROPIC_API_KEY).
// Se não houver chave, retorna ok:false com instrução (não quebra o app).

export interface MsgChat { role: 'user' | 'assistant'; content: string }
export interface RespostaIA { ok: boolean; error?: string; texto?: string }

const MODEL = (import.meta.env.VITE_ANTHROPIC_MODEL as string) || 'claude-haiku-4-5-20251001'

export function iaConfigurada(): boolean {
  return !!(import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)
}

export async function consultarIA(historico: MsgChat[], contexto: string): Promise<RespostaIA> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) return { ok: false, error: 'IA não configurada (VITE_ANTHROPIC_API_KEY).' }

  const system = `Você é um consultor financeiro de um pequeno negócio (restaurante/delivery), direto e prático, em português do Brasil.
Use SOMENTE os dados reais abaixo para responder. Seja conciso (máx ~6 linhas), com números e recomendações acionáveis.
Se não houver dado suficiente, diga o que falta cadastrar. Não invente valores.

DADOS ATUAIS DO NEGÓCIO:
${contexto}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL, max_tokens: 600, system,
        messages: historico.slice(-8).map(m => ({ role: m.role, content: m.content })),
      }),
    })
    if (!res.ok) return { ok: false, error: `Erro IA ${res.status}` }
    const json = await res.json()
    const texto: string = json?.content?.[0]?.text ?? ''
    return { ok: true, texto: texto.trim() || 'Sem resposta.' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro na IA.' }
  }
}
