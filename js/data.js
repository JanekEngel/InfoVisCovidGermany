let rawRows = [], currentCountyId = null, currentMetric = 'AnzahlFall', dateValues = []; 
let countyIndex = {};
let stateIndex = {};
let germanyData = [];
let countyDateAggregates = {}; // Pre-aggregated: {countyId: [{dateIndex, cases, deaths, recoveries}, ...]}
let stateDateAggregates = {};  // Pre-aggregated: {stateId: [{dateIndex, cases, deaths, recoveries}, ...]}
let currentDetailLevel = 'counties';
let useRelativeCount = false;
let currentPopulation = 1;
let showCases = true;
let showRecoveries = true;
let showDeaths = true;
let showGender = true;
let showAgeGroups = true;
const today = new Date();

function normalizeId(id) {
  const s = String(id);
  return s.padStart(5, '0');
}

function aggregateToStates() {
  // Already built in loadCSV, just return the cached version
  return stateIndex;
}

function aggregateToGermany() {
  // Already built in loadCSV, just return the cached version
  return germanyData;
}

async function loadCSV(path=`../Bereinigte_Daten_${today.getFullYear()}_${String(today.getMonth()+1).padStart(2,'0')}_${String(today.getDate()).padStart(2,'0')}.csv`) { 
  return new Promise(r => Papa.parse(path, { 
    download: true, 
    header: true, 
    dynamicTyping: true, 
    complete: x => { 
      rawRows = x.data.filter(d => d.IdLandkreis); 
      // Build dateValues array first
      dateValues = [...new Set(rawRows.map(d => d.Refdatum))].sort();
      // Create a date-to-index map for O(1) lookup
      const dateToIndex = new Map();
      dateValues.forEach((date, idx) => dateToIndex.set(date, idx));
      
      // Add dateIndex to each row and build pre-aggregated structures
      rawRows.forEach(row => { 
        const id = normalizeId(row.IdLandkreis); 
        row.dateIndex = dateToIndex.get(row.Refdatum);
        (countyIndex[id] ??= []).push(row); 
        
        // Aggregate by county and date
        if (!countyDateAggregates[id]) {
          countyDateAggregates[id] = new Array(dateValues.length).fill().map(() => ({cases: 0, deaths: 0, recoveries: 0}));
        }
        const idx = row.dateIndex;
        if (idx >= 0 && idx < countyDateAggregates[id].length) {
          countyDateAggregates[id][idx].cases += Number(row.AnzahlFall) || 0;
          countyDateAggregates[id][idx].deaths += Number(row.AnzahlTodesfall) || 0;
          countyDateAggregates[id][idx].recoveries += Number(row.AnzahlGenesen) || 0;
        }
      }); 
      
      // Build state aggregates from county aggregates
      Object.keys(countyIndex).forEach(countyId => {
        const normalized = normalizeId(countyId);
        const stateId = normalized.substring(0, 2);
        if (!stateDateAggregates[stateId]) {
          stateDateAggregates[stateId] = new Array(dateValues.length).fill().map(() => ({cases: 0, deaths: 0, recoveries: 0}));
        }
        const countyAgg = countyDateAggregates[countyId];
        if (countyAgg) {
          countyAgg.forEach((dayData, idx) => {
            if (stateDateAggregates[stateId][idx]) {
              stateDateAggregates[stateId][idx].cases += dayData.cases;
              stateDateAggregates[stateId][idx].deaths += dayData.deaths;
              stateDateAggregates[stateId][idx].recoveries += dayData.recoveries;
            }
          });
        }
      });
      
      // Also build stateIndex and germanyData from rawRows
      Object.entries(countyIndex).forEach(([countyId, records]) => {
        const normalized = normalizeId(countyId);
        const stateId = normalized.substring(0, 2);
        if (!stateIndex[stateId]) stateIndex[stateId] = [];
        stateIndex[stateId].push(...records);
      });
      germanyData = rawRows.slice();
      
      r(); 
    } 
  })); 
}