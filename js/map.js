
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
  return String(v).replace(/^0+/,'') || '0';
}

function metricColor(t){
 const c=currentMetric==='AnzahlFall'?[163,219,243]:
         currentMetric==='AnzahlGenesen'?[137,229,154]:
         [255,187,187];
 return `rgba(${c[0]},${c[1]},${c[2]},${0.2+0.8*t})`;
}

function updateMapColors(){
 if(!geoLayer) return;

 let max=1;

 geoLayer.eachLayer(layer=>{
   const ags = normalizeAGS(layer.feature.properties.AGS);
   let value=0;

   (countyIndex[ags]||[]).forEach(r=>{
      if(r.Refdatum>=startDate.value && r.Refdatum<=endDate.value){
         value += Number(r[currentMetric]) || 0;
      }
   });

   layer._value=value;
   max=Math.max(max,value);
 });

 geoLayer.eachLayer(layer=>{
   layer.setStyle({
      fillColor:metricColor(layer._value/max),
      fillOpacity:1,
      color:"#666",
      weight: layer===selectedLayer ? 3 : 0.5
   });
 });
}

function loadGeoJSON(){
 fetch('../GEOJson/VG250_KRS.json').then(r=>r.json()).then(g=>{
  geoLayer=L.geoJSON(g,{
   style:f=>({weight:1,color:'#000'}),
   onEachFeature:(feature,layer)=>{
    layer.on('click',()=>{
      selectedLayer=layer;
      currentCountyId=normalizeAGS(feature.properties.AGS);
      document.getElementById('selectedCounty').textContent=feature.properties.GEN;
      document.getElementById('population').textContent='Einwohner: '+(feature.properties.EWZ||'n/a');
      updateChart();
      updateMapColors();
    });
   }
  }).addTo(map);
  updateMapColors()
  map.fitBounds(geoLayer.getBounds());
  })
}
