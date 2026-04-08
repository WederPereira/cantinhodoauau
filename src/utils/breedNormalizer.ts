import { DOG_BREEDS } from '@/data/dogBreeds';

// Map of common variations to canonical breed names
const BREED_ALIASES: Record<string, string> = {
  'srd': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'vira-lata': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'vira lata': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'viralata': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'caramelo': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'sem raça': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'sem raca': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
  'sem raça definida': 'SRD (Sem Raça Definida / Caramelo / Vira-Lata)',
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

export function normalizeBreedName(breed: string): string {
  if (!breed || !breed.trim()) return '';
  
  const trimmed = breed.trim();
  
  // Exact match in canonical list
  if (DOG_BREEDS.includes(trimmed)) return trimmed;
  
  // Check aliases
  const normalized = normalize(trimmed);
  if (BREED_ALIASES[normalized]) return BREED_ALIASES[normalized];
  
  // Fuzzy match: find canonical breed that starts with or contains the input
  const match = DOG_BREEDS.find(b => normalize(b) === normalized);
  if (match) return match;
  
  const partialMatch = DOG_BREEDS.find(b => normalize(b).includes(normalized) || normalized.includes(normalize(b)));
  if (partialMatch) return partialMatch;
  
  // Return original if no match found
  return trimmed;
}
