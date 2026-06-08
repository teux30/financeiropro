# 🔔 Guia — Notificações por E-mail (boletos/contas a vencer)

O app já tem o **sino de avisos in-app** funcionando. Para o **envio automático
por e-mail**, siga os passos abaixo (usa Resend + Supabase Edge Function + cron).

---

## 1. Criar conta no Resend
1. Acesse https://resend.com → **Sign up** (grátis: 3.000 e-mails/mês, 100/dia)
2. **API Keys → Create API Key** → copie a chave `re_...`
3. Para começar, você pode enviar usando o remetente de teste `onboarding@resend.dev`.
   Para usar seu domínio (não cair em spam): **Domains → Add Domain** e configure
   os registros **SPF/DKIM** no DNS (a Resend mostra quais).

## 2. Rodar o SQL das tabelas
No Supabase → **SQL Editor**, cole e rode [`supabase/notificacoes.sql`](./supabase/notificacoes.sql).
Cria `preferencias_notificacao` e `registro_notificacoes` com RLS.

## 3. Instalar o Supabase CLI (uma vez)
```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU-PROJECT-REF
```
> O PROJECT-REF está na URL do projeto: `https://SEU-PROJECT-REF.supabase.co`

## 4. Configurar os secrets (a chave NUNCA vai no frontend)
```bash
supabase secrets set RESEND_API_KEY=re_suachave
supabase secrets set NOTIF_FROM="Finance Pro <onboarding@resend.dev>"
supabase secrets set APP_URL=https://financeiropro-lemon.vercel.app
```
> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente nas Edge Functions.

## 5. Publicar a Edge Function
```bash
supabase functions deploy enviar-lembretes
```

## 6. Testar
- No app: **Configurações → 🔔 Avisos → Enviar e-mail de teste**
- Deve chegar um e-mail de exemplo na caixa de entrada.
- Se der erro "Edge Function não publicada", confira o passo 5.

## 7. Agendar o envio diário (cron) ✅ turnkey
No Supabase → **SQL Editor**, abra e rode [`supabase/cron-lembretes.sql`](./supabase/cron-lembretes.sql).

Ele faz tudo de forma segura:
1. Ativa as extensões **pg_cron** e **pg_net**.
2. Guarda a **Service Role Key** e a **URL do projeto** no **Vault** (criptografado — nunca no frontend).
3. Agenda a chamada diária da função **`clever-task`** às **08:00 de Brasília** (11:00 UTC).

Antes de rodar, troque só 2 valores no início do arquivo:
- `https://SEU-PROJECT-REF.supabase.co` → a URL do seu projeto Supabase
- `COLE_AQUI_SUA_SERVICE_ROLE_KEY` → em **Settings → API → service_role key**

> ⚠️ O nome real da função no seu projeto é **`clever-task`** (o Supabase renomeou).
> O SQL já usa esse nome. Se um dia recriar como `enviar-lembretes`, ajuste a URL.

**Testar sem esperar o horário:** descomente o bloco "Disparar AGORA" no fim do arquivo e rode.
**Conferir execuções:** `select * from cron.job_run_details order by start_time desc limit 10;`

---

## Como funciona
- Todo dia às 8h (Brasília) o cron chama a função.
- Ela lê as contas a pagar pendentes de cada usuário (do snapshot em `profiles.data`),
  filtra as que vencem dentro da antecedência configurada, **agrupa num único e-mail**
  e envia via Resend.
- Registra o envio em `registro_notificacoes` para **não duplicar** o mesmo aviso.

## Anti-spam
- Um e-mail por dia por usuário (agrupado), nunca um por conta.
- Não reenvia o mesmo nível de aviso para a mesma conta.
- Só envia se houver algo a vencer.
- Configure SPF/DKIM do seu domínio (passo 1) para entrega na caixa de entrada.
