# Documentação de Problemas Identificados

Este documento lista todos os problemas encontrados durante a avaliação técnica do código.

**Total de problemas identificados**: 22 problemas reais + 3 melhorias
**Metodologia**: Análise baseada em OWASP Top 10 (2021) e boas práticas de desenvolvimento

---

## Problema #1: SQL Injection Crítica

**Localização**: `src/repositories/product.repository.ts:50`

**Categoria**: Segurança (CRÍTICO)

**Descrição**:
O método `searchByName` utiliza interpolação direta de string na query SQL, construindo a query com concatenação de strings em vez de usar prepared statements ou query builder parametrizado.

```typescript
async searchByName(searchTerm: string) {
  const query = `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`;
  return await db.execute(sql.raw(query));
}
```

**Por que é um problema**:
Esta é uma vulnerabilidade clássica de SQL Injection (OWASP A03:2021). Um atacante pode injetar código SQL malicioso através do parâmetro `searchTerm`, permitindo executar comandos arbitrários no banco de dados.

**Impacto**:
- Acesso não autorizado a dados sensíveis
- Modificação ou exclusão de dados
- Possível comprometimento completo do banco de dados
- Exemplo de exploit: `searchTerm = "'; DROP TABLE products; --"`

**Solução aplicada**:
Substituir por query parametrizada usando o query builder do Drizzle ORM com o operador `like`:
```typescript
async searchByName(searchTerm: string) {
  return await db
    .select()
    .from(products)
    .where(like(products.name, `%${searchTerm}%`));
}
```

---

## Problema #2: Exposição de Informações Sensíveis em Erros

**Localização**: `src/middleware/error.middleware.ts:12`

**Categoria**: Segurança

**Descrição**:
O middleware de erro retorna `err.message` diretamente ao cliente em produção, podendo expor detalhes internos do sistema, estrutura do banco de dados e informações sensíveis.

```typescript
res.status(500).json({
  error: err.message,
  stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
});
```

**Por que é um problema**:
Viola princípios de OWASP A04:2021 (Insecure Design) e A01:2021 (Broken Access Control). Mensagens de erro do PostgreSQL podem revelar nomes de tabelas, campos, constraints e estrutura do banco.

**Impacto**:
- Exposição da estrutura do banco de dados
- Informações utilizáveis para ataques direcionados
- Exemplo: `"duplicate key value violates unique constraint 'users_email_key'"` revela tabela e campo

