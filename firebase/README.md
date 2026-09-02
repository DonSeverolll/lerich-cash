# Firebase

`firestore.rules` nega todo acesso vindo do navegador — de propósito.

O aplicativo fala com o Firestore apenas pelo servidor, usando o Admin SDK com
uma credencial de service account. Esse caminho **ignora** as regras de
segurança, então elas existem só para fechar a porta do lado do cliente.

Publique com o Firebase CLI:

    firebase deploy --only firestore:rules

Ou cole o conteúdo em **Firestore Database → Regras**, no console.

## Coleções usadas

| Coleção | Conteúdo |
| --- | --- |
| `usuarios` | Contas, papéis, planos e o hash da senha |
| `auditoria` | Trilha de eventos (login, alterações, recuperações) |
| `configuracoes` | Documento único `app` com os parâmetros do sistema |
| `recuperacoes` | Pedidos de redefinição de senha (só o hash do token) |
| `contas` | Contas bancárias e carteiras de cada cliente |
| `categorias` | Categorias de receita e despesa |
| `assinaturas` | Gastos fixos recorrentes |
| `transacoes` | Lançamentos do extrato |

Nenhum índice composto é necessário: todas as consultas são de igualdade em um
único campo (`user_id`, `username_lower`, `token_hash`) ou ordenação simples por
`created_at`, cobertas pelos índices automáticos do Firestore.
