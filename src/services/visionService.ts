import type { CategoriaFin } from '../store/bancoTypes'
import { CATEGORIAS, categoriasPorPerfil } from '../store/bancoTypes'

// ── Tipos da saída estruturada da IA ─────────────────────────────────────────
export type Confianca = 'alta' | 'media' | 'baixa'

export interface AnaliseTransacao {
  tipo: 'entrada' | 'saida'
  contexto: 'pessoal' | 'empresa'
  valor: number
  data: string            // ISO YYYY-MM-DD
  descricao: string
  estabelecimento: string
  categoria: CategoriaFin
  contaSugerida: 'PF' | 'PJ'
  impactaCMV: boolean
  proLabore: boolean      // transferência PJ↔PF
  confianca: { tipo: Confianca; contexto: Confianca; valor: Confianca; categoria: Confianca }
}

export interface Mapeamento {
  estabelecimento: string
  contexto: 'pessoal' | 'empresa'
  categoria: CategoriaFin
  contagem: number
}

export const isVisionConfigured = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY)

const MODEL = (import.meta.env.VITE_ANTHROPIC_MODEL as string) || 'claude-haiku-4-5-20251001'

// monta a descrição das categorias válidas pra IA não inventar
function listaCategorias(perfil: 'pessoal' | 'empresa'): string {
  const ent = categoriasPorPerfil(perfil, 'entrada').map(c => `"${c}" (${CATEGORIAS[c].label})`).join(', ')
  const sai = categoriasPorPerfil(perfil, 'saida').map(c => `"${c}" (${CATEGORIAS[c].label})`).join(', ')
  return `  ${perfil.toUpperCase()} — entradas: ${ent}\n  ${perfil.toUpperCase()} — saídas: ${sai}`
}

function buildPrompt(perfilAtivo: 'pessoal' | 'empresa', mapeamentos: Mapeamento[]): string {
  const hist = mapeamentos.length
    ? mapeamentos.slice(0, 40).map(m => `  - "${m.estabelecimento}" → ${m.contexto}/${m.categoria} (usado ${m.contagem}x)`).join('\n')
    : '  (sem histórico ainda)'

  return `Você é um assistente financeiro que lê comprovantes/notificações bancárias (PIX, cartão, boleto, nota) de um usuário brasileiro que tem finanças PESSOAIS e uma EMPRESA (um restaurante).

Analise a imagem e extraia os dados da transação. Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown.

REGRAS DE TIPO (entrada vs saída):
- ENTRADA (receita): "você recebeu", PIX recebido, crédito, depósito, venda, transferência recebida.
- SAÍDA (despesa): "você pagou", PIX enviado, débito, compra no cartão, boleto pago.

REGRAS DE CONTEXTO (pessoal vs empresa):
- Perfil ativo agora: ${perfilAtivo} (use como dica, mas decida pelo conteúdo).
- EMPRESA (restaurante): fornecedores de alimento, distribuidoras, atacados (Atacadão, Assaí, Makro), hortifruti, carnes, bebidas, gás, embalagens, iFood/apps (taxas ou repasses), maquininha, folha, aluguel comercial.
- PESSOAL: mercado do dia a dia, farmácia, streaming, lazer, vestuário, restaurante como cliente, contas de casa.

REGRAS DE CATEGORIA — use EXATAMENTE uma das chaves válidas abaixo (o valor entre aspas), nunca invente:
${listaCategorias('pessoal')}
${listaCategorias('empresa')}

CMV: se for insumo do restaurante (alimentos, bebidas, embalagens) a categoria deve ser "insumos" e impactaCMV=true.

PRÓ-LABORE: se for transferência entre conta PJ e PF (empresa→pessoa ou vice-versa), marque proLabore=true.

HISTÓRICO DE PREFERÊNCIAS DO USUÁRIO (priorize estes mapeamentos quando o estabelecimento bater):
${hist}

FORMATO DE SAÍDA (JSON):
{
  "tipo": "entrada" | "saida",
  "contexto": "pessoal" | "empresa",
  "valor": number,
  "data": "YYYY-MM-DD",
  "descricao": "string curta",
  "estabelecimento": "string",
  "categoria": "uma das chaves válidas do contexto escolhido",
  "contaSugerida": "PF" | "PJ",
  "impactaCMV": boolean,
  "proLabore": boolean,
  "confianca": { "tipo": "alta|media|baixa", "contexto": "alta|media|baixa", "valor": "alta|media|baixa", "categoria": "alta|media|baixa" }
}
Se não conseguir ler o valor, use 0 e confianca.valor "baixa". Use a data de hoje se não houver data no comprovante.`
}

/** Converte File/Blob em base64 puro (sem prefixo data:) e detecta media type */
async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [meta, data] = result.split(',')
      const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
      resolve({ data, mediaType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function normalizaCategoria(cat: string, perfil: 'pessoal' | 'empresa', tipo: 'entrada' | 'saida'): CategoriaFin {
  const validas = categoriasPorPerfil(perfil, tipo)
  if (validas.includes(cat as CategoriaFin)) return cat as CategoriaFin
  // fallback: primeira categoria "outros" do tipo
  return tipo === 'entrada' ? 'outros_entrada' : 'outros_saida'
}

/**
 * Analisa um comprovante via Claude Vision (chamada direta — modo teste).
 * Retorna dados estruturados + categoria validada contra a lista oficial.
 */
export async function analisarComprovante(
  file: File,
  perfilAtivo: 'pessoal' | 'empresa',
  mapeamentos: Mapeamento[],
): Promise<AnaliseTransacao> {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) throw new Error('IA não configurada. Defina VITE_ANTHROPIC_API_KEY em .env.local')

  const { data, mediaType } = await fileToBase64(file)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: buildPrompt(perfilAtivo, mapeamentos) },
        ],
      }],
    }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Erro da IA (${res.status}): ${txt.slice(0, 200)}`)
  }

  const json = await res.json()
  const texto: string = json?.content?.[0]?.text ?? ''
  const match = texto.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('A IA não retornou dados estruturados.')

  const parsed = JSON.parse(match[0]) as Partial<AnaliseTransacao>
  const contexto = (parsed.contexto === 'empresa' ? 'empresa' : 'pessoal')
  const tipo = (parsed.tipo === 'entrada' ? 'entrada' : 'saida')
  const categoria = normalizaCategoria(String(parsed.categoria ?? ''), contexto, tipo)

  return {
    tipo,
    contexto,
    valor: Number(parsed.valor) || 0,
    data: parsed.data || new Date().toISOString().slice(0, 10),
    descricao: parsed.descricao || parsed.estabelecimento || 'Transação',
    estabelecimento: parsed.estabelecimento || '',
    categoria,
    contaSugerida: parsed.contaSugerida === 'PJ' ? 'PJ' : (contexto === 'empresa' ? 'PJ' : 'PF'),
    impactaCMV: categoria === 'insumos' ? true : Boolean(parsed.impactaCMV),
    proLabore: Boolean(parsed.proLabore),
    confianca: {
      tipo: (parsed.confianca?.tipo ?? 'media') as Confianca,
      contexto: (parsed.confianca?.contexto ?? 'media') as Confianca,
      valor: (parsed.confianca?.valor ?? 'media') as Confianca,
      categoria: (parsed.confianca?.categoria ?? 'media') as Confianca,
    },
  }
}