**Solução aplicada**:
Criar mensagens genéricas para produção e registrar detalhes apenas em logs:
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
res.status(500).json({
  error: isDevelopment ? err.message : 'Internal server error',
  ...(isDevelopment && { stack: err.stack }),
});
```

---

## Problema #3: Senhas Retornadas em Queries de Usuários

**Localização**: `src/repositories/user.repository.ts:7`

**Categoria**: Segurança (CRÍTICO)

**Descrição**:
O método `findAll()` e outros métodos de consulta retornam TODOS os campos da tabela users, incluindo o campo `password` com hash bcrypt.

```typescript
async findAll() {
  return await db.select().from(users);
}
```

**Por que é um problema**:
Viola OWASP A02:2021 (Cryptographic Failures). Mesmo sendo hashes, expor senhas hashadas permite ataques offline de dicionário e rainbow tables, além de violar LGPD/GDPR.

**Impacto**:
- Exposição de hashes bcrypt via endpoint `GET /api/users`
- Possibilidade de ataques de brute force offline
- Violação de regulamentações de proteção de dados
- Não há necessidade legítima de retornar senhas

**Solução aplicada**:
Especificar explicitamente os campos a retornar, excluindo password:
```typescript
async findAll() {
  return await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users);
}
```
Aplicar o mesmo em `findById`, `update` e outros métodos relevantes.

---

## Problema #4: Falta de Validação de Email Duplicado

**Localização**: `src/services/user.service.ts:29`

**Categoria**: Lógica de Negócio / Validação

**Descrição**:
O método `createUser` não verifica se já existe um usuário com o email fornecido antes de tentar criar o registro, apesar de existir um método `findByEmail` no repositório.

```typescript
async createUser(data: {...}) {
  // PROBLEMA INTENCIONAL: Falta validação de email duplicado antes de criar
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return await this.userRepository.create({...});
}
```

**Por que é um problema**:
A validação de unicidade acontece apenas no banco de dados através da constraint, gerando um erro 500 genérico em vez de uma resposta apropriada (409 Conflict).

**Impacto**:
- Má experiência do usuário com erro 500 genérico
- Falta de feedback claro sobre o problema
- Código de status HTTP incorreto (deveria ser 409 Conflict)
- Exposição de detalhes do banco na mensagem de erro

**Solução aplicada**:
Adicionar verificação antes da criação:
```typescript
async createUser(data: {...}) {
  const existingUser = await this.userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new Error('Email already in use');
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return await this.userRepository.create({...});
}
```
E no controller, tratar o erro específico para retornar 409.

---

## Problema #5: Preço Negativo Permitido

**Localização**: `src/validators/product.validator.ts:6`

**Categoria**: Validação de Dados

**Descrição**:
O schema de validação aceita qualquer número para o campo `price`, sem restrição de valores mínimos.

```typescript
price: z.number(),
```

**Por que é um problema**:
Permite criar produtos com preços negativos ou zero, violando regras básicas de negócio. Não há validação adicional na camada de serviço.

**Impacto**:
- Produtos com preço -100 podem ser criados
- Inconsistências em relatórios financeiros
- Possibilidade de exploração por usuários mal-intencionados
- Problemas em sistemas de pagamento integrados

**Solução aplicada**:
Adicionar validação de valor mínimo:
```typescript
price: z.number().positive('Price must be positive'),
```

---

## Problema #6: Estoque Negativo Permitido

**Localização**: `src/validators/product.validator.ts:7`

**Categoria**: Validação de Dados

**Descrição**:
O campo `stock` aceita qualquer número, permitindo valores negativos que não fazem sentido logicamente.

```typescript
stock: z.number(),
```

**Por que é um problema**:
Estoque negativo é logicamente impossível no mundo físico e indica erro de programação ou dados corrompidos.

**Impacto**:
- Estoque negativo (-500 unidades)
- Problemas em sistemas de controle de inventário
- Inconsistência de dados
- Dificuldade em gerar relatórios confiáveis

**Solução aplicada**:
Adicionar validação de não-negatividade:
```typescript
stock: z.number().nonnegative('Stock cannot be negative'),
```

---

## Problema #7: Falta de Tamanho Máximo em Strings

**Localização**: `src/validators/user.validator.ts:4`, `src/validators/group.validator.ts:4`, `src/validators/product.validator.ts:4`

**Categoria**: Validação de Dados / Segurança

**Descrição**:
Os schemas de validação definem apenas tamanho mínimo para strings (`.min(1)`), mas não limitam o tamanho máximo, apesar do banco ter limitação de `varchar(255)`.

```typescript
name: z.string().min(1),
description: z.string().optional(),
```

**Por que é um problema**:
Permite envio de payloads extremamente grandes que podem causar problemas de memória, DoS, ou erro ao inserir no banco quando exceder varchar(255).

**Impacto**:
- Possibilidade de DoS com strings de megabytes
- Consumo excessivo de memória
- Erro ao inserir no banco dados que excedem varchar(255)
- Falta de alinhamento entre validação e schema do banco

**Solução aplicada**:
Adicionar validação de tamanho máximo alinhada ao schema do banco:
```typescript
name: z.string().min(1).max(255),
description: z.string().max(1000).optional(),
email: z.string().email().max(255),
```

---

## Problema #8: Validação de Email em Atualização

**Localização**: `src/services/user.service.ts:38-55`

**Categoria**: Validação de Dados / Lógica de Negócio

**Descrição**:
O método `updateUser` permite atualizar o email sem verificar se outro usuário já está usando esse email.

```typescript
async updateUser(id: number, data: Partial<{...}>) {
  const user = await this.userRepository.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  // Sem verificação de email duplicado
  return await this.userRepository.update(id, data);
}
```

**Por que é um problema**:
Pode causar violação da constraint única de email, resultando em erro 500 não tratado em vez de validação apropriada.

**Impacto**:
- Erro 500 ao tentar atualizar para email já existente
- Falta de feedback claro
- Má experiência do usuário

**Solução aplicada**:
Adicionar verificação quando email está sendo atualizado:
```typescript
if (data.email && data.email !== user.email) {
  const existingUser = await this.userRepository.findByEmail(data.email);
  if (existingUser) {
    throw new Error('Email already in use');
  }
}
```

---

## Problema #9: Parâmetro searchTerm Não Validado

**Localização**: `src/controllers/product.controller.ts:62`

**Categoria**: Validação de Dados

**Descrição**:
O endpoint de busca não valida se o parâmetro `searchTerm` foi fornecido antes de usar.

```typescript
const { searchTerm } = req.query;
const products = await this.productService.searchProducts(searchTerm as string);
```

**Por que é um problema**:
Se `searchTerm` não for fornecido na query, `undefined` é convertido para string "undefined" e usado na busca SQL.

**Impacto**:
- Busca por literal "undefined" quando parâmetro ausente
- Comportamento inesperado
- Possível erro 500

**Solução aplicada**:
Validar presença do parâmetro:
```typescript
const { searchTerm } = req.query;
if (!searchTerm || typeof searchTerm !== 'string') {
  return res.status(400).json({ error: 'searchTerm query parameter is required' });
}
const products = await this.productService.searchProducts(searchTerm);
```

---

## Problema #10: Senha Fraca Permitida

**Localização**: `src/validators/user.validator.ts:6`

**Categoria**: Segurança (OWASP A07:2021)

**Descrição**:
A validação de senha requer apenas 6 caracteres mínimos, sem verificar complexidade.

```typescript
password: z.string().min(6),
```

**Por que é um problema**:
Viola OWASP A07:2021 (Identification and Authentication Failures). Senhas como "123456", "aaaaaa" são aceitas, facilitando ataques de brute force.

**Impacto**:
- Senhas fracas facilmente quebradas
- Contas comprometidas por ataques de dicionário
- Violação de boas práticas de segurança

**Solução aplicada**:
Aumentar requisito mínimo e adicionar validação de complexidade:
```typescript
password: z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[0-9]/, 'Password must contain number'),
```

---

## Problema #11: Grupo Não Validado ao Criar Produto

**Localização**: `src/services/product.service.ts:32`

**Categoria**: Lógica de Negócio / Integridade

**Descrição**:
Ao criar produto com `groupId`, não é verificado se o grupo existe antes de tentar inserir.

```typescript
async createProduct(data: {...}) {
  // PROBLEMA INTENCIONAL: Não valida se grupo existe quando groupId é fornecido
  return await this.productRepository.create(data);
}
```

**Por que é um problema**:
Causa erro de foreign key constraint no banco de dados, resultando em erro 500 genérico em vez de validação clara.

**Impacto**:
- Erro 500 ao tentar criar produto com groupId inexistente
- Mensagem de erro confusa para usuário
- Deveria retornar 400 ou 404 com mensagem clara

**Solução aplicada**:
Verificar existência do grupo quando fornecido:
```typescript
if (data.groupId) {
  const group = await this.groupRepository.findById(data.groupId);
  if (!group) {
    throw new Error('Group not found');
  }
}
```

---

## Problema #12: Usuário/Grupo Não Validados ao Adicionar Relação

**Localização**: `src/services/user.service.ts:68`

**Categoria**: Lógica de Negócio / Integridade

**Descrição**:
O método `addUserToGroup` não valida se o usuário e o grupo existem antes de tentar criar a relação.

```typescript
async addUserToGroup(userId: number, groupId: number) {
  // PROBLEMA INTENCIONAL: Não valida se usuário ou grupo existem
  return await this.userRepository.addUserToGroup(userId, groupId);
}
```

**Por que é um problema**:
Permite tentar criar relação com IDs inexistentes, causando erro de foreign key no banco.

**Impacto**:
- Erro 500 em vez de 404 Not Found
- Falta de feedback adequado
- Violação de semântica HTTP

**Solução aplicada**:
Validar existência antes de criar relação:
```typescript
const user = await this.userRepository.findById(userId);
if (!user) {
  throw new Error('User not found');
}
const group = await this.groupRepository.findById(groupId);
if (!group) {
  throw new Error('Group not found');
}
return await this.userRepository.addUserToGroup(userId, groupId);
```

---

## Problema #13: Delete Sem Verificação de Existência

**Localização**: `src/services/user.service.ts:59`

**Categoria**: Lógica de Negócio / Semântica HTTP

**Descrição**:
O método `deleteUser` não verifica se o usuário existe antes de deletar, sempre retornando 204 mesmo se usuário não existir.

```typescript
async deleteUser(id: number) {
  // PROBLEMA INTENCIONAL: Não verifica se usuário existe antes de deletar
  await this.userRepository.delete(id);
}
```

**Por que é um problema**:
Viola semântica HTTP - deveria retornar 404 se recurso não existe. Cliente recebe 204 (sucesso) mesmo quando nada foi deletado.

**Impacto**:
- Feedback incorreto ao cliente
- Cliente pensa que deletou quando recurso não existia
- Violação de padrões REST

**Solução aplicada**:
Verificar existência antes de deletar:
```typescript
async deleteUser(id: number) {
  const user = await this.userRepository.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  await this.userRepository.delete(id);
}
```

---

## Problema #14: Grupos com Nome Duplicado Permitidos

**Localização**: `src/services/group.service.ts:26`

**Categoria**: Lógica de Negócio

**Descrição**:
Não há validação para impedir criação de grupos com nomes duplicados (banco não tem constraint única em `groups.name`).

```typescript
async createGroup(data: { name: string; description?: string }) {
  // PROBLEMA INTENCIONAL: Não valida se grupo com mesmo nome já existe
  return await this.groupRepository.create(data);
}
```

**Por que é um problema**:
Permite múltiplos grupos com mesmo nome, causando confusão e problemas de UX.

**Impacto**:
- Dois grupos "Marketing" podem existir
- Confusão ao listar grupos
- Dificuldade de identificação pelo usuário
- Problemas em integrações

**Solução aplicada**:
Adicionar verificação de nome duplicado:
```typescript
async createGroup(data: { name: string; description?: string }) {
  const existing = await this.groupRepository.findByName(data.name);
  if (existing) {
    throw new Error('Group name already exists');
  }
  return await this.groupRepository.create(data);
}
```
E implementar `findByName` no repository.

---

## Problema #15: Delete Grupo com Produtos Associados

**Localização**: `src/services/group.service.ts:40`

**Categoria**: Integridade de Dados (CRÍTICO)

**Descrição**:
O método `deleteGroup` tenta deletar grupo sem verificar se existem produtos associados, causando erro de foreign key.

```typescript
async deleteGroup(id: number) {
  // PROBLEMA INTENCIONAL: Deleta grupo sem verificar se há produtos associados
  await this.groupRepository.delete(id);
}
```

**Por que é um problema**:
Schema não define `onDelete: 'cascade'` ou `onDelete: 'set null'`, então tentar deletar grupo com produtos gera erro de constraint.

**Impacto**:
- Erro 500 ao tentar deletar grupo com produtos
- Impossível deletar grupos em uso
- Falta de estratégia de cascade/restrict/set null

**Solução aplicada**:
Verificar produtos antes de deletar:
```typescript
async deleteGroup(id: number) {
  const products = await this.productRepository.findByGroup(id);
  if (products.length > 0) {
    throw new Error('Cannot delete group with associated products');
  }
  await this.groupRepository.delete(id);
}
```
Ou definir cascade no schema se apropriado.

---

## Problema #16: N+1 Query Problem

**Localização**: `src/repositories/group.repository.ts:44-51`

**Categoria**: Performance (CRÍTICO)

**Descrição**:
O método `getGroupUsers` executa uma query inicial e depois N queries dentro de um loop, uma para cada usuário.

```typescript
const userIds = userGroupRecords.map(ug => ug.userId);

