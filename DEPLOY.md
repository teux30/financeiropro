# 🚀 Guia de Deploy com Domínio Próprio (Vercel)

Do código ao app no ar com seu domínio e HTTPS automático.

---

## 1. Subir o código para o GitHub

```bash
# na raiz do projeto
git init
git add .
git commit -m "Finance Pro: app completo com auth e nuvem"

# crie um repositório vazio em github.com/new (ex: finance-pro), depois:
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/finance-pro.git
git push -u origin main
```

> ⚠️ Confirme que `.env.local` está no `.gitignore` (já está). Nunca suba chaves.

## 2. Conectar à Vercel e fazer o primeiro deploy

1. Acesse https://vercel.com → **Add New → Project**
2. **Import** o repositório do GitHub
3. A Vercel detecta **Vite** automaticamente. Configurações:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   (já definidos em `vercel.json`)
4. **NÃO clique em Deploy ainda** — primeiro configure as variáveis (passo 3)

## 3. Variáveis de ambiente na Vercel

Em **Settings → Environment Variables**, adicione (para Production, Preview e Development):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua anon key pública |

Depois clique em **Deploy**. Em ~1 min seu app estará em `https://SEU-APP.vercel.app`.

> Sempre que mudar variáveis, faça um **Redeploy**.

## 4. Comprar e conectar domínio próprio

### 4.1 Comprar o domínio
- **`.com.br`** → https://registro.br (exige CPF/CNPJ brasileiro, ~R$40/ano)
- **`.com`** → https://www.namecheap.com ou https://godaddy.com

### 4.2 Adicionar o domínio na Vercel
1. **Project → Settings → Domains**
2. Digite seu domínio (ex: `seudominio.com.br`) → **Add**
3. A Vercel mostrará os registros DNS a configurar.

### 4.3 Configurar o DNS (no registrador onde comprou)

A Vercel indica um dos cenários abaixo — **siga exatamente o que ela mostrar**:

**Domínio raiz (`seudominio.com.br`):**
| Tipo | Nome | Valor |
|------|------|-------|
| `A` | `@` | `76.76.21.21` |

**Subdomínio www (`www.seudominio.com.br`):**
| Tipo | Nome | Valor |
|------|------|-------|
| `CNAME` | `www` | `cname.vercel-dns.com` |

> No Registro.br: painel **DNS → Editar Zona**. Em outros: seção "DNS / Nameservers".
> Alternativamente, aponte os **nameservers** para a Vercel (a Vercel fornece se você escolher essa opção).

### 4.4 Aguardar propagação + HTTPS
- A propagação do DNS leva de minutos a algumas horas.
- A Vercel emite o **certificado HTTPS (SSL) automaticamente** — sem custo, sem configuração.
- Quando o status na Vercel ficar **Valid Configuration ✅**, seu site responde em `https://seudominio.com.br`.

## 5. Atualizar o Supabase com o domínio próprio

**Authentication → URL Configuration:**
- **Site URL:** `https://seudominio.com.br`
- **Redirect URLs:** adicione o domínio próprio + a URL da Vercel + localhost:
  ```
  https://seudominio.com.br
  https://seudominio.com.br/
  https://SEU-APP.vercel.app/
  http://localhost:5173/
  ```

## 6. Atualizar o Google OAuth

No **Google Cloud Console → Credentials → seu OAuth client**, mantenha em
**Authorized redirect URIs**:
```
https://SEU-PROJETO.supabase.co/auth/v1/callback
```
(esse não muda — o redirect do Google sempre passa pelo Supabase). O domínio
próprio entra apenas nas Redirect URLs do Supabase (passo 5).

## 7. Acessar e instalar no celular

1. No celular, abra `https://seudominio.com.br`
2. Aparecerá o banner **"Instalar Finance Pro"** → toque em **Instalar**
   - **iPhone (Safari):** toque em **Compartilhar → Adicionar à Tela de Início**
   - **Android (Chrome):** banner automático ou menu **⋮ → Instalar app**
3. O app abre em tela cheia (standalone), com ícone próprio.
4. Faça login uma vez — a sessão permanece (refresh token). Seus dados sincronizam
   automaticamente entre celular e PC.

---

## 🔁 Deploys futuros
Cada `git push` na branch `main` dispara um novo deploy automático na Vercel.

```bash
git add .
git commit -m "ajustes"
git push
```

Pronto! App no ar, com domínio próprio e HTTPS. 🎉
