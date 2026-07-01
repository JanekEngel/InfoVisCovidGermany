let startIndex = 0;
let endIndex = 0;

async function init() {
  await loadCSV();
  stateIndex = aggregateToStates();
  germanyData = aggregateToGermany();
  
  loadGeoJSON();
  
  currentCountyId = 'GERMANY';
  
  // Slider state variables
  let handle1, handle2, selection, rangeHandle, track, svg, xScale, container, handleSize, height;
  let updatingFromSlider = false;

  // Define updateHandles here so it's accessible to syncDatePicker
  function updateHandles() {
    handle1.attr('cx', xScale(startIndex));
    handle2.attr('cx', xScale(endIndex));
    selection.attr('x', xScale(startIndex))
      .attr('width', xScale(endIndex) - xScale(startIndex));
    rangeHandle.attr('x', xScale(startIndex) + (xScale(endIndex) - xScale(startIndex)) / 2 - handleSize / 2)
      .attr('y', height / 2 - handleSize / 2);
    
    updatingFromSlider = true;
    document.getElementById('startDate').value = dateValues[startIndex];
    document.getElementById('endDate').value = dateValues[endIndex];
    updatingFromSlider = false;
    
    updateMapColors();
    if (currentCountyId) updateChart();
  }

  // Define createRangeSlider inside init so it shares scope
  function createRangeSlider() {
    container = d3.select('#rangeSlider');
    const width = container.node().offsetWidth;
    height = 80;
    handleSize = 20;
    const handleRadius = handleSize / 2; // 10px
    
    svg = container.append('svg')
      .attr('width', width)
      .attr('height', height);
    
    xScale = d3.scaleLinear()
      .domain([0, dateValues.length - 1])
      .range([handleRadius, width - handleRadius]);
    
    const trackHeight = 6;
    
    track = svg.append('line')
      .attr('class', 'range-slider-track')
      .attr('x1', handleRadius)
      .attr('y1', height / 2)
      .attr('x2', width - handleRadius)
      .attr('y2', height / 2)
      .attr('stroke-width', trackHeight);
    
    selection = svg.append('rect')
      .attr('class', 'range-slider-selection')
      .attr('y', height / 2 - trackHeight / 2)
      .attr('height', trackHeight)
      .attr('fill-opacity', 0.3);
    
    handle1 = svg.append('circle')
      .attr('class', 'range-slider-handle')
      .attr('r', handleSize / 2)
      .attr('cy', height / 2)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);
    
    handle2 = svg.append('circle')
      .attr('class', 'range-slider-handle')
      .attr('r', handleSize / 2)
      .attr('cy', height / 2)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    rangeHandle = svg.append('rect')
      .attr('class', 'range-slider-range-handle')
      .attr('width', handleSize)
      .attr('height', handleSize)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill-opacity', 0.5)
      .attr('stroke', '#000022')
      .attr('stroke-width', 1)
      .attr('cursor', 'move');
    
    startIndex = 0;
    endIndex = dateValues.length - 1;
    
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
    
    function makeDraggableRange(handle) {
      let dragStartX, startIndexStart, endIndexStart;
      
      handle.call(d3.drag()
        .on('start', function(event) {
          handle.raise();
          dragStartX = event.x;
          startIndexStart = startIndex;
          endIndexStart = endIndex;
        })
        .on('drag', function(event) {
          const dx = xScale.invert(event.x) - xScale.invert(dragStartX);
          const range = endIndexStart - startIndexStart;
          let newStartIndex = Math.round(startIndexStart + dx);
          let newEndIndex = Math.round(endIndexStart + dx);
          
          newStartIndex = Math.max(0, Math.min(dateValues.length - 1 - range, newStartIndex));
          newEndIndex = Math.max(range, Math.min(dateValues.length - 1, newEndIndex));
          
          startIndex = newStartIndex;
          endIndex = newEndIndex;
          updateHandles();
        }));
    }
    
    makeDraggable(handle1, true);
    makeDraggable(handle2, false);
    makeDraggableRange(rangeHandle);
    updateHandles();
    
    window.addEventListener('resize', function() {
      const newWidth = container.node().offsetWidth;
      svg.attr('width', newWidth);
      xScale.range([handleRadius, newWidth - handleRadius]);
      track.attr('x1', handleRadius).attr('x2', newWidth - handleRadius);
      updateHandles();
    });
  }
  
  // Call createRangeSlider to set up the slider
  createRangeSlider();
  
  const metricSelect = document.getElementById('metricSelect');
  const header = document.getElementById('header');
  const rangeSlider = document.getElementById('rangeSlider');
  
  function updateMetricColors() {
    const metricClass = 'metric-' + (currentMetric === 'AnzahlFall' ? 'cases' : 
                                  currentMetric === 'AnzahlGenesen' ? 'recovered' : 'deaths');
    
    header.className = metricClass;
    rangeSlider.className = metricClass;
    
    // Update date input focus colors based on metric
    document.getElementById('startDate').className = metricClass;
    document.getElementById('endDate').className = metricClass;
  }
  
  metricSelect.onchange = e => {
    currentMetric = e.target.value;
    updateMetricColors();
    updateMapColors();
  };
  
  updateMetricColors();
  
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
  // Initialize date inputs with current metric class
  startDateInput.className = 'metric-' + (currentMetric === 'AnzahlFall' ? 'cases' : 
                                           currentMetric === 'AnzahlGenesen' ? 'recovered' : 'deaths');
  endDateInput.className = startDateInput.className;

  // Create chart toggle buttons
  const chartControls = document.getElementById('chartControls');
  
  function createChartToggles() {
    // Clear existing toggles
    chartControls.innerHTML = '';
    
    // Create filter group (left)
    const filterGroup = document.createElement('div');
    filterGroup.className = 'toggle-group';
    
    const filterLabel = document.createElement('span');
    filterLabel.className = 'toggle-group-label';
    filterLabel.textContent = 'Filtern:';
    filterGroup.appendChild(filterLabel);
    
    const toggles = [
      { id: 'toggleCases', label: 'Fälle', metric: 'cases', ref: () => showCases },
      { id: 'toggleRecoveries', label: 'Genesene', metric: 'recovered', ref: () => showRecoveries },
      { id: 'toggleDeaths', label: 'Todesfälle', metric: 'deaths', ref: () => showDeaths }
    ];
    
    // Helper to check if at least one is shown
    const anyShown = () => showCases || showRecoveries || showDeaths;
    
    toggles.forEach((toggle, i) => {
      const btn = document.createElement('button');
      btn.id = toggle.id;
      btn.className = `chart-toggle ${toggle.metric} active`;
      btn.textContent = toggle.label;
      btn.onclick = () => {
        // Toggle the state
        if (i === 0) showCases = !showCases;
        else if (i === 1) showRecoveries = !showRecoveries;
        else if (i === 2) showDeaths = !showDeaths;
        
        btn.classList.toggle('active');
        
        // Ensure at least one dimension is shown
        if (!anyShown()) {
          // If all are hidden, re-enable the one that was just clicked
          if (i === 0) showCases = true;
          else if (i === 1) showRecoveries = true;
          else if (i === 2) showDeaths = true;
          btn.classList.add('active');
        }
        console.log('Toggling chart dimension. States:', {showCases, showRecoveries, showDeaths});
        console.log('Current county:', currentCountyId);
        if (currentCountyId) updateChart();
      };
      filterGroup.appendChild(btn);
    });
    chartControls.appendChild(filterGroup);
    
    // Create grouping group (right)
    const groupGroup = document.createElement('div');
    groupGroup.className = 'toggle-group';
    
    const groupLabel = document.createElement('span');
    groupLabel.className = 'toggle-group-label';
    groupLabel.textContent = 'Gruppieren:';
    groupGroup.appendChild(groupLabel);

    // Add gender toggle
    const genderBtn = document.createElement('button');
    genderBtn.id = 'toggleGender';
    genderBtn.className = 'chart-toggle active';
    genderBtn.textContent = 'Nach Geschlecht';
    genderBtn.onclick = () => {
      showGender = !showGender;
      genderBtn.classList.toggle('active');
      if (currentCountyId) updateChart();
    };
    groupGroup.appendChild(genderBtn);

    // Add age groups toggle
    const ageGroupsBtn = document.createElement('button');
    ageGroupsBtn.id = 'toggleAgeGroups';
    ageGroupsBtn.className = 'chart-toggle active';
    ageGroupsBtn.textContent = 'Nach Altersgruppen';
    ageGroupsBtn.onclick = () => {
      showAgeGroups = !showAgeGroups;
      ageGroupsBtn.classList.toggle('active');
      if (currentCountyId) updateChart();
    };
    groupGroup.appendChild(ageGroupsBtn);
    chartControls.appendChild(groupGroup);
  }
  
  // Initialize toggles
  createChartToggles();

  function syncDatePicker(dateInput, isStart) {
    const selectedDate = dateInput.value;
    let newIndex = dateValues.indexOf(selectedDate);
    
    // If exact date not found, find the closest date that exists in data
    if (newIndex === -1) {
      newIndex = dateValues.findIndex(d => d >= selectedDate);
      if (newIndex === -1) {
        newIndex = dateValues.length - 1;
      } else if (newIndex > 0 && dateValues[newIndex] > selectedDate) {
        // Choose the closest: newIndex or newIndex-1
        // Use numeric comparison by converting to timestamps
        const prevTs = new Date(dateValues[newIndex - 1]).getTime();
        const nextTs = new Date(dateValues[newIndex]).getTime();
        const selectedTs = new Date(selectedDate).getTime();
        if (Math.abs(selectedTs - prevTs) < Math.abs(nextTs - selectedTs)) {
          newIndex = newIndex - 1;
        }
      }
      // Update the date picker to the closest valid date
      dateInput.value = dateValues[newIndex];
    }
    
    if (isStart) {
      if (newIndex > endIndex) {
        startIndex = endIndex;
        startDateInput.value = dateValues[endIndex];
      } else {
        startIndex = newIndex;
      }
    } else {
      if (newIndex < startIndex) {
        endIndex = startIndex;
        endDateInput.value = dateValues[startIndex];
      } else {
        endIndex = newIndex;
      }
    }
    updateHandles();
    updateMapColors();
    if (currentCountyId) updateChart();
  }
  
  startDateInput.addEventListener('change', () => {
    if (updatingFromSlider) return;
    syncDatePicker(startDateInput, true);
  });
  
  startDateInput.addEventListener('blur', () => {
    if (updatingFromSlider) return;
    syncDatePicker(startDateInput, true);
  });
  
  endDateInput.addEventListener('change', () => {
    if (updatingFromSlider) return;
    syncDatePicker(endDateInput, false);
  });
  
  endDateInput.addEventListener('blur', () => {
    if (updatingFromSlider) return;
    syncDatePicker(endDateInput, false);
  });
  
  document.getElementById('loading').style.display = 'none';
}

init();