// PROBLEMA INTENCIONAL: N+1 Query Problem
const groupUsers = [];
for (const userId of userIds) {
  const user = await db.select().from(users).where(eq(users.id, userId));
  groupUsers.push(user[0]);
}
```

**Por que é um problema**:
Este é um anti-pattern clássico de performance. Para grupo com 100 usuários, executa 101 queries (1 inicial + 100 no loop).

**Impacto**:
- Performance degradada severamente
- Latência aumenta linearmente com número de usuários
- Sobrecarga no banco de dados
- Timeout em grupos grandes

**Solução aplicada**:
Usar JOIN em uma única query:
```typescript
async getGroupUsers(groupId: number) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .innerJoin(userGroups, eq(users.id, userGroups.userId))
    .where(eq(userGroups.groupId, groupId));
}
```

---

## Problema #17: Falta de Paginação

**Localização**: `src/repositories/user.repository.ts:7`, `src/repositories/group.repository.ts:7`, `src/repositories/product.repository.ts:7`

**Categoria**: Performance / Escalabilidade (CRÍTICO)

**Descrição**:
Todos os métodos `findAll()` retornam TODOS os registros da tabela sem limite ou paginação.

```typescript
async findAll() {
  return await db.select().from(users);
}
```

**Por que é um problema**:
Com muitos registros (milhares ou milhões), a API tentará carregar tudo em memória, causando timeout, OOM ou consumo excessivo de banda.

**Impacto**:
- Out of Memory com tabelas grandes
- Timeout de requisições
- Consumo desnecessário de banda
- Performance inaceitável em produção

**Solução aplicada**:
Implementar paginação com limit e offset:
```typescript
async findAll(page: number = 1, limit: number = 50) {
  const offset = (page - 1) * limit;
  return await db
    .select()
    .from(users)
    .limit(limit)
    .offset(offset);
}
```
E ajustar controllers para aceitar query params `?page=1&limit=20`.

---

## Problema #18: Códigos HTTP Genéricos

**Localização**: Todos os controllers (exemplo: `src/controllers/user.controller.ts:35`)

**Categoria**: Tratamento de Erros / API Design

**Descrição**:
Todos os controllers retornam status 500 para qualquer erro no bloco catch, sem diferenciar tipos de erro.

```typescript
catch (error: any) {
  res.status(500).json({ error: error.message });
}
```

**Por que é um problema**:
Viola semântica HTTP. Email duplicado deveria ser 409 Conflict, recurso não encontrado 404, validação 400, mas todos retornam 500 Internal Server Error.

**Impacto**:
- Clientes não conseguem diferenciar tipos de erro
- Impossível tratar erros apropriadamente no frontend
- Logs confusos (tudo parece erro de servidor)
- Violação de padrões REST/HTTP

**Solução aplicada**:
Criar classes de erro customizadas e middleware que mapeia para status corretos:
```typescript
// errors.ts
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ValidationError extends Error {}

