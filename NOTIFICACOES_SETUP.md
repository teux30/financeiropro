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

## 7. Agendar o envio diário (cron)
No Supabase → **Database → Extensions**, ative **pg_cron** e **pg_net**.
Depois, no SQL Editor, rode (descomente no `notificacoes.sql` e ajuste):
```sql
select cron.schedule(
  'enviar-lembretes-diario',
  '0 11 * * *',  -- 11:00 UTC = 08:00 Brasília
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/enviar-lembretes',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer SUA_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('cron', true)
  );
  $$
);
```
> A `service_role key` fica só no banco (não no frontend). Em produção, prefira
> guardá-la no **Vault** do Supabase.

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
