# Site para apresentação de igreja

Portal institucional da Igreja Assembleia de Deus Belém em Barueri.

Este projeto foi desenvolvido para centralizar informações da igreja em uma única plataforma digital, oferecendo acesso rápido a eventos, avisos, sermões, congregações, história institucional e atualizações do projeto de construção.

## Visão geral

O site é uma aplicação web estática desenvolvida em HTML, CSS e JavaScript, hospedada no GitHub Pages, com dados dinâmicos alimentados por planilhas do Google Sheets.

A proposta é permitir que o conteúdo seja atualizado sem necessidade de alterar o código-fonte, utilizando planilhas como base de gerenciamento.

## Funcionalidades

- Agenda de cultos e eventos
- Avisos e comunicados
- Lista de congregações com localização integrada ao Google Maps
- Biblioteca de sermões com texto e vídeo
- Timeline da história da igreja
- Acompanhamento do projeto “Nossa Casa”
- Sistema de contribuição via PIX
- Leitor digital de revistas
- Busca por congregações
- Busca por sermões
- Layout responsivo para desktop e mobile

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript Vanilla
- Google Sheets (como CMS/headless database)
- TSV parsing
- Google Drive (imagens e PDFs)
- YouTube Embed API
- PDF.js
- GitHub Pages

## Estrutura do projeto

```text
/
├── index.html
├── README.md
```

## Arquitetura

O sistema utiliza o Google Sheets como fonte de dados.

Fluxo:

Google Sheets → TSV público → Fetch API → Parser → Renderização dinâmica no navegador

Cada seção do site possui sua própria aba na planilha:

- eventos
- avisos
- igrejas
- sermoes
- sobre
- casa
- casaAtualizacoes
- revista (opcional)

## Configuração

No arquivo principal, configure:

```javascript
const LOGO_URL = '';
const PIX_REGULAR = '';
const PIX_OBRA = '';

const SHEET_URLS = {
  eventos:'',
  avisos:'',
  igrejas:'',
  sermoes:'',
  sobre:'',
  casa:'',
  casaAtualizacoes:'',
  revista:''
};
```

## Como publicar

Este projeto pode ser hospedado facilmente via GitHub Pages:

1. Faça push do projeto para um repositório
2. Vá em Settings > Pages
3. Selecione a branch principal
4. Ative a publicação

O site ficará disponível em:

```text
https://usuario.github.io/repositorio/
```

## Como atualizar conteúdo

Todo o conteúdo é gerenciado via Google Sheets.

Basta editar a planilha vinculada e as alterações serão refletidas no site automaticamente.

## Recursos especiais

### Revista digital

O módulo de revista está preparado para exibir PDFs em formato flipbook/leitor interno.

Para ativar:

```javascript
const REVISTA_ATIVA = true;
```

E configurar a aba `revista` na planilha.

## Melhorias futuras

- Analytics de acessos
- Área administrativa
- Painel de membros
- Integração com calendário
- Sistema de pedidos de oração
- Área de notícias
- Login para líderes
- Banco de dados dedicado (Supabase/Firebase)

## Objetivo

Este projeto busca unir tecnologia e organização para facilitar a comunicação da igreja com seus membros e visitantes.

## Licença

Uso institucional interno.

## Autor

Desenvolvido por David Fonseca, com IA.