// middleware
if (err instanceof NotFoundError) return res.status(404).json({...});
if (err instanceof ConflictError) return res.status(409).json({...});
if (err instanceof ValidationError) return res.status(400).json({...});
```

---

## Problema #19: Mensagens de Validação Genéricas

**Localização**: `src/middleware/validation.middleware.ts:11`

**Categoria**: Tratamento de Erros / UX

**Descrição**:
O middleware de validação retorna mensagem genérica "Validation error" mesmo quando Zod fornece detalhes específicos dos erros.

```typescript
catch (error: any) {
  res.status(400).json({ error: 'Validation error' });
}
```

**Por que é um problema**:
Zod retorna objeto detalhado com campo específico e mensagem, mas isso é descartado. Cliente não sabe qual campo está errado.

**Impacto**:
- UX ruim - usuário não sabe o que corrigir
- Frontend não pode marcar campo específico com erro
- Necessidade de tentativa e erro

**Solução aplicada**:
Retornar detalhes de validação do Zod:
```typescript
catch (error: any) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
  res.status(400).json({ error: 'Validation error' });
}
```

---

## Problema #20: Falta de Rate Limiting

**Localização**: `src/index.ts` (ausência de middleware)

**Categoria**: Segurança (OWASP A04:2021)

**Descrição**:
Não há implementação de rate limiting ou throttling em nenhum endpoint da API.

**Por que é um problema**:
Violação de OWASP A04:2021 (Insecure Design). Permite ataques de brute force, exploração massiva de vulnerabilidades, e DoS.

**Impacto**:
- Vulnerável a brute force em senhas
- SQL injection pode ser explorada massivamente
- Denial of Service (DoS)
- Custos elevados de infraestrutura

**Solução aplicada**:
Implementar rate limiting com express-rate-limit:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requests por IP
  message: 'Too many requests, please try again later',
});

app.use('/api/', limiter);
```

