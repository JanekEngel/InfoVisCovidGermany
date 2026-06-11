let startIndex = 0;
let endIndex = 0;

async function init() {
  await loadCSV();
  stateIndex = aggregateToStates();
  loadGeoJSON();
  createRangeSlider();
  
  const metricSelect = document.getElementById('metricSelect');
  metricSelect.onchange = e => {
    currentMetric = e.target.value;
    updateMapColors();
  };
  
  document.getElementById('detailSelect').onchange = e => {
    currentDetailLevel = e.target.value;
    loadGeoJSON();
    updateMapColors();
  };
  
  document.getElementById('countTypeSelect').onchange = e => {
    useRelativeCount = e.target.value === 'relative';
    updateMapColors();
    if (currentCountyId) updateChart();
  };
  
  // Sync date inputs with slider
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  startDateInput.value = dateValues[0];
  endDateInput.value = dateValues[dateValues.length - 1];
  
  startDateInput.addEventListener('change', () => {
    const newStartIndex = dateValues.indexOf(startDateInput.value);
    if (newStartIndex !== -1) {
      startIndex = newStartIndex;
      if (startIndex > endIndex) endIndex = startIndex;
      updateHandles();
      updateMapColors();
      if (currentCountyId) updateChart();
    }
  });
  
  endDateInput.addEventListener('change', () => {
    const newEndIndex = dateValues.indexOf(endDateInput.value);
    if (newEndIndex !== -1) {
      endIndex = newEndIndex;
      if (endIndex < startIndex) startIndex = endIndex;
      updateHandles();
      updateMapColors();
      if (currentCountyId) updateChart();
    }
  });
  
  document.getElementById('loading').style.display = 'none';
}

function createRangeSlider() {
  const container = d3.select('#rangeSlider');
  const width = container.node().offsetWidth;
  const height = 40;
  
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);
  
  const xScale = d3.scaleLinear()
    .domain([0, dateValues.length - 1])
    .range([0, width])
    .nice();
  
  const trackHeight = 6;
  const handleSize = 16;
  
  const track = svg.append('line')
    .attr('class', 'range-slider-track')
    .attr('x1', 0)
    .attr('y1', height / 2)
    .attr('x2', width)
    .attr('y2', height / 2)
    .attr('stroke', '#ddd')
    .attr('stroke-width', trackHeight);
  
  const selection = svg.append('rect')
    .attr('class', 'range-slider-selection')
    .attr('y', height / 2 - trackHeight / 2)
    .attr('height', trackHeight)
    .attr('fill', '#a3dbf3')
    .attr('fill-opacity', 0.5);
  
  const handle1 = svg.append('circle')
    .attr('class', 'range-slider-handle')
    .attr('r', handleSize / 2)
    .attr('cy', height / 2);
  
  const handle2 = svg.append('circle')
    .attr('class', 'range-slider-handle')
    .attr('r', handleSize / 2)
    .attr('cy', height / 2);
  
  startIndex = 0;
  endIndex = dateValues.length - 1;
  
  function updateHandles() {
    handle1.attr('cx', xScale(startIndex));
    handle2.attr('cx', xScale(endIndex));
    selection.attr('x', xScale(startIndex))
      .attr('width', xScale(endIndex) - xScale(startIndex));
    document.getElementById('startDate').value = dateValues[startIndex];
    document.getElementById('endDate').value = dateValues[endIndex];
    updateMapColors();
    if (currentCountyId) updateChart();
  }
  
  function makeDraggable(handle, isStart) {
    handle.call(d3.drag()
      .on('start', function() {
        handle.raise();
      })
      .on('drag', function(event) {
        let newIndex = Math.round(xScale.invert(event.x));
        newIndex = Math.max(0, Math.min(dateValues.length - 1, newIndex));
        if (isStart) {
          startIndex = Math.min(newIndex, endIndex);
        } else {
          endIndex = Math.max(newIndex, startIndex);
        }
        updateHandles();
      }));
  }
  
  makeDraggable(handle1, true);
  makeDraggable(handle2, false);
  updateHandles();
  
  window.addEventListener('resize', function() {
    const newWidth = container.node().offsetWidth;
    svg.attr('width', newWidth);
    xScale.range([0, newWidth]);
    track.attr('x2', newWidth);
    updateHandles();
  });
}

init();