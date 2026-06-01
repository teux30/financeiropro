# 🛡️ Checklist de Segurança — Finance Pro

Revise antes de colocar em produção e periodicamente.

## Row Level Security (RLS)
- [ ] RLS **ativado em TODAS as tabelas** — confira em Supabase → Database → Tables (cadeado "RLS enabled")
  - profiles, empresas, contas_bancarias, transacoes, transferencias
  - receitas, despesas, orcamentos, simulacoes, projetos, metas
  - dre_periodos, contas_pagar, contas_receber, funcionarios, insumos
- [ ] Cada tabela tem policy `auth.uid() = user_id` (ou `= id` no caso de `profiles`)
- [ ] Testou: usuário A **não** consegue ler dados do usuário B
  - Teste rápido: logado como A, no SQL Editor rode `select * from transacoes;` — deve retornar só os dados de A quando feito via API com a anon key (o SQL Editor usa role admin e ignora RLS — teste pela aplicação)

## Chaves e segredos
- [ ] No frontend há **apenas** a `anon public` key (`VITE_SUPABASE_ANON_KEY`)
- [ ] A `service_role` key **NUNCA** aparece no frontend, no código ou no Git
- [ ] `.env.local` está no `.gitignore` (✅ já configurado)
- [ ] Variáveis de produção configuradas no painel da Vercel (não commitadas)

## Autenticação
- [ ] Senha forte exigida no cadastro (mín. 8 caracteres com letras e números) — ✅ validado no app
- [ ] Confirmação de e-mail ativada (Authentication → Providers → Email → Confirm email)
- [ ] Redirect URLs restritas às suas origens reais (sem `*` curinga aberto)

## Transporte e infraestrutura
- [ ] HTTPS ativo (automático na Vercel) — sem conteúdo servido por HTTP
- [ ] Headers de cache do `sw.js` impedem cache eterno do service worker (✅ em `vercel.json`)

## Contas e 2FA
- [ ] **2FA ativado** na conta do **Supabase**
- [ ] **2FA ativado** na conta do **GitHub**
- [ ] **2FA ativado** na conta da **Vercel**

## Dados sensíveis
- [ ] O app **não armazena** senhas bancárias, CVV de cartão, ou credenciais
      que dão acesso direto a dinheiro. Apenas saldos/lançamentos informados
      manualmente pelo usuário.
- [ ] Nenhum dado sensível em URL/query string

## Boas práticas contínuas
- [ ] Revisar policies ao criar novas tabelas
- [ ] Manter dependências atualizadas (`npm audit`)
- [ ] Backups: Supabase faz backup automático no plano pago; no free, exporte
      periodicamente via Database → Backups / `pg_dump`

---
Última revisão: preencher a data ao validar.
