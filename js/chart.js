const ageOrder = ['00-04', '05-14', '15-34', '35-59', '60-79', '80+']

function updateChart() { 
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
  
  // Aggregate data based on gender and age groups toggles, excluding null/empty age groups
  const agg = {};
  rows.forEach(r => { 
    // Skip rows with null, undefined, empty age groups, or the string "null"
    if (!r.Altersgruppe || r.Altersgruppe === 'null') return;
    
    const gender = !r.Geschlecht || r.Geschlecht === 'null' ? 'unbekannt' : r.Geschlecht;
    const key = showAgeGroups 
      ? (showGender ? r.Altersgruppe + '_' + gender : r.Altersgruppe)
      : (showGender ? gender : 'alle');
    
    if (!agg[key]) {
      agg[key] = { 
        Altersgruppe: showAgeGroups ? r.Altersgruppe : (showGender ? 'Alle Altersgruppen' : 'Gesamt'),
        Geschlecht: showAgeGroups ? (showGender ? gender : null) : (showGender ? gender : null),
        Fall: 0, 
        Genesen: 0, 
        Tod: 0 
      };
    }
    agg[key].Fall += +r.AnzahlFall || 0;
    agg[key].Genesen += +r.AnzahlGenesen || 0;
    agg[key].Tod += +r.AnzahlTodesfall || 0;
  });
  
  const data = Object.values(agg);
  const svg = d3.select('#barChart')
  svg.selectAll('*').remove()
  const w = 700, h = 500, m = { top: 20, left: 60, right: 20, bottom: 60 }
  svg.attr('viewBox', `0 0 ${w} ${h}`)
  const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`)
  
  // Calculate x scales based on gender and age groups toggles
  let x0, x1;
  if (showAgeGroups) {
    // Show age groups separately
    if (showGender) {
      // Original behavior: x0 for age groups, x1 for genders
      const ages = ageOrder.filter(a => data.some(d => d.Altersgruppe === a));
      const genders = [...new Set(data.map(d => !d.Geschlecht || d.Geschlecht === 'null' ? 'unbekannt' : d.Geschlecht))];
      x0 = d3.scaleBand().domain(ages).range([0, w - 80]).padding(.2);
      x1 = d3.scaleBand().domain(genders).range([0, x0.bandwidth()]);
    } else {
      // Aggregated by age only
      const ages = ageOrder.filter(a => data.some(d => d.Altersgruppe === a));
      x0 = d3.scaleBand().domain(ages).range([0, w - 80]).padding(.2);
      x1 = null;
    }
  } else {
    // Age groups are aggregated
    if (showGender) {
      // x0 for genders only
      const genders = [...new Set(data.map(d => !d.Geschlecht || d.Geschlecht === 'null' ? 'unbekannt' : d.Geschlecht))];
      x0 = d3.scaleBand().domain(genders).range([0, w - 80]).padding(.2);
      x1 = null;
    } else {
      // Single bar for everything
      x0 = d3.scaleBand().domain(['Gesamt']).range([0, w - 80]).padding(.2);
      x1 = null;
    }
  }
  
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
    .attr('transform', d => {
      const displayGender = !d.Geschlecht || d.Geschlecht === 'null' ? 'unbekannt' : d.Geschlecht;
      if (showAgeGroups && showGender) {
        return `translate(${x0(d.Altersgruppe) + x1(displayGender)},0)`;
      } else if (showAgeGroups) {
        return `translate(${x0(d.Altersgruppe)},0)`;
      } else if (showGender) {
        return `translate(${x0(displayGender)},0)`;
      } else {
        return `translate(${x0('Gesamt')},0)`;
      }
    })
    .on('mouseover', function(event, d) {
      const tooltip = document.getElementById('tooltip');
      const formatValue = (val, useRelative) => {
        if (useRelative) {
          return val.toFixed(2);
        }
        return val.toLocaleString();
      };
      
      const displayGender = !d.Geschlecht || d.Geschlecht === 'null' ? 'unbekannt' : d.Geschlecht;
      let html = `<strong>${d.Altersgruppe}${showGender && displayGender ? ' (' + displayGender + ')' : ''}</strong>`;
      
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
  
  // Calculate bar width based on current toggles
  const barWidth = () => {
    if (showAgeGroups && showGender) return x1.bandwidth();
    return x0.bandwidth();
  };

  // Deaths bar
  if (showDeaths) {
    bars.append('rect')
      .attr('width', barWidth())
      .attr('y', d => y(0))
      .attr('height', d => y(-d.Tod * factor) - y(0))
      .attr('fill', '#ffbbbb')
      .attr('stroke', '#fff')
      .attr('stroke-width', '1px');
  }
  
  // Cases bar
  if (showCases) {
    bars.append('rect')
      .attr('width', barWidth())
      .attr('y', d => y(d.Fall * factor))
      .attr('height', d => y(0) - y(d.Fall * factor))
      .attr('fill', '#a3dbf3')
      .attr('stroke', '#fff')
      .attr('stroke-width', '1px');
  }
  
  // Recoveries bar
  if (showRecoveries) {
    bars.append('rect')
      .attr('width', barWidth())
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
