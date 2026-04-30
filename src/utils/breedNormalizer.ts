import { DOG_BREEDS } from '@/data/dogBreeds';

// Map of common variations to canonical breed names
const SRD_LABEL = 'SRD';
const BREED_ALIASES: Record<string, string> = {
  'srd': SRD_LABEL,
  'srd (sem raça definida / caramelo / vira-lata)': SRD_LABEL,
  'sem raça definida / caramelo / vira-lata': SRD_LABEL,
  'vira-lata': SRD_LABEL,
  'vira lata': SRD_LABEL,
  'viralata': SRD_LABEL,
  'caramelo': SRD_LABEL,
  'sem raça': SRD_LABEL,
  'sem raca': SRD_LABEL,
  'sem raça definida': SRD_LABEL,
  'sem raca definida': SRD_LABEL,
  'mestiço': SRD_LABEL,
  'mestico': SRD_LABEL,
  'golden': 'Golden Retriever',
  'labrador': 'Labrador Retriever',
  'lab': 'Labrador Retriever',
  'poodle': 'Poodle (Caniche) Médio',
  'bulldog frances': 'Bulldog Francês',
  'bulldog francês': 'Bulldog Francês',
  'bulldog ingles': 'Bulldog Inglês',
  'bulldog inglês': 'Bulldog Inglês',
  'pastor alemao': 'Pastor Alemão',
  'pastor alemão': 'Pastor Alemão',
  'border': 'Border Collie',
  'border collie': 'Border Collie',
  'husky': 'Husky Siberiano',
  'rottweiler': 'Rottweiler',
  'pug': 'Pug',
  'shih tzu': 'Shih Tzu',
  'shihtzu': 'Shih Tzu',
  'shitzu': 'Shih Tzu',
  'yorkshire': 'Yorkshire Terrier',
  'york': 'Yorkshire Terrier',
  'lhasa': 'Lhasa Apso',
  'maltes': 'Maltês',
  'maltês': 'Maltês',
  'dachshund': 'Dachshund (Teckel)',
  'teckel': 'Dachshund (Teckel)',
  'salsicha': 'Dachshund (Teckel)',
  'cocker': 'Cocker Spaniel Inglês',
  'beagle': 'Beagle',
  'boxer': 'Boxer',
  'akita': 'Akita Inu',
  'dalmata': 'Dálmata',
  'dálmata': 'Dálmata',
  'doberman': 'Doberman Pinscher',
  'pinscher': 'Pinscher',
  'pitbull': 'Pit Bull',
  'pit bull': 'Pit Bull',
  'american pit bull': 'American Pit Bull Terrier',
  'chow chow': 'Chow Chow',
  'chowchow': 'Chow Chow',
  'schnauzer': 'Schnauzer Standard',
  'bernese': 'Bernese Mountain Dog (Boiadeiro Bernês)',
  'boiadeiro bernês': 'Bernese Mountain Dog (Boiadeiro Bernês)',
  'boiadeiro bermes': 'Bernese Mountain Dog (Boiadeiro Bernês)',
  'spitz': 'Spitz Alemão',
  'spitz alemao': 'Spitz Alemão',
  'spitz alemão': 'Spitz Alemão',
  'lulu da pomerânia': 'Pomerânia (Spitz Alemão Anão)',
  'lulu': 'Pomerânia (Spitz Alemão Anão)',
  'pomerania': 'Pomerânia (Spitz Alemão Anão)',
  'pomerânia': 'Pomerânia (Spitz Alemão Anão)',
  'jack russell': 'Jack Russell Terrier',
  'jack russel': 'Jack Russell Terrier',
  'cane corso': 'Cane Corso',
  'fila': 'Fila Brasileiro',
  'fila brasileiro': 'Fila Brasileiro',
  'shar pei': 'Shar-Pei',
  'shar-pei': 'Shar-Pei',
  'sharpei': 'Shar-Pei',
  'cavalier': 'Cavalier King Charles Spaniel',
  'corgi': 'Corgi (Pembroke Welsh Corgi)',
  'samoieda': 'Samoieda',
  'são bernardo': 'São Bernardo',
  'sao bernardo': 'São Bernardo',
  'dogue alemao': 'Dogue Alemão (Great Dane)',
  'dogue alemão': 'Dogue Alemão (Great Dane)',
  'great dane': 'Dogue Alemão (Great Dane)',
  'chihuahua': 'Chihuahua',
  'whippet': 'Whippet',
  'weimaraner': 'Weimaraner',
  'bully': 'American Bully',
  'american bully': 'American Bully',
  'fox paulistinha': 'Fox Paulistinha (Terrier Brasileiro)',
  'basset': 'Basset Hound',
  'basset hound': 'Basset Hound',
  'malamute': 'Malamute do Alasca',
  'shiba': 'Shiba Inu',
  'shiba inu': 'Shiba Inu',
};

const normalize = (s: string) => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Title-case while preserving small words and accents */
const toTitleCase = (s: string): string =>
  s.toLowerCase()
    .split(/(\s|-|\/)/)
    .map(part => (part.length > 2 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

export function normalizeBreedName(breed: string): string {
  if (!breed || !breed.trim()) return '';

  const trimmed = breed.trim();

  // Exact match in canonical list
  if (DOG_BREEDS.includes(trimmed)) return trimmed;

  // Check aliases (accent/case-insensitive)
  const normalized = normalize(trimmed);
  if (BREED_ALIASES[normalized]) return BREED_ALIASES[normalized];

  // Case/accent-insensitive exact match against canonical list
  const match = DOG_BREEDS.find(b => normalize(b) === normalized);
  if (match) return match;

  // Safer partial match: only when the input is a clear substring of a single canonical breed
  // (avoids false positives like "spitz" matching multiple breeds)
  const candidates = DOG_BREEDS.filter(b => {
    const nb = normalize(b);
    return nb.startsWith(normalized + ' ') || nb === normalized;
  });
  if (candidates.length === 1) return candidates[0];

  // No match: return Title-Cased version so "spitz", "Spitz" e "SPITZ" se consolidem
  return toTitleCase(trimmed);
}
