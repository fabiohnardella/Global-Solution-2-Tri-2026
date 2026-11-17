import type { Place } from '../types';

/* ==========================================================================
 * Pontos de origem/destino (dados mockados — região central de São Paulo)
 * ========================================================================== */

export const PLACES: Place[] = [
  {
    id: 'consolacao',
    name: 'Estação Consolação (Metrô Linha 2-Verde)',
    shortName: 'Est. Consolação',
    address: 'Av. Paulista, 2163 – Consolação',
    neighborhood: 'Consolação',
    coordinate: { latitude: -23.5575, longitude: -46.6608 },
    arrivalTip: 'Acessos com elevador nos dois lados da Av. Paulista.',
  },
  {
    id: 'hc',
    name: 'Hospital das Clínicas – FMUSP',
    shortName: 'Hospital das Clínicas',
    address: 'Av. Dr. Enéas Carvalho de Aguiar, 255 – Cerqueira César',
    neighborhood: 'Cerqueira César',
    coordinate: { latitude: -23.5573, longitude: -46.6696 },
    arrivalTip: 'Portaria principal com rampa e balcão de informações à direita.',
  },
  {
    id: 'masp',
    name: 'MASP – Museu de Arte de São Paulo',
    shortName: 'MASP',
    address: 'Av. Paulista, 1578 – Bela Vista',
    neighborhood: 'Bela Vista',
    coordinate: { latitude: -23.5614, longitude: -46.6559 },
    arrivalTip: 'Entrada pelo vão livre; elevador de acesso ao lado da bilheteria.',
  },
  {
    id: 'ccsp',
    name: 'Centro Cultural São Paulo',
    shortName: 'CCSP',
    address: 'Rua Vergueiro, 1000 – Paraíso',
    neighborhood: 'Paraíso',
    coordinate: { latitude: -23.5712, longitude: -46.6395 },
    arrivalTip: 'Entrada principal em nível, com rampa até o piso das bibliotecas.',
  },
  {
    id: 'theatro',
    name: 'Theatro Municipal de São Paulo',
    shortName: 'Theatro Municipal',
    address: 'Praça Ramos de Azevedo, s/n – República',
    neighborhood: 'República',
    coordinate: { latitude: -23.5452, longitude: -46.6386 },
    arrivalTip: 'Entrada acessível pela lateral, com rampa e elevador.',
  },
  {
    id: 'se',
    name: 'Catedral da Sé',
    shortName: 'Catedral da Sé',
    address: 'Praça da Sé, s/n – Sé',
    neighborhood: 'Sé',
    coordinate: { latitude: -23.5503, longitude: -46.634 },
    arrivalTip: 'Rampa lateral à escadaria principal da catedral.',
  },
];

/** Índice por id para buscas O(1). */
export const PLACES_BY_ID: Record<string, Place> = PLACES.reduce<Record<string, Place>>(
  (acc, place) => {
    acc[place.id] = place;
    return acc;
  },
  {},
);
