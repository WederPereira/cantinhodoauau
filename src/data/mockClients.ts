import { Client, DEFAULT_VACCINES } from '@/types/client';

const rawNames = [
  'Amora', 'Banze', 'Billyjean', 'Bolo Fofo', 'Buddy', 'Café', 'Carmelita', 'DUC',
  'Dalila', 'Elvira', 'Fredo', 'Fubá', 'Gaia', 'Galena', 'Jade', 'Kiara',
  'Lucky', 'Margot (SRD)', 'Mel (SRD)', 'Mel (Shitzu)', 'Milo', 'Moka', 'Mushu',
  'Nico', 'Rush', 'Toddy', 'Cacau (SRD)', 'Pippa', 'Zuri', 'Baby', 'Tom', 'Jack',
  'Zeca', 'Lady Gaga', 'Max', 'Mel (Spitz)', 'Bud', 'Mathilda (Bulldog)',
  'Mel (Cavalier)', 'Gigi', 'Ozzy', 'Matilda (Pequinês)', 'Amora (Golden)',
  'Mozart', 'Gaia Bulldog', 'Yuki', 'Sophie', 'Meli Meli', 'Alba',
  'Chico (SRD Preto)', 'Margot (Bull)', 'Jack (Skiperke)', 'Zaha', 'Malu',
  'Apollo', 'Torresmo', 'Dendê', 'Pingo', 'Calvin', 'Nico Spitz', 'Rufus',
];

export const mockClients: Client[] = rawNames.map((name, index) => ({
  id: `client-${index + 1}`,
  tutorName: '',
  tutorPhone: '',
  tutorEmail: '',
  tutorAddress: '',
  tutorNeighborhood: '',
  tutorCpf: '',
  name,
  breed: '',
  entryDate: new Date(2024, 0, 1),
  vaccines: { ...DEFAULT_VACCINES },
  vaccineHistory: [],
  fleaHistory: [],
  createdAt: new Date(2024, 0, 1),
  updatedAt: new Date(),
}));
