# 🔐 Guia de Configuração de Autenticação (Supabase)

Este guia configura login por e-mail/senha e Google, mais e-mails em PT-BR.

---

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com → **New project**
2. Defina nome, senha do banco (guarde bem) e região (escolha **South America (São Paulo)** para menor latência no Brasil)
3. Aguarde o provisionamento (~2 min)

## 2. Rodar o schema do banco

1. No Supabase: **SQL Editor → New query**
2. Cole TODO o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql)
3. Clique em **Run**
4. Confira em **Database → Tables** que todas as tabelas aparecem com o cadeado **RLS enabled**

## 3. Pegar as chaves de API

1. **Project Settings → API**
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. ⚠️ **NUNCA** copie a `service_role` key para o frontend.
4. No projeto, crie `.env.local` (baseado em `.env.example`):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
```

## 4. Ativar provider de E-mail

1. **Authentication → Providers → Email**
2. Ative **Enable Email provider**
3. **Confirm email**: recomendado **ativar** (usuário precisa confirmar antes de entrar)

## 5. Google OAuth (opcional, mas recomendado)

### 5.1 No Google Cloud Console
1. Acesse https://console.cloud.google.com
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
3. Tipo: **Web application**
4. Em **Authorized redirect URIs**, adicione:
   ```
   https://SEU-PROJETO.supabase.co/auth/v1/callback
   ```
5. Copie o **Client ID** e **Client Secret**

### 5.2 No Supabase
1. **Authentication → Providers → Google**
2. Ative e cole **Client ID** e **Client Secret**
3. Salve

## 6. URL Configuration (crítico para login funcionar)

**Authentication → URL Configuration:**

- **Site URL:**
  ```
  https://seudominio.com.br
  ```
  (em desenvolvimento, pode usar `http://localhost:5173`)

- **Redirect URLs** (adicione todas):
  ```
  http://localhost:5173
  http://localhost:5173/
  https://SEU-APP.vercel.app
  https://SEU-APP.vercel.app/
  https://seudominio.com.br
  https://seudominio.com.br/
  ```

> Sem essas URLs, o login com Google e o link de redefinição de senha falham com "redirect not allowed".

## 7. Templates de e-mail em PT-BR

**Authentication → Email Templates** — edite cada um:

### Confirmação de cadastro (Confirm signup)
```
Assunto: Confirme seu cadastro no Finance Pro

Olá! Bem-vindo ao Finance Pro.
Confirme seu e-mail clicando no link abaixo:

{{ .ConfirmationURL }}

Se você não criou esta conta, ignore este e-mail.
```

### Redefinição de senha (Reset password)
```
Assunto: Redefinir senha — Finance Pro

Você solicitou a redefinição da sua senha.
Clique no link abaixo para criar uma nova senha:

{{ .ConfirmationURL }}

Se não foi você, ignore este e-mail. Sua senha continua segura.
```

### Magic Link / Convite — adapte no mesmo padrão.

## 8. Segurança da conta Supabase

1. **Account → Security → habilite 2FA (autenticação de dois fatores)**
2. Use uma senha forte e única na conta Supabase

---

## ✅ Teste rápido

1. `npm run dev`
2. Crie uma conta na tela de cadastro
3. Confirme o e-mail (se ativado)
4. Faça login
5. O indicador **Sincronizado** (ícone de nuvem) deve aparecer no header
6. Abra o app em outro dispositivo logado na mesma conta → os dados aparecem

Pronto! Autenticação e nuvem ativas. 🎉
