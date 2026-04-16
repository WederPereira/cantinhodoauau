import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://iwjskowrusppbogiazeg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3anNrb3dydXNwcGJvZ2lhemVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxODQ4NTQsImV4cCI6MjA4ODc2MDg1NH0.Enlau-M2fp7gA7K15s5bURFB_xfiKMbjK0V7DhGfuOw';
const supabase = createClient(supabaseUrl, supabaseKey);

const parseDate = (str) => {
  if (!str) return null;
  const clean = str.replace(/[()]/g, '').trim();
  if (!clean) return null;
  const parts = clean.split('/');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
};

async function run() {
  const csvPath = 'C:\\Users\\weder\\Downloads\\clientes_2026-04-06.csv';
  if (!fs.existsSync(csvPath)) {
    console.error('File not found:', csvPath);
    return;
  }
  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split('\n').filter(l => l.trim());
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  const dogIdx = headers.findIndex(h => h === 'dog');
  const tutorIdx = headers.findIndex(h => h === 'tutor');
  const entradaIdx = headers.findIndex(h => h === 'entrada');
  const nascIdx = headers.findIndex(h => h === 'nascimento' || h === 'nasc');
  
  if (dogIdx === -1 || (entradaIdx === -1)) {
    console.error('Missing dog or entrada column in CSV.');
    return;
  }
  
  const { data: dbClients } = await supabase.from('clients').select('id, name, tutor_name');
  if (!dbClients) {
    console.error('Could not fetch DB clients');
    return;
  }
  
  let updatedCount = 0;
  for (let i = 1; i < lines.length; i++) {
     const cols = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
     const dogName = cols[dogIdx];
     const tutorName = tutorIdx !== -1 ? cols[tutorIdx] : '';
     const entrada = parseDate(cols[entradaIdx]);
     const nasc = nascIdx !== -1 ? parseDate(cols[nascIdx]) : null;
     
     if (!dogName || !entrada) continue;
     
     const matched = dbClients.filter(c => c.name.toLowerCase() === dogName.toLowerCase() && (!tutorName || (c.tutor_name || '').toLowerCase() === tutorName.toLowerCase()));
     if (matched.length > 0) {
       for (const m of matched) {
         const updates = { entry_date: entrada };
         if (nasc) updates.birth_date = nasc;
         await supabase.from('clients').update(updates).eq('id', m.id);
         updatedCount++;
       }
     }
  }
  console.log(`Updated ${updatedCount} clients successfully with original dates.`);
}

run();
