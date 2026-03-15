import { Client, DEFAULT_VACCINES, Vaccines } from '@/types/client';

interface FullRawClient {
  name: string;
  tutorName: string;
  tutorPhone?: string;
  tutorEmail?: string;
  tutorCpf?: string;
  tutorAddress?: string;
  weight?: number;
  breed: string;
  petSize?: 'Pequeno' | 'Médio' | 'Grande' | 'Gigante';
  birthDate?: string;
  entryDate?: string;
  vaccines?: Partial<Vaccines>;
}

const parseDate = (str?: string): Date | undefined => {
  if (!str) return undefined;
  const clean = str.replace(/[()]/g, '').trim();
  if (!clean) return undefined;
  const parts = clean.split('/');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
};

const v = (dateStr: string): string | null => {
  if (!dateStr || dateStr === 'Não' || dateStr === 'ALERGIA') return null;
  const d = parseDate(dateStr);
  return d ? d.toISOString() : null;
};

const rawData: FullRawClient[] = [
  { name: 'Nina - dom', tutorName: 'Mariana Meireles Amaral', tutorPhone: '(11)983596542', tutorEmail: 'marianamamaral@uol.com.br', tutorCpf: '6757992604', tutorAddress: 'Rua Osvaldo Cruz, 141 Apartamento 83 A - Santa Paula, São Caetano do Sul - SP', weight: 29.3, breed: 'Srd', petSize: 'Médio', birthDate: '10/11/2020', entryDate: '28/05/2021', vaccines: { gripe: v('15/05/2025'), v10: v('15/05/2025'), raiva: v('15/05/2025'), giardia: v('06/06/2025'), antipulgas: v('03/06/2025') } },
  { name: 'Gamora', tutorName: 'Douglas de Moraes Silva', tutorPhone: '(11) 99441-2411', tutorEmail: 'dounil@oul.com.br', tutorCpf: '006.669.738-73', tutorAddress: 'Rua Firmino Alves, 26 - Parque São Lucas, São Paulo - SP', weight: 7.9, breed: 'Srd', petSize: 'Pequeno', birthDate: '15/02/2022', entryDate: '27/06/2023', vaccines: { gripe: v('20/03/2024'), v10: v('23/01/2025'), raiva: v('23/01/2025'), giardia: v('20/03/2024'), antipulgas: null } },
  { name: 'Amora B.', tutorName: 'Lucas Pazine', tutorPhone: '(11) 99446-1600', tutorEmail: 'lucaspazine@gmail.com', tutorCpf: '356.662.668-61', tutorAddress: 'Rua Monte Alegre, 236 Apartamento 11 - Santo Antônio, São Caetano do Sul - SP', weight: 13.7, breed: 'Buldogue Francês', petSize: 'Pequeno', birthDate: '01/02/2017', entryDate: '18/06/2021', vaccines: { gripe: v('05/12/2024'), v10: v('05/12/2024'), raiva: v('08/01/2025'), giardia: v('05/12/2024'), antipulgas: v('02/05/2025') } },
  { name: 'Romeu', tutorName: 'Rodrigo Marinho Lozano', tutorPhone: '(11) 99423-9065', tutorEmail: 'Rodrigomrozano@gmail.com', tutorCpf: '296.394.048-37', tutorAddress: 'Rua Rio Grande do Sul, 639 aprto 22 - Santo Antônio, São Caetano do Sul - SP', weight: 17.1, breed: 'Buldogue Francês', petSize: 'Pequeno', birthDate: '19/07/2022', entryDate: '08/12/2023', vaccines: { gripe: null, v10: null, raiva: null, giardia: null, antipulgas: v('13/06/2025') } },
  { name: 'Alezz', tutorName: 'Nathalia Accioli', tutorPhone: '(11) 98689-5207', tutorEmail: 'nathaliaaccioli@gmail.com', tutorCpf: '384.453.898-40', tutorAddress: 'Rua Rio Grande do Sul, 396 ap 103 - Centro, São Caetano do Sul - SP', weight: 11.1, breed: 'Srd', petSize: 'Médio', birthDate: '18/07/2018', entryDate: '18/07/2024' },
  { name: 'Lupita', tutorName: 'Nathalia Accioli', tutorPhone: '(11) 93227-4551', tutorEmail: 'nathaliaaccioli@gmail.com', tutorCpf: '384.453.898-40', tutorAddress: 'Rua Rio Grande do Sul, 396 ap 103 - Centro, São Caetano do Sul - SP', weight: 1.9, breed: 'Chihuahua', petSize: 'Pequeno', birthDate: '18/07/2021', entryDate: '18/07/2024' },
  { name: 'Kiara', tutorName: 'Rafaela dollazi', tutorPhone: '(11) 94553-7082', tutorEmail: 'rafaela.luiz.martin@gmail.com', tutorCpf: '366.660.408-05', tutorAddress: 'Rua Osvaldo Cruz, 141 ap 124 a - Santa Paula, SP - SP', breed: 'Srd', petSize: 'Médio', birthDate: '12/05/2021', entryDate: '11/12/2021', vaccines: { gripe: v('09/09/2025'), v10: v('09/09/2025'), raiva: v('27/11/2025'), giardia: v('27/11/2025'), antipulgas: v('08/04/2025') } },
  { name: 'Cake', tutorName: 'Samara', tutorPhone: '(11) 96964-2122', tutorEmail: 'saaamh.sd@gmail.com', tutorCpf: '092.853.316-61', tutorAddress: 'Alameda Porcelana, 185 ap 162 C - Cerâmica, São Caetano do Sul - SP', weight: 23.6, breed: 'Border Collie', petSize: 'Médio', entryDate: '19/08/2023' },
  { name: 'Misha', tutorName: 'Samara', tutorPhone: '(11) 97089-9088', tutorEmail: 'saaamh.sd@gmail.com', tutorCpf: '092.853.316-61', tutorAddress: 'Alameda Porcelana, 185 ap 162 C - Cerâmica, São Caetano do Sul - SP', weight: 16.3, breed: 'Border Collie', petSize: 'Médio', birthDate: '26/03/2023', entryDate: '19/08/2023' },
  { name: 'George L.', tutorName: 'Karim Priscila Montagnani Kahn da Silveira', tutorPhone: '(11) 96078-1010', tutorEmail: 'kakakahn@gmail.com', tutorCpf: '368.600.718-50', tutorAddress: 'Passagem dos Toneleiros, 59 - Santa Maria, São Caetano do Sul - SP', weight: 44.6, breed: 'Golden Retriever', petSize: 'Grande', birthDate: '02/09/2021', entryDate: '07/07/2022' },
  { name: 'Apolo A.', tutorName: 'Gian Filipe', tutorPhone: '(11) 94742-6140', tutorEmail: 'gian.filipe@icloud.com', tutorCpf: '360.800.658-35', tutorAddress: 'Rua Piauí, 274 apto 35 - Santa Paula, São Caetano do Sul - SP', weight: 26.1, breed: 'American Bully', petSize: 'Médio', entryDate: '03/04/2024', vaccines: { gripe: v('25/05/2025'), v10: v('20/08/2025'), raiva: v('25/05/2025'), giardia: v('25/05/2025'), antipulgas: v('12/06/2025') } },
  { name: 'Nala', tutorName: 'Thassia Soares Castro', tutorPhone: '(11) 97148-5057', tutorEmail: 'thassia2015med@gmail.com', tutorCpf: '418.817.088-37', tutorAddress: 'Rua Piauí, 274 ap 35 - Santa Paula, São Caetano do Sul - SP', weight: 3.5, breed: 'Yorkshire Terrier', petSize: 'Pequeno', birthDate: '29/09/2018', entryDate: '16/08/2024', vaccines: { gripe: v('25/05/2025'), v10: v('25/05/2025'), raiva: v('24/04/2025'), giardia: v('25/05/2025'), antipulgas: v('03/04/2025') } },
  { name: 'Maria Flor', tutorName: 'Fernanda Yakel', tutorPhone: '(11) 99173-8848', tutorEmail: 'ferystefani@gmail.com', tutorCpf: '260.105.048-99', tutorAddress: 'Rua Luís Louza, 181 apto 44 torre 1 - Olímpico, São Caetano do Sul - SP', weight: 9.5, breed: 'Shih Tzu', birthDate: '18/11/2020', entryDate: '20/07/2023', vaccines: { gripe: v('24/05/2025'), v10: v('28/04/2025'), raiva: v('19/05/2025'), giardia: v('28/04/2025'), antipulgas: v('12/06/2025') } },
  { name: 'Tomas', tutorName: 'Daniela FerreiraTorquato', tutorPhone: '(11) 95908-7011', tutorCpf: '457.376.448-80', tutorAddress: 'Avenida Presidente Kennedy, 3300 ap 904 - Boa Vista, São Caetano do Sul - SP', weight: 6.8, breed: 'Dachshund', birthDate: '04/01/2024', entryDate: '29/08/2024', vaccines: { gripe: v('26/04/2025'), v10: v('26/04/2025'), raiva: v('26/04/2025'), giardia: v('26/04/2025'), antipulgas: v('17/06/2025') } },
  { name: 'Sakura', tutorName: 'Renato Rapozo da Silva', tutorPhone: '(11) 9131-0077', tutorEmail: 'renatorapozo@icloud.com', tutorCpf: '364.811.408-54', tutorAddress: 'Avenida Senador Roberto Simonsen, 1536 - Cerâmica, São Caetano do Sul - SP', breed: 'Husky Siberiano', birthDate: '16/11/2020', entryDate: '31/03/2022', vaccines: { gripe: null, v10: v('20/01/2025'), raiva: v('09/01/2025'), giardia: null, antipulgas: v('08/04/2025') } },
  { name: 'Mafalda', tutorName: 'Patricia Fernandes Audi', tutorPhone: '(11) 99100-0577', tutorEmail: 'patricia.fernades.audi@gmail.com', tutorCpf: '358.486.768-10', tutorAddress: 'Avenida Marechal Deodoro da Fonseca, 452 ap 62 - Pitangueiras, Guarujá - SP', breed: 'Jack Russell Terrier', birthDate: '28/07/2019', entryDate: '27/03/2024', vaccines: { gripe: v('04/04/2024'), v10: v('04/04/2024'), raiva: v('04/04/2024'), giardia: v('04/04/2024'), antipulgas: null } },
  { name: 'Pepper', tutorName: 'Natália Assone Machtura', tutorPhone: '(11) 98591-7686', tutorEmail: 'nmachtura@gmail.com', tutorCpf: '346.511.898-73', tutorAddress: 'Rua General Canavarro, 292 apto 04 - Campestre, Santo André - SP', breed: 'Schnauzer', birthDate: '05/05/2024', entryDate: '19/09/2024', vaccines: { gripe: null, v10: null, raiva: null, giardia: null, antipulgas: v('21/06/2025') } },
  { name: 'Emma', tutorName: 'Suzette / Laura', tutorPhone: '(11) 98714-3734', tutorEmail: 'suzette@uol.com.br', tutorCpf: '069.370.108-00', tutorAddress: 'Rua Afonso Pena, 229 Apartamento 72 - Santa Paula, São Caetano do Sul - SP', weight: 23.5, breed: 'Border Collie', birthDate: '08/01/2017', entryDate: '15/06/2021', vaccines: { gripe: v('20/03/2025'), v10: v('28/11/2024'), raiva: v('20/03/2025'), giardia: v('28/11/2024'), antipulgas: v('06/03/2025') } },
  { name: 'Noa', tutorName: 'Érika Warnieri Yano', tutorPhone: '(11) 98609-6945', tutorEmail: 'erikagy@gmail.com', tutorCpf: '312.937.798-06', tutorAddress: 'Rua das Esmeraldas, 195 apto 31 - Jardim, Santo André - SP', weight: 5.6, breed: 'Srd', birthDate: '02/07/2015', entryDate: '28/09/2023', vaccines: { gripe: v('05/07/2024'), v10: v('05/07/2024'), raiva: v('05/07/2024'), giardia: v('05/07/2024'), antipulgas: v('20/06/2025') } },
  { name: 'Tyler', tutorName: 'Elisabeth Perucci', tutorPhone: '(11) 98554-7142', tutorEmail: 'bekaperucci@gmail.com', tutorCpf: '006.745.368-60', tutorAddress: 'Rua Rio Branco, 20 aprt 124 - Fundação, São Caetano do Sul - SP', weight: 22.5, breed: 'Husky Siberiano', birthDate: '19/08/2014', entryDate: '08/08/2023', vaccines: { gripe: v('31/01/2025'), v10: v('31/01/2025'), raiva: v('30/04/2025'), giardia: v('31/01/2025'), antipulgas: v('04/04/2025') } },
  { name: 'Max', tutorName: 'Italo Calheiro marques', tutorPhone: '(11) 94738-4958', tutorEmail: 'italo.c.marques@gmail.com', tutorCpf: '420.298.658-00', tutorAddress: 'Rua Alegre, 935 apt 84 - Santa Paula, São Caetano do Sul - SP', weight: 5.5, breed: 'Maltês', birthDate: '11/12/2020', entryDate: '20/01/2023', vaccines: { gripe: v('13/12/2025'), v10: v('02/12/2025'), raiva: v('02/12/2025'), giardia: v('13/12/2025'), antipulgas: v('13/12/2025') } },
  { name: 'Mel', tutorName: 'Bianca do Carmo Teixeira', tutorPhone: '(11) 95366-2199', tutorEmail: 'biancamatricoli@hotmail.com', tutorCpf: '393.973.128-55', tutorAddress: 'Rua Perrella, 110 Apartamento 184 - Fundação, São Caetano do Sul - SP', weight: 18.5, breed: 'Srd', birthDate: '18/02/2016', entryDate: '03/07/2021', vaccines: { gripe: v('09/05/2025'), v10: v('06/02/2025'), raiva: v('06/02/2025'), giardia: v('02/05/2025'), antipulgas: v('21/06/2025') } },
  { name: 'Paçoca', tutorName: 'Bianca do Carmo Teixeira', tutorPhone: '(11) 95366-2199', tutorEmail: 'biancamatricoli@hotmail.com', tutorCpf: '393.973.128-55', tutorAddress: 'Rua Perrella, 110 Apartamento 184 - Fundação, São Caetano do Sul - SP', breed: 'Srd', birthDate: '18/02/2019', entryDate: '03/07/2021', vaccines: { gripe: v('09/05/2025'), v10: v('06/02/2025'), raiva: v('06/02/2025'), giardia: v('02/05/2025'), antipulgas: v('21/06/2025') } },
  { name: 'Abel', tutorName: 'Danielle freire schiavo', tutorPhone: '(11) 97142-5976', tutorEmail: 'daniellef.schiazo@gmail.com', tutorCpf: '397.620.358-01', tutorAddress: 'Rua João Euclides Pereira, 32 ap 42 - Santa Maria, São Caetano do Sul - SP', weight: 8.8, breed: 'Dachshund', birthDate: '27/03/2023', entryDate: '25/11/2023', vaccines: { gripe: v('06/12/2025'), v10: v('10/07/2025'), raiva: v('17/12/2024'), giardia: v('06/12/2025'), antipulgas: v('27/06/2025') } },
  { name: 'Pingo', tutorName: 'Ana Cheila Pereira', tutorPhone: '(11) 91640-3292', tutorEmail: 'Asheilac@gmail.com', tutorCpf: '081.543.267-44', tutorAddress: 'Rua Marlene, 785 apt 12 - Nova Gerty, São Caetano do Sul - SP', breed: 'Buldogue Francês', birthDate: '11/03/2023', entryDate: '25/11/2023', vaccines: { gripe: v('15/06/2025'), v10: v('30/05/2025'), raiva: v('30/05/2025'), giardia: v('15/06/2025'), antipulgas: v('12/06/2025') } },
  { name: 'Fred', tutorName: 'Simony Demetri', tutorPhone: '(11) 93089-5079', tutorEmail: 'si.demetri@hotmail.com', tutorCpf: '326.757.258-46', tutorAddress: 'Alameda dos Ipês, 126 lote 3 - Cerâmica, São Caetano do Sul - SP', breed: 'Beagle', birthDate: '16/03/2011', entryDate: '17/12/2024' },
  { name: 'Frida', tutorName: 'Simony Demetri', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Aslan', tutorName: 'Giulia Pavin', weight: 24.4, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Cassandra', tutorName: 'Bárbara Renna Pavin Garofalo', weight: 6.2, breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'Dunk', tutorName: 'Mirella Bianca R Pacheco', breed: 'American Bully', entryDate: '01/01/2024' },
  { name: 'Gildo', tutorName: 'Bárbara Renna Pavin Garofalo', weight: 7.5, breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'Kiwi', tutorName: 'Nathaly Ramos Almeida', weight: 13.6, breed: 'Whippet', entryDate: '01/01/2024' },
  { name: 'Dante', tutorName: 'Sabrina Aparecida Delgobo Santos', weight: 9.3, breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Nika', tutorName: 'Cristiane Dias Poças', weight: 14.3, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Apolo B.', tutorName: 'Edivaldo Franco', weight: 40.1, breed: 'Boiadeiro Australiano', entryDate: '01/01/2024' },
  { name: 'Bento s.', tutorName: 'Renata Torres Alves', weight: 6.5, breed: 'Schnauzer', entryDate: '01/01/2024' },
  { name: 'Apolo - Toddy', tutorName: 'Nadia toledano', weight: 13.1, breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Toddy', tutorName: 'Nadia toledano', weight: 9.7, breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Amelie S.', tutorName: 'Roberta Zombon', weight: 5.4, breed: 'Schnauzer', entryDate: '01/01/2024' },
  { name: 'Maria Cristal', tutorName: 'Roberta Zombon', breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'Jade', tutorName: 'Rita De Cassia Patriani Alexandre', weight: 7.3, breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'deise', tutorName: 'Cibele Santos Silva', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Joca jack rull', tutorName: 'Fernando Costamagna Bispo', weight: 5.4, breed: 'Jack Russell Terrier', entryDate: '01/01/2024' },
  { name: 'Nina Cordisco', tutorName: 'Giovanna Cordisco Rufino', weight: 13.9, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Amora L.', tutorName: 'Nádia Gerizani', weight: 28.8, breed: 'Labradora', entryDate: '01/01/2024' },
  { name: 'Moana', tutorName: 'Maria Cecília Bissiato', breed: 'Beagle', entryDate: '01/01/2024' },
  { name: 'Thor Border', tutorName: 'Ana Gomes Sarmento de Araújo', weight: 26.8, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Josh', tutorName: 'Yasmin', weight: 9.1, breed: 'Yorkshire Terrier', entryDate: '01/01/2024' },
  { name: 'Nina - Pig', tutorName: 'Carla Ap. M. Zanon', weight: 21, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Pig', tutorName: 'Carla Ap. M. Zanon', weight: 12.3, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Scapuliu', tutorName: 'Caio Henrique Silveira', weight: 30.1, breed: 'Beagle', entryDate: '01/01/2024' },
  { name: 'Mel Merle', tutorName: 'Débora Duarte Serdas', weight: 18.2, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Paulinha', tutorName: 'Delza de Jesus Martins Xavier', weight: 37, breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Barth', tutorName: 'Aline Gonçalves Ferreira', weight: 20.8, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Tiger', tutorName: 'Renata Ferreira De Almeida', weight: 23.7, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Judith', tutorName: 'Priscila Cruz De Morais', breed: 'Bernese Mountain Dog', entryDate: '01/01/2024' },
  { name: 'Chokito', tutorName: 'Nilza Rita Travassos', weight: 6.6, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Hugo', tutorName: 'Nathany Batista da Silva', breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Katrina', tutorName: 'Nivaldo DeSousa', weight: 45.1, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Lord', tutorName: 'Nathany Batista da Silva', breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'Nero', tutorName: 'Talitha Crepalde', weight: 13.1, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Theo', tutorName: 'Camila Gimenez da Silva', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Léia', tutorName: 'Henrique Graciano do Carmo', weight: 18, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Chaves', tutorName: 'Wesley Correa', weight: 20.5, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Cobi G.', tutorName: 'Gabriel Batista', weight: 18.1, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Jujuba G.', tutorName: 'Gabriel Batista', weight: 9.5, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Lua G.', tutorName: 'Gabriel Batista', weight: 23.8, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Malu', tutorName: 'André Luiz Cataldi', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Manga', tutorName: 'André Luiz Cataldi', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Molly', tutorName: 'Wesley Correa', weight: 17, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Pandora', tutorName: 'Cantinho Auau', weight: 15.3, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Zoe', tutorName: 'Leonardo Pessoa Beck', weight: 15.9, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Dólar', tutorName: 'Luiz Felipe Custodio', weight: 48, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Nanny', tutorName: 'Viviane', breed: 'Lhasa Apso', entryDate: '01/01/2024' },
  { name: 'Nick', tutorName: 'Viviane', breed: 'Buldogue Francês', entryDate: '01/01/2024' },
  { name: 'Apolo D.', tutorName: 'Paulo Victor Rampim', weight: 13.3, breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Pérola', tutorName: 'Anaisa Cuan Bezerra', weight: 5.6, breed: 'Spitz Alemão', entryDate: '01/01/2024' },
  { name: 'Kobe', tutorName: 'Wilton dos Santos Junior', weight: 30.4, breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Bruce', tutorName: 'André Ortega Rodrigues', weight: 27, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Tião', tutorName: 'Glaucia Cristina Peres', weight: 48.4, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'jhon', tutorName: 'Thiago Valentim', weight: 2.6, breed: 'Yorkshire Terrier', entryDate: '01/01/2024' },
  { name: 'Chloe', tutorName: 'Maria', weight: 45.2, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Fenrir', tutorName: 'Anna Paula Borges Basso', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Joli', tutorName: 'Tarley Silva', weight: 5.4, breed: 'Papillon', entryDate: '01/01/2024' },
  { name: 'Crystal', tutorName: 'Sirley Benhami', weight: 12.6, breed: 'Buldogue Francês', entryDate: '01/01/2024' },
  { name: 'Banguela', tutorName: 'Athos de Andrade Pavão', weight: 4.5, breed: 'Spitz Alemão', entryDate: '01/01/2024' },
  { name: 'Bobe', tutorName: 'Renan Brentzel Silva', weight: 18.7, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Mek', tutorName: 'Tayná Santos Araujo de Faria', weight: 1.4, breed: 'Yorkshire Terrier', entryDate: '01/01/2024' },
  { name: 'Gaya', tutorName: 'silvia regina rebello', weight: 19.7, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Athena b.', tutorName: 'Ariadne Amorim', weight: 12.7, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Simba Golden 2', tutorName: 'Yan de Oliveira Rocha', weight: 38.6, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Hope', tutorName: 'Ana Elisa Kadri Castilho', breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Apache', tutorName: 'Cris de olho no Bicho', weight: 22.8, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Nino', tutorName: 'Karinna Grillo Domingos', breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'Bruce B.', tutorName: 'Tayná Nascimento', weight: 25.3, breed: 'Buldogue Inglês', entryDate: '01/01/2024' },
  { name: 'Camila', tutorName: 'Guilherme de oliveira cariani', weight: 13.4, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Hidra', tutorName: 'Cris de olho no Bicho', weight: 26.3, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Brisa W', tutorName: 'Fabiana Pegoraro das Neves', weight: 11.8, breed: 'Whippet', entryDate: '01/01/2024' },
  { name: 'Koda', tutorName: 'Guilherme de oliveira cariani', weight: 12.2, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Moa', tutorName: 'Erick', weight: 9.2, breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Simba', tutorName: 'Thiago', breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Abilio', tutorName: 'Gabriela Rafaela Ribas Vega Pires de Campos', weight: 9.5, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Dom - sheik', tutorName: 'Lucas Matheus Aloncio', weight: 29.1, breed: 'American Bully', entryDate: '01/01/2024' },
  { name: 'Sheik', tutorName: 'Lucas Matheus Aloncio', weight: 10.1, breed: 'Buldogue Francês', entryDate: '01/01/2024' },
  { name: 'Olivia', tutorName: 'Gabriel Chaves Rettore', breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Otávio', tutorName: 'Gabriel Chaves Rettore', breed: 'Dachshund', entryDate: '01/01/2024' },
  { name: 'Brigitte', tutorName: 'Ingrid Marques', weight: 10.9, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Lola', tutorName: 'Raquel Assis Freitas', breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Judith', tutorName: 'Guilherme', weight: 18.2, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Blue', tutorName: 'Michel Gracioso Montanher', weight: 33.1, breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Harry', tutorName: 'Jessica Moraes Melhado', weight: 31.1, breed: 'Buldogue Inglês', entryDate: '01/01/2024' },
  { name: 'Nina', tutorName: 'Ricardo Rocco', weight: 16, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Paçoca', tutorName: 'Ricardo Rocco', weight: 20.9, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Cookie', tutorName: 'Erika Fabiana Cabral Cruz', weight: 4.6, breed: 'Spitz Alemão', entryDate: '01/01/2024' },
  { name: 'Ozzy L.', tutorName: 'Andrea Sabino Dellamura Giatti', breed: 'Lhasa Apso', entryDate: '01/01/2024' },
  { name: 'Bidu', tutorName: 'Tatiana Almeida Bernardo Dos Santos', weight: 7.7, breed: 'Bichon Frisé', entryDate: '01/01/2024' },
  { name: 'Frida Z.', tutorName: 'Letícia Gonçalves Zaniboni', breed: 'Shih Tzu', entryDate: '01/01/2024' },
  { name: 'Maya', tutorName: 'Tatiana Almeida Bernardo Dos Santos', weight: 4.1, breed: 'Bichon Frisé', entryDate: '01/01/2024' },
  { name: 'Serafim', tutorName: 'Regina De Assis Trindade Simões', breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Jake', tutorName: 'Vitor Ferreira da Silva Neto', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Teca', tutorName: 'Vitor Ferreira da Silva Neto', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Bento', tutorName: 'Marcelo de Assis', breed: 'Chihuahua', entryDate: '01/01/2024' },
  { name: 'Mia B.', tutorName: 'Alessandra Barban', breed: 'Border Collie', entryDate: '01/01/2024' },
  { name: 'Pluto', tutorName: 'Renan Saia Gonzaga', weight: 45.8, breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Mate', tutorName: 'Priscila betaleli Franco', breed: 'Buldogue Francês', entryDate: '01/01/2024' },
  { name: 'Pitty', tutorName: 'Priscila betaleli Franco', breed: 'Buldogue Francês', entryDate: '01/01/2024' },
  { name: 'Buddy', tutorName: 'Marcus Schiavette', weight: 11.3, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Jimi', tutorName: 'Marcus Schiavette', weight: 24.5, breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Amelie J.', tutorName: 'Dagmar Molina', weight: 7.4, breed: 'Jack Russell Terrier', entryDate: '01/01/2024' },
  { name: 'Margot', tutorName: 'Dagmar Molina', weight: 8.6, breed: 'Jack Russell Terrier', entryDate: '01/01/2024' },
  { name: 'Dimple', tutorName: 'Jessica Tinte Zandarem', weight: 3.7, breed: 'Yorkshire Terrier', entryDate: '01/01/2024' },
  { name: 'Dudu', tutorName: '', breed: 'Maltês', entryDate: '01/01/2024' },
  { name: 'Theodoro', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Rebeca', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Kaiser', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Lucca', tutorName: '', breed: 'Spitz Alemão', entryDate: '01/01/2024' },
  { name: 'Jhow', tutorName: '', breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Mike', tutorName: '', breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Aila', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Lord G.', tutorName: '', breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Hanna', tutorName: '', breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Timo', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Whisky', tutorName: '', breed: 'Yorkshire Terrier', entryDate: '01/01/2024' },
  { name: 'Peppe', tutorName: '', breed: 'Yorkshire Terrier', entryDate: '01/01/2024' },
  { name: 'Shiva', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Nina', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Zoe', tutorName: '', breed: 'Husky Siberiano', entryDate: '01/01/2024' },
  { name: 'Tapioca', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Estrela', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Jake (CE)', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Max', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Jhony', tutorName: '', breed: 'Srd', entryDate: '01/01/2024' },
  { name: 'Lord', tutorName: '', breed: 'Golden Retriever', entryDate: '01/01/2024' },
  { name: 'Bento', tutorName: '', breed: 'Golden Retriever', entryDate: '01/01/2024' },
];

const pDate = (str?: string): Date | undefined => {
  if (!str) return undefined;
  const parts = str.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return undefined;
};

export const mockClients: Client[] = rawData.map((data, index) => ({
  id: `client-${index + 1}`,
  tutorName: data.tutorName,
  tutorPhone: data.tutorPhone || '',
  tutorEmail: data.tutorEmail || '',
  tutorAddress: data.tutorAddress || '',
  tutorNeighborhood: '',
  tutorCpf: data.tutorCpf || '',
  name: data.name,
  breed: data.breed,
  weight: data.weight,
  petSize: data.petSize,
  birthDate: pDate(data.birthDate),
  entryDate: pDate(data.entryDate) || new Date(2024, 0, 1),
  vaccines: data.vaccines ? { ...DEFAULT_VACCINES, ...data.vaccines } : { ...DEFAULT_VACCINES },
  vaccineHistory: [],
  fleaHistory: [],
  createdAt: new Date(2024, 0, 1),
  updatedAt: new Date(),
}));