---

## Problema #21: Falta de CORS e Security Headers

**Localização**: `src/index.ts`

**Categoria**: Segurança (OWASP A05:2021)

**Descrição**:
Não há configuração de CORS nem headers de segurança (helmet middleware).

**Por que é um problema**:
Viola OWASP A05:2021 (Security Misconfiguration). Deixa API vulnerável a CSRF, clickjacking e outros ataques.

**Impacto**:
- Aceita requisições de qualquer origem (CORS aberto)
- Vulnerável a CSRF
- Falta de proteções básicas (XSS, clickjacking)

**Solução aplicada**:
Configurar CORS e helmet:
```typescript
import cors from 'cors';
import helmet from 'helmet';

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
```

---

## Problema #22: Falta de Índices em Foreign Keys

**Localização**: `src/database/schema.ts:27-28, :38`

**Categoria**: Performance

**Descrição**:
Foreign keys em `userGroups` e `products.groupId` não têm índices explícitos definidos.

```typescript
userId: integer('user_id').references(() => users.id),
groupId: integer('group_id').references(() => groups.id),
```

**Por que é um problema**:
Queries que filtram por FKs podem fazer full table scan sem índices, degradando performance em tabelas grandes.

**Impacto**:
- Queries lentas em tabelas grandes
- Full table scans
- Performance degradada

