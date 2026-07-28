# n8n-nodes-oxford-crm

Node comunitário do [n8n](https://n8n.io) para o **Oxford CRM**. Traz dois nós:

- **Oxford CRM** — ações sobre contatos, tags, listas, negócios, funis, tarefas, campos personalizados, automações, templates, campanhas, usuários e webhooks.
- **Oxford CRM Trigger** — inicia um workflow quando algo acontece no CRM (contato criado, tag adicionada, negócio ganho, e-mail aberto…). A assinatura de webhook é criada no CRM ao ativar o workflow e removida ao desativar.

## Instalação

### n8n self-hosted (recomendado)

**Settings → Community nodes → Install**, informe `n8n-nodes-oxford-crm` e confirme. Depois de publicado no npm é o caminho de um clique.

### A partir deste repositório

Enquanto o pacote não estiver no npm, dá para instalar a build local:

```bash
git clone https://github.com/RenanhvBorges/crm.git
cd crm/n8n-nodes-oxford-crm
npm install && npm run build
npm link

# na instalação do n8n
mkdir -p ~/.n8n/custom && cd ~/.n8n/custom
npm init -y            # só na primeira vez
npm link n8n-nodes-oxford-crm
```

Reinicie o n8n. Em Docker, monte `~/.n8n/custom` como volume e defina `N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom`.

### Desenvolvimento

```bash
npm run dev    # sobe um n8n com o pacote carregado e rebuild automático
npm run lint   # regras oficiais de community node
npm run build
```

Exige Node 22+.

## Credencial

Em **Credentials → Oxford CRM API**:

| Campo | Valor |
|---|---|
| **Base URL** | endereço do CRM, sem barra no fim e sem `/api/v1` — ex.: `https://crm-iota-one-32.vercel.app` |
| **API Key** | chave gerada no CRM em **Configurações → API** (começa com `oxk_`) |

O botão de teste chama `GET /api/v1/pipelines`; se ficar verde, a chave está válida.

## Nó Oxford CRM

Os campos de seleção (contato, lista, funil, estágio, tag, automação, usuário…) são carregados do CRM, e todos aceitam também um ID vindo de uma expressão.

| Recurso | Operações |
|---|---|
| **Contact** | Create, Create or Update, Get, Get Many, Update, Delete, Add Tags, Remove Tag |
| **Tag** | Create, Get, Get Many, Update, Delete |
| **List** | Create, Get, Get Many, Update, Delete, Add Contacts, Remove Contact, Get Members |
| **Deal** | Create, Get, Get Many, Update, Delete |
| **Pipeline** | Get Many (com os estágios aninhados) |
| **Task** | Create, Get, Get Many, Update, Delete |
| **Custom Field** | Create, Get, Get Many, Update, Delete |
| **Automation** | Get, Get Many, Update (ativar/pausar/renomear), Enroll Contact |
| **Template** / **Campaign** / **User** | Get Many |
| **Webhook** | Create, Get, Get Many, Update, Delete |

Notas de uso:

- **Create or Update** de contato casa pelo e-mail: atualiza o contato existente ou cria um novo. É o que evita duplicar lead que chega duas vezes.
- **Add Tags** / **Remove Tag** mexem só nas tags indicadas. O campo *Tags* dentro de *Update* substitui a lista inteira — use as operações dedicadas quando dois fluxos puderem tocar o mesmo contato ao mesmo tempo.
- **Enroll Contact** exige a automação **ativa**; se o contato já estiver nela (ou já tiver passado, sem reentrada liberada) a API responde 409.
- O fluxo de uma automação não é editável pela API — isso é trabalho do builder no CRM.
- Listagens têm **Return All** (pagina sozinho, 200 por página) ou **Limit**.

## Nó Oxford CRM Trigger

Escolha um ou mais eventos — ou **All Events**, que inclui os que forem criados no futuro:

`contact.created` · `contact.tag_added` · `contact.tag_removed` · `contact.score_changed` · `contact.list_joined` · `contact.list_left` · `deal.created` · `deal.stage_changed` · `deal.won` · `deal.lost` · `task.created` · `task.completed` · `email.opened` · `email.clicked`

Cada execução recebe o corpo da entrega:

```json
{
  "id": "<id da entrega>",
  "event_id": "<id do evento>",
  "type": "contact.tag_added",
  "created_at": "2026-07-28T12:00:00.000Z",
  "data": { "contact": { "id": "…", "name": "…", "email": "…", "tags": ["…"] }, "tag": "cliente-vip" }
}
```

**Verify Signature** (ligado por padrão) confere o header `X-Oxford-Signature`, que é `sha256=HMAC_SHA256(segredo, timestamp + "." + corpo)`, e recusa entregas com mais de 5 minutos. Entregas não autênticas recebem 401 e não iniciam o workflow.

### Pré-requisito de rede

O CRM entrega os eventos por POST, então **ele precisa alcançar a URL do n8n**. Numa instalação self-hosted atrás de NAT, isso significa domínio público (ou túnel). Em desenvolvimento, use a URL de teste do n8n com um túnel enquanto o workflow estiver aberto no editor.

A assinatura no CRM aparece em **Configurações → Webhooks** com o nome `n8n — <nome do workflow>`, e some quando o workflow é desativado. Trocar a lista de eventos atualiza a mesma assinatura, sem deixar órfã.

## Licença

MIT
