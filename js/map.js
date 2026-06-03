
const map=L.map('map').setView([51.1,10.4],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let geoLayer,selectedLayer;

function metricValue(id){
 const s=startDate.value,e=endDate.value;
 let v=0;
 rawRows.forEach(r=>{
  if(String(r.IdLandkreis)!==String(id)) return;
  if(r.Refdatum<s||r.Refdatum>e) return;
  v+= +(r[currentMetric]||0);
 });
 return v;
}

function colorScale(v,max){
 const t=max? v/max : 0;
 const c=Math.round(255-(t*120));
 return `rgb(${c},220,255)`;
}

function loadGeoJSON(){
 fetch('../GEOJson/VG250_KRS.json').then(r=>r.json()).then(g=>{
  geoLayer=L.geoJSON(g,{
   style:f=>({weight:1,color:'#fff',fillOpacity:.8,fillColor:'#a3dbf3'}),
   onEachFeature:(feature,layer)=>{
    layer.on('click',()=>{
      if(selectedLayer) geoLayer.resetStyle(selectedLayer);
      selectedLayer=layer;
      layer.setStyle({weight:3,color:'#000'});
      currentCountyId=String(feature.properties.AGS);
      document.getElementById('selectedCounty').textContent=feature.properties.GEN;
      document.getElementById('population').textContent='Einwohner: '+(feature.properties.EWZ||'n/a');
      map.fitBounds(layer.getBounds());
      updateChart();
    });
   }
  }).addTo(map);
  map.fitBounds(geoLayer.getBounds());
 });
}
