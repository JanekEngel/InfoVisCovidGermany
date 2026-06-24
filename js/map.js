
// WICHTIGE FIXES:
// - AGS führende Nullen ignorieren
// - kein Panning
// - kein Zoom
// - kein Auto-Zoom auf Landkreis

const map = L.map('map',{
  dragging:false,
  touchZoom:false,
  scrollWheelZoom:false,
  doubleClickZoom:false,
  boxZoom:false,
  keyboard:false,
  zoomControl:false
});

let geoLayer, selectedLayer;

function normalizeAGS(v){
  const s = String(v);
  return s.length <= 2 ? s.padStart(2, '0') : s.padStart(5, '0');
}

function getColorScale() {
  if (currentMetric === 'AnzahlFall') {
    return d3.scaleLinear().domain([0, 0.5, 1]).range(['#ffffff', '#a3dbf3', '#00008b']);
  } else if (currentMetric === 'AnzahlGenesen') {
    return d3.scaleLinear().domain([0, 0.5, 1]).range(['#ffffff', '#89e59a', '#2d5a3d']);
  } else {
    return d3.scaleLinear().domain([0, 0.5, 1]).range(['#ffffff', '#ffbbbb', '#cc0000']);
  }
}

function metricColor(t) {
  const colorScale = getColorScale();
  return colorScale(t);
}

function updateMapColors(){
 if(!geoLayer) return;

 const startDateEl = document.getElementById('startDate');
 const endDateEl = document.getElementById('endDate');
 let max=1;
 const dataIndex = currentDetailLevel === 'counties' ? countyIndex : stateIndex;

 geoLayer.eachLayer(layer=>{
   const rawAgs = layer.feature.properties.AGS;
   const ags = normalizeAGS(rawAgs);
   const layerEWZ = layer.feature.properties.EWZ || 1;
   let cases = 0, recovered = 0, deaths = 0;
   let metricValue = 0;

   (dataIndex[ags]||[]).forEach(r=>{
      if(r.Refdatum>=startDateEl.value && r.Refdatum<=endDateEl.value){
         cases += Number(r.AnzahlFall) || 0;
         recovered += Number(r.AnzahlGenesen) || 0;
         deaths += Number(r.AnzahlTodesfall) || 0;
         metricValue += Number(r[currentMetric]) || 0;
      }
   });

   let value;
   
   if (useRelativeCount) {
     if (max > 100000) { max = 0 }
     if (currentMetric === 'AnzahlFall') {
       value = (cases / layerEWZ) * 100000;
     } else if (currentMetric === 'AnzahlGenesen') {
       value = (recovered / layerEWZ) * 100000;
     } else {
       value = (deaths / layerEWZ) * 100000;
     }
   } else {
     if (currentMetric === 'AnzahlFall') {
       value = cases;
     } else if (currentMetric === 'AnzahlGenesen') {
       value = recovered;
     } else {
       value = deaths;
     }
   }
   layer._value = value;
   layer._metricValue = metricValue;
   layer._cases = cases;
   layer._recovered = recovered;
   layer._deaths = deaths;
   layer._population = layerEWZ;
   max=Math.max(max, value);
 });

 geoLayer.eachLayer(layer=>{
   const normalizedValue = layer._value / max;
   layer.setStyle({
      fillColor:metricColor(normalizedValue),
      fillOpacity:1,
      color:"#666",
      weight: layer===selectedLayer ? 3 : 0.5
   });
   
   layer.off('mouseover');
   layer.off('mouseout');
   
   layer.on('mouseover', () => {
     const tooltip = document.getElementById('tooltip');
     const name = layer.feature.properties.GEN || layer.feature.properties.NAME || 'Unbekannt';
     const population = layer._population || 0;
     const cases = layer._cases || 0;
     const recovered = layer._recovered || 0;
     const deaths = layer._deaths || 0;
     
     const pro100kLabel = useRelativeCount ? ' pro 100.000' : '';
     
     const formatValue = (val, isRelative) => {
       if (isRelative) {
         return ((val / population) * 100000).toFixed(0);
       }
       return val.toLocaleString();
     };
     
     tooltip.innerHTML = `
       <strong>${name}</strong><br>
       Einw.: ${population.toLocaleString()}<br>
       Fälle: ${formatValue(cases, useRelativeCount)}${pro100kLabel}<br>
       Genesene: ${formatValue(recovered, useRelativeCount)}${pro100kLabel}<br>
       Todesfälle: ${formatValue(deaths, useRelativeCount)}${pro100kLabel}
     `;
     tooltip.style.display = 'block';
     tooltip.style.left = (event.pageX + 10) + 'px';
     tooltip.style.top = (event.pageY + 10) + 'px';
   });
   
   layer.on('mouseout', () => {
     document.getElementById('tooltip').style.display = 'none';
   });
 });

 updateLegend(max);
}

function updateLegend(max) {
  const legend = document.getElementById('legend');
  if (!legend) return;
  
  const colorScale = getColorScale();
  const steps = 5;
  let html = '<div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #000022;">';
  html += currentMetric === 'AnzahlFall' ? 'Fälle' : 
          currentMetric === 'AnzahlGenesen' ? 'Genesene' : 'Todesfälle';
  html += useRelativeCount ? ' (pro 100.000)' : '';
  html += '</div>';
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const value = Math.round(ratio * max);
    const color = colorScale(ratio);
    const displayValue = value.toLocaleString();
    html += `<div class="legend-row" style="display: flex; align-items: center; margin: 2px 0;">`;
    html += `<div class="legend-color-box" style="width: 20px; height: 15px; background-color: ${color}; border: 1px solid #e9ecef;"></div>`;
    html += `<span class="legend-label" style="margin-left: 8px; color: #404e5c;">${displayValue}</span>`;
    html += `</div>`;
  }
  
  legend.innerHTML = html;
}

function loadGeoJSON(){
 const geoFile = currentDetailLevel === 'counties' ? 'VG250_KRS.json' : 'VG250_LAN.json';
 fetch(`../GEOJson/${geoFile}`).then(r=>r.json()).then(g=>{
  if(geoLayer) map.removeLayer(geoLayer);
  
  if (!document.getElementById('legend')) {
    const legendContainer = document.createElement('div');
    legendContainer.id = 'legend';
    map.getContainer().appendChild(legendContainer);
  }
  
  let totalPopulation = 0;
  g.features.forEach(f => {
    totalPopulation += f.properties.EWZ || 0;
  });
  
  geoLayer=L.geoJSON(g,{
   style:f=>({weight:1,color:'#000'}),
   onEachFeature:(feature,layer)=>{
    layer.on('click',()=>{
      selectedLayer=layer;
      currentCountyId=normalizeAGS(feature.properties.AGS);
      currentPopulation = feature.properties.EWZ || 1;
      document.getElementById('selectedCounty').textContent=feature.properties.GEN;
      document.getElementById('population').textContent='Einwohner: '+currentPopulation;
      updateChart();
      updateMapColors();
    });
   }
  }).addTo(map);
  updateMapColors()
  
  if (currentCountyId === 'GERMANY' && currentPopulation === 1) {
    currentPopulation = totalPopulation || 83000000;
    document.getElementById('population').textContent = 'Einwohner: ' + currentPopulation.toLocaleString();
    updateChart();
  }
  
  map.setView([51.18, 10.45], 6);
  })
}
