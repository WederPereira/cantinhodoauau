---
name: Backup and Monthly Reports
description: ZIP backup completo (tabelas + fotos) restaurável, automático mensal (cron dia 1 às 3h), aba admin em Conta com PDF/Excel mensal por categoria
type: feature
---
## Backup System
- **Bucket privado `backups`** (admin-only RLS) armazena ZIPs com `manifest.json` + `data/<table>.json` para todas as tabelas + `photos/<bucket>/...` para todos os 4 buckets de fotos (avatars, hotel-belongings, reels, edfe)
- **Edge function `monthly-backup`**: gera ZIP completo, faz upload e registra em `backup_history`. Aceita `{ source, user_id, user_name }`.
- **Edge function `restore-backup`**: aceita `{ file_path, mode }` (`merge` upsert por id, `replace` apaga antes). Verifica admin via JWT.
- **Cron `monthly-backup-1st`** chama a function todo dia 1 às 03:00 com `source=auto`.
- **Tabela `backup_history`**: id, file_path, file_size_bytes, source, triggered_by/name, total_clients/photos/records, created_at.

## Monthly Reports
- `src/lib/monthlyReports.ts` exporta `fetchMonthlyData(yearMonth)`, `generateMonthlyPdf` e `generateMonthlyXlsx`.
- **PDF** (jsPDF + jspdf-autotable): capa violet com totais + uma página por categoria.
- **XLSX** (xlsx): aba Resumo + uma aba por categoria.
- Categorias: Creche, Hotel, Hotel-Refeições, Medicações, Vacinas, Antipulgas, Fezes, Táxi, Tarefas, Aniversariantes, QR Entradas.

## UI
- `src/components/account/BackupAndReports.tsx` na aba "Backup" da Conta (admin only).
- Inclui input `type=month`, botões PDF/Excel, botão gerar backup manual, upload de ZIP para restaurar (modo merge ou replace), histórico com download/restore/delete.
