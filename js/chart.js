const ageOrder = ['00-04', '05-14', '15-34', '35-59', '60-79', '80+']

function updateChart() { 
  console.log('updateChart called, county:', currentCountyId, 'Show:', {showCases, showRecoveries, showDeaths});
  if (!currentCountyId) return;
  
  let rows = [];
  
  if (currentCountyId === 'GERMANY') {
    // Filter using integer index comparison
    const allRows = Object.values(countyIndex).flat();
    rows = allRows.filter(r => r.dateIndex >= startIndex && r.dateIndex <= endIndex);
  } else {
    const dataIndex = currentDetailLevel === 'counties' ? countyIndex : stateIndex;
    rows = (dataIndex[currentCountyId] || []).filter(r => r.dateIndex >= startIndex && r.dateIndex <= endIndex);
  }
  const factor = useRelativeCount ? 100000 / currentPopulation : 1
  
  const agg = {}
  rows.forEach(r => { 
    const k = r.Altersgruppe + '_' + r.Geschlecht
    agg[k] ??= { Altersgruppe: r.Altersgruppe, Geschlecht: r.Geschlecht, Fall: 0, Genesen: 0, Tod: 0 }
    agg[k].Fall += +r.AnzahlFall || 0
    agg[k].Genesen += +r.AnzahlGenesen || 0
    agg[k].Tod += +r.AnzahlTodesfall || 0 
  })
  const data = Object.values(agg)
  const svg = d3.select('#barChart')
  svg.selectAll('*').remove()
  const w = 700, h = 500, m = { top: 20, left: 60, right: 20, bottom: 60 }
  svg.attr('viewBox', `0 0 ${w} ${h}`)
  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
  const ages = ageOrder.filter(a => data.some(d => d.Altersgruppe === a))
  const genders = [...new Set(data.map(d => d.Geschlecht))]
  const x0 = d3.scaleBand().domain(ages).range([0, w - 80]).padding(.2)
  const x1 = d3.scaleBand().domain(genders).range([0, x0.bandwidth()])
  
  // Calculate y domain based on visible dimensions
  let yMin = 0;
  let yMax = 0;
  
  // Deaths are negative (below 0)
  if (showDeaths) {
    const maxDeaths = d3.max(data, d => d.Tod * factor) || 0;
    yMin = Math.min(yMin, -maxDeaths);
  }
  
  // Cases and recoveries are positive (above 0)
  if (showCases) {
    const maxCases = d3.max(data, d => d.Fall * factor) || 0;
    yMax = Math.max(yMax, maxCases);
  }
  
  if (showRecoveries) {
    const maxRecoveries = d3.max(data, d => (d.Fall + d.Genesen) * factor) || 0;
    yMax = Math.max(yMax, maxRecoveries);
  }
  
  // Add buffer
  yMin = yMin * 1.05;
  yMax = yMax * 1.05;
  
  // If only positive values, start y at 0
  if (yMin >= 0) yMin = 0;
  
  const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([h - 80, 0])
  
  const bars = g.selectAll('g').data(data).enter().append('g')
    .attr('transform', d => `translate(${x0(d.Altersgruppe) + x1(d.Geschlecht)},0)`)
    .on('mouseover', function(event, d) {
      const tooltip = document.getElementById('tooltip');
      const formatValue = (val, useRelative) => {
        if (useRelative) {
          return val.toFixed(2);
        }
        return val.toLocaleString();
      };
      
      let html = `<strong>${d.Altersgruppe} (${d.Geschlecht})</strong>`;
      
      if (showDeaths) {
        html += `<div class="data-row"><span class="data-label">Todesfälle:</span><span class="data-value">${formatValue(d.Tod * factor, useRelativeCount)}</span></div>`;
      }
      if (showCases) {
        html += `<div class="data-row"><span class="data-label">Fälle:</span><span class="data-value">${formatValue(d.Fall * factor, useRelativeCount)}</span></div>`;
      }
      if (showRecoveries) {
        html += `<div class="data-row"><span class="data-label">Genesene:</span><span class="data-value">${formatValue(d.Genesen * factor, useRelativeCount)}</span></div>`;
      }
      
      const total = (showCases ? d.Fall : 0) + (showRecoveries ? d.Genesen : 0) + (showDeaths ? d.Tod : 0);
      html += `<div class="data-row"><span class="data-label">Gesamt:</span><span class="data-value">${formatValue(total * factor, useRelativeCount)}${useRelativeCount ? ' pro 100.000' : ''}</span></div>`;
      
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      tooltip.style.left = (event.pageX + 10) + 'px';
      tooltip.style.top = (event.pageY + 10) + 'px';
    })
    .on('mouseout', function() {
      document.getElementById('tooltip').style.display = 'none';
    });
  
  // Render bars in correct stacking order
  // Deaths at bottom (negative values), then cases, then recoveries at top
  
  // Deaths bar
  if (showDeaths) {
    bars.append('rect')
      .attr('width', x1.bandwidth())
      .attr('y', d => y(0))
      .attr('height', d => y(-d.Tod * factor) - y(0))
      .attr('fill', '#ffbbbb')
      .attr('stroke', '#fff')
      .attr('stroke-width', '1px');
  }
  
  // Cases bar
  if (showCases) {
    bars.append('rect')
      .attr('width', x1.bandwidth())
      .attr('y', d => y(d.Fall * factor))
      .attr('height', d => y(0) - y(d.Fall * factor))
      .attr('fill', '#a3dbf3')
      .attr('stroke', '#fff')
      .attr('stroke-width', '1px');
  }
  
  // Recoveries bar
  if (showRecoveries) {
    bars.append('rect')
      .attr('width', x1.bandwidth())
      .attr('y', d => y((d.Fall + d.Genesen) * factor))
      .attr('height', d => y(d.Fall * factor) - y((d.Fall + d.Genesen) * factor))
      .attr('fill', '#89e59a')
      .attr('stroke', '#fff')
      .attr('stroke-width', '1px');
  }
  
  const xAxis = g.append('g')
    .attr('transform', `translate(0,${h - 80})`)
    .call(d3.axisBottom(x0))
    .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#404e5c')
      .style('font-family', 'Inter, sans-serif');
  
  const yAxis = g.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#404e5c')
      .style('font-family', 'Inter, sans-serif');
  
  const gridLines = g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y)
      .tickSize(-(w - 80))
      .tickFormat('')
      .ticks(5))
    .selectAll('line')
      .style('stroke', '#e9ecef')
      .style('stroke-width', '1px')
      .style('stroke-dasharray', '2,2');
}