**Solução aplicada**:
Adicionar índices explícitos:
```typescript
export const userGroups = pgTable('user_groups', {
  // ... campos
}, (table) => ({
  userIdIdx: index('user_groups_user_id_idx').on(table.userId),
  groupIdIdx: index('user_groups_group_id_idx').on(table.groupId),
}));
```

---

## 📊 Resumo de Problemas por Categoria

### Segurança (5 problemas)
- #1: SQL Injection (CRÍTICO)
- #2: Exposição de informações sensíveis
- #3: Senhas retornadas em queries (CRÍTICO)
- #10: Senha fraca
- #20: Falta de rate limiting

### Performance (3 problemas)
- #16: N+1 Query Problem (CRÍTICO)
- #17: Falta de paginação (CRÍTICO)
- #22: Falta de índices

### Lógica de Negócio (7 problemas)
- #4: Email duplicado não validado
- #11: Grupo não validado em produto
- #12: User/Group não validados
- #13: Delete sem verificação
- #14: Grupos duplicados
- #15: Delete grupo com produtos (CRÍTICO)
- #21: CORS e security headers

### Validação de Dados (6 problemas)
- #5: Preço negativo
- #6: Estoque negativo
- #7: Tamanho máximo em strings
- #8: Email em atualização
- #9: searchTerm não validado
- #18: Códigos HTTP genéricos

### Tratamento de Erros (2 problemas)
- #18: Códigos HTTP genéricos
- #19: Mensagens genéricas

---

## ✅ Checklist de Correções

- [x] Corrigir SQL Injection (#1) - PRIORIDADE MÁXIMA ✅ IMPLEMENTADO
- [x] Remover senhas de queries (#3) - PRIORIDADE MÁXIMA ✅ IMPLEMENTADO
- [x] Corrigir N+1 queries (#16) - PRIORIDADE MÁXIMA ✅ IMPLEMENTADO
- [x] Implementar paginação (#17) - PRIORIDADE MÁXIMA ✅ IMPLEMENTADO
- [x] Verificar FK antes de delete grupo (#15) - PRIORIDADE MÁXIMA ✅ IMPLEMENTADO
- [x] Sanitizar mensagens de erro (#2) - PRIORIDADE ALTA ✅ IMPLEMENTADO
- [x] Adicionar validações de negócio (#4, #11, #12, #13, #14) - PRIORIDADE ALTA ✅ IMPLEMENTADO
- [x] Validar valores positivos (#5, #6) - PRIORIDADE ALTA ✅ IMPLEMENTADO
- [x] Implementar rate limiting (#20) - PRIORIDADE MÉDIA ✅ IMPLEMENTADO
- [x] Melhorar validações (#7, #8, #9, #10) - PRIORIDADE MÉDIA ✅ IMPLEMENTADO
- [x] Melhorar códigos HTTP (#18) - PRIORIDADE MÉDIA ✅ IMPLEMENTADO
- [x] Melhorar mensagens de erro (#19) - PRIORIDADE MÉDIA ✅ IMPLEMENTADO
- [x] Configurar CORS/Helmet (#21) - PRIORIDADE MÉDIA ✅ IMPLEMENTADO
- [x] Adicionar índices (#22) - PRIORIDADE BAIXA ✅ IMPLEMENTADO

---

### Pacotes Adicionais Instalados:
- `express-rate-limit` - Rate limiting middleware
- `cors` - CORS configuration
- `helmet` - Security headers
- `@types/cors` - TypeScript types for CORS

### Arquivos Criados:
- `src/errors/custom-errors.ts` - Classes de erro customizadas (NotFoundError, ConflictError, ValidationError, BadRequestError)

### Principais Alterações:
- **Segurança**: SQL Injection corrigida, senhas removidas de queries, rate limiting implementado, CORS e Helmet configurados
- **Performance**: N+1 queries resolvidas, paginação implementada, índices adicionados em FKs
- **Validação**: Validações completas de dados, códigos HTTP apropriados, mensagens de erro detalhadas
- **Integridade**: Verificações de FK, validações de negócio, tratamento de erros adequado
