import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

const VACCINE_LABELS = {
  gripe: 'Gripe',
  v10: 'V10',
  raiva: 'Raiva',
  giardia: 'Giárdia',
  antipulgas: 'Antipulgas'
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
  
  const columns = {
    dog: headers.findIndex(h => h === 'dog'),
    tutor: headers.findIndex(h => h === 'tutor'),
    phone: headers.findIndex(h => h === 'telefone'),
    email: headers.findIndex(h => h === 'email'),
    cpf: headers.findIndex(h => h === 'cpf'),
    address: headers.findIndex(h => h === 'endereço' || h.includes('ender')),
    breed: headers.findIndex(h => h === 'raça' || h.includes('raca')),
    weight: headers.findIndex(h => h.includes('peso')),
    size: headers.findIndex(h => h === 'porte'),
    gender: headers.findIndex(h => h === 'gênero' || h === 'genero'),
    castrated: headers.findIndex(h => h === 'castrado'),
    birth: headers.findIndex(h => h === 'nascimento' || h.includes('nasc')),
    entry: headers.findIndex(h => h === 'entrada')
  };
  
  const vaccineIndexes = {};
  for (const k of Object.keys(VACCINE_LABELS)) {
     vaccineIndexes[k] = headers.findIndex(h => h === VACCINE_LABELS[k].toLowerCase() || h === k.toLowerCase());
  }

  const { data: dbClients } = await supabase.from('clients').select('id, name, tutor_name');
  
  const rowsToInsert = [];
  
  for (let i = 1; i < lines.length; i++) {
     const cols = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
     const dogName = cols[columns.dog];
     const tutorName = columns.tutor !== -1 ? cols[columns.tutor] : '';
     
     if (!dogName) continue;
     
     const matched = (dbClients || []).filter(c => c.name.toLowerCase() === dogName.toLowerCase() && (!tutorName || (c.tutor_name || '').toLowerCase() === tutorName.toLowerCase()));
     if (matched.length > 0) continue; // skip duplicates
     
     const vaccines = { gripe: null, v10: null, raiva: null, giardia: null, antipulgas: null };
     for (const k of Object.keys(VACCINE_LABELS)) {
       const idx = vaccineIndexes[k];
       if (idx !== -1) {
         const d = parseDate(cols[idx].replace(/\s*\(.*\)/, ''));
         if (d) vaccines[k] = d;
       }
     }
     
     let weight = null;
     if (columns.weight !== -1 && cols[columns.weight]) {
       weight = parseFloat(cols[columns.weight].replace(',', '.'));
       if (isNaN(weight)) weight = null;
     }

     const row = {
       name: dogName,
       tutor_name: tutorName,
       tutor_phone: columns.phone !== -1 ? cols[columns.phone] : '',
       tutor_email: columns.email !== -1 ? cols[columns.email] : '',
       tutor_cpf: columns.cpf !== -1 ? cols[columns.cpf] : '',
       tutor_address: columns.address !== -1 ? cols[columns.address] : '',
       breed: columns.breed !== -1 ? cols[columns.breed] : '',
       weight: weight,
       pet_size: columns.size !== -1 ? (cols[columns.size] || null) : null,
       gender: columns.gender !== -1 ? (cols[columns.gender] || null) : null,
       castrated: columns.castrated !== -1 ? (cols[columns.castrated].toLowerCase() === 'sim') : false,
       birth_date: columns.birth !== -1 ? parseDate(cols[columns.birth]) : null,
       entry_date: columns.entry !== -1 ? (parseDate(cols[columns.entry]) || new Date().toISOString()) : new Date().toISOString(),
       vaccines: vaccines
     };
     
     rowsToInsert.push(row);
  }
  
  if (rowsToInsert.length > 0) {
    console.log(`Inserting ${rowsToInsert.length} clients...`);
    const { error } = await supabase.from('clients').insert(rowsToInsert);
    if (error) {
      console.error('Failed to import clients:', error);
    } else {
      console.log('Successfully inserted all clients. Dates are strictly preserved.');
    }
  } else {
    console.log('No new clients to insert.');
  }
}

run();
