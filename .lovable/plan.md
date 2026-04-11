

## Permitir mensagens de texto no Mural (sem mídia obrigatória)

### O que muda
Atualmente, o Mural exige uma foto ou vídeo para publicar. Esta alteração permite enviar posts apenas com texto.

### Alterações

**1. Banco de dados — tornar `media_url` opcional**
- Migration SQL: `ALTER TABLE reels_posts ALTER COLUMN media_url DROP NOT NULL, ALTER COLUMN media_url SET DEFAULT '';`
- Isso permite inserir posts sem URL de mídia.

**2. `src/pages/ReelsPage.tsx`**
- **Lógica de publicação (`handlePost`)**: Se não houver arquivo selecionado, pular o upload de storage e inserir o post com `media_url: ''` e `media_type: 'text'`.
- **Botão "Publicar" no dialog**: Habilitar quando houver `selectedFile` OU `caption` com texto (atualmente só habilita com arquivo).
- **Dialog de nova publicação**: Adicionar opção "Apenas Texto" (ícone de mensagem) junto com as opções de câmera/galeria, ou simplesmente permitir publicar sem selecionar mídia.
- **Renderização do post**: Se `media_type === 'text'` ou `media_url` vazio, não renderizar tag `<img>` ou `<video>`, mostrar apenas o caption como conteúdo principal com estilo de card de texto.

### Detalhes técnicos
- O campo `media_url` na tabela `reels_posts` será alterado para nullable/default vazio via migration.
- No componente, a condição `disabled={!selectedFile || uploading}` do botão Publicar muda para `disabled={(!selectedFile && !caption.trim()) || uploading}`.
- Posts de texto puro terão visual diferenciado: fundo colorido ou card com texto maior centralizado.

