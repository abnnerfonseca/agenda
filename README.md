# Portal Institucional para Igrejas

Portal institucional desenvolvido para igrejas, com foco na comunicação com membros e visitantes, centralização de informações e facilidade de gerenciamento de conteúdo.

O projeto foi desenvolvido utilizando apenas tecnologias web nativas (HTML, CSS e JavaScript), sendo hospedado no GitHub Pages e utilizando o Google Sheets como um CMS (Content Management System) simplificado. Dessa forma, praticamente todo o conteúdo do site pode ser atualizado sem qualquer alteração no código-fonte.

---

## Objetivo

Disponibilizar uma plataforma moderna, responsiva e de fácil manutenção para apresentação da igreja, reunindo em um único ambiente informações como:

- Agenda de cultos e eventos
- Avisos e comunicados
- Congregações
- Sermões
- História da igreja
- Campanhas e projetos
- Contribuições
- Revistas digitais
- Redes sociais
- Transmissões ao vivo

O principal objetivo é permitir que pessoas sem conhecimento técnico consigam manter o site apenas atualizando uma planilha do Google Sheets.

---

## Funcionalidades

### 📅 Agenda Inteligente

- Exibição automática dos eventos futuros
- Exibição de eventos encerrados há até 7 dias
- Organização dos eventos por período (Hoje, Amanhã, Esta Semana, Próximos Eventos e Eventos Recentes)
- Compartilhamento do evento
- Adição do evento ao Google Agenda
- Exibição de local, horário e descrição

---

### 🔴 Transmissão ao Vivo

- Banner automático para transmissões via YouTube
- Exibição somente quando existir um link configurado na planilha
- Atualização automática sem necessidade de publicar novamente o site

---

### 📢 Avisos

- Comunicados importantes
- Destaques institucionais
- Avisos gerais

---

### 📍 Congregações

- Lista completa das igrejas
- Busca por nome
- Informações detalhadas
- Integração com Google Maps
- Contatos
- Horários de culto

---

### 🎥 Sermões

- Biblioteca de mensagens
- Busca por título
- Busca por pregador
- Busca por tema
- Vídeos incorporados do YouTube

---

### 📖 História

- Timeline institucional
- Marcos importantes da igreja

---

### 🏗️ Nossa Casa

Página dedicada ao acompanhamento da campanha ou construção.

Possui:

- Barra de progresso
- Informações da campanha
- Histórico de atualizações
- Galeria de imagens

---

### 💳 Contribuições

- PIX para contribuições gerais
- PIX para campanhas específicas
- QR Code
- Chave PIX

---

### 📚 Revistas Digitais

- Biblioteca de revistas
- Leitura em PDF utilizando PDF.js

---

### 🌐 Redes Sociais

Acesso rápido para:

- YouTube
- Instagram
- Facebook

---

### 📊 Analytics

Integração com Google Analytics 4 para acompanhamento de:

- visitantes
- sessões
- origem dos acessos
- dispositivos utilizados
- cidades e países
- páginas mais acessadas
- eventos personalizados
- interações dos usuários

---

### 📱 Responsividade

Interface adaptada para:

- Desktop
- Tablets
- Smartphones

---

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- GitHub Pages
- Google Sheets
- Fetch API
- TSV Parser
- Google Drive
- Google Maps
- YouTube
- Google Analytics 4 (gtag)
- Google Calendar
- Web Share API
- PDF.js

---

## Arquitetura

O projeto utiliza uma arquitetura totalmente estática.

```
GitHub Pages
        │
        ▼
HTML + CSS + JavaScript
        │
        ▼
Google Sheets (TSV Público)
        │
        ▼
Renderização dinâmica no navegador
```

Todo o conteúdo é carregado em tempo real através de planilhas públicas do Google Sheets.

Dessa forma, não existe banco de dados, backend e painel administrativo. O Google Sheets funciona como um CMS simplificado.

---

## Estrutura do projeto

```
/
├── index.html
├── README.md
```

---

## Organização da planilha

Cada funcionalidade possui sua própria aba no Google Sheets.

- eventos
- avisos
- igrejas
- sermoes
- sobre
- casa
- casaAtualizacoes
- revista

Essa organização facilita a manutenção e permite que cada área seja atualizada de forma independente.

---

## Configuração

No arquivo principal configure as informações da igreja:

```javascript
const LOGO_URL = "";
const PIX_REGULAR = "";
const PIX_OBRA = "";

const SHEET_URLS = {
    eventos: "",
    avisos: "",
    igrejas: "",
    sermoes: "",
    sobre: "",
    casa: "",
    casaAtualizacoes: "",
    revista: ""
};
```

Também podem ser configurados:

- links das redes sociais
- Google Analytics (GA4)
- YouTube Live
- Google Maps
- Google Drive

---

## Como publicar

O projeto pode ser publicado gratuitamente utilizando o GitHub Pages.

1. Crie um repositório no GitHub
2. Envie os arquivos
3. Acesse **Settings → Pages**
4. Selecione a branch principal
5. Salve

O site ficará disponível em:

```
https://usuario.github.io/repositorio/
```

Também é possível utilizar domínio próprio.

---

## Atualização do conteúdo

Todo o gerenciamento do conteúdo é realizado através do Google Sheets.

Sempre que uma planilha for alterada, o site refletirá automaticamente as mudanças, sem necessidade de novo deploy.

Isso permite que pessoas sem conhecimento em programação mantenham todo o conteúdo atualizado.

---

## Recursos especiais

### Compartilhamento de eventos

Cada evento pode ser compartilhado diretamente utilizando a Web Share API.

Caso o navegador não seja compatível, o sistema utiliza um fallback para compartilhamento via WhatsApp.

---

### Google Agenda

Cada evento pode ser adicionado ao Google Agenda com apenas um clique.

São enviados automaticamente:

- título
- data
- horário
- descrição
- localização

---

### Transmissões ao vivo

O banner de transmissão é controlado diretamente pela planilha.

Ao informar um link do YouTube Live, o banner aparece automaticamente.

Ao remover o link, o banner deixa de ser exibido.

---

### Google Analytics

O projeto possui integração com Google Analytics 4.

Além das visualizações de página, o sistema suporta eventos personalizados para acompanhamento das principais interações dos usuários.

---

### Revista Digital

A biblioteca de revistas utiliza PDF.js para leitura dos arquivos diretamente no navegador.

---

## Segurança

O projeto não utiliza backend.

Todas as informações exibidas no site devem ser públicas.

Recomenda-se:

- utilizar planilhas apenas para leitura;
- não armazenar informações sensíveis;
- não incluir tokens ou credenciais no código-fonte;
- manter a autenticação em dois fatores (2FA) da conta GitHub.

---

## Roadmap

Funcionalidades previstas para futuras versões:

- Pedido de oração
- Pedido de agradecimento
- Área de membros
- Painel administrativo
- Notificações Push
- Área de notícias
- SEO avançado
- Sitemap automático
- PWA (instalação como aplicativo)
- Migração para Supabase
- Dashboard administrativo
- Cache inteligente para redução de chamadas ao Google Sheets

---

## Licença

Este projeto foi desenvolvido para uso institucional e pode ser adaptado para outras igrejas ou organizações sem fins lucrativos.

---

## Autor

Desenvolvido por **David Fonseca**, com apoio da inteligência artificial.
