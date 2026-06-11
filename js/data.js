let rawRows = [], currentCountyId = null, currentMetric = 'AnzahlFall', dateValues = []; 
let countyIndex = {};
let stateIndex = {};
let currentDetailLevel = 'counties';
let useRelativeCount = false;
let currentPopulation = 1;

function normalizeId(id) {
  const s = String(id);
  return s.padStart(5, '0');
}

function aggregateToStates() {
  const result = {};
  Object.entries(countyIndex).forEach(([countyId, records]) => {
    const normalized = normalizeId(countyId);
    const stateId = normalized.substring(0, 2);
    if (!result[stateId]) result[stateId] = [];
    result[stateId].push(...records);
  });
  return result;
}

async function loadCSV(path = '../Bereinigte_Daten_2026_06_11.csv') { 
  return new Promise(r => Papa.parse(path, { 
    download: true, 
    header: true, 
    dynamicTyping: true, 
    complete: x => { 
      rawRows = x.data.filter(d => d.IdLandkreis); 
      rawRows.forEach(row => { 
        const id = normalizeId(row.IdLandkreis); 
        (countyIndex[id] ??= []).push(row); 
      }); 
      dateValues = [...new Set(rawRows.map(d => d.Refdatum))].sort();
      r(); 
    } 
  })); 
}