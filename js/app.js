
async function init(){
 await loadCSV();
 loadGeoJSON();
 const dates=[...new Set(rawRows.map(r=>String(r.Refdatum).slice(0,10)))].sort();
 startDate.value=dates[0];
 endDate.value=dates[dates.length-1];
 startDate.onchange=()=>{if(currentCountyId) updateChart();};
 endDate.onchange=()=>{if(currentCountyId) updateChart();};
 metricSelect.onchange=e=>{currentMetric=e.target.value;};
 window.addEventListener('resize',()=>{if(currentCountyId) updateChart();});
}
init();
