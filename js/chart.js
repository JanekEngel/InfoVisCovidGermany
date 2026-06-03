
const ageOrder=['00-04','05-14','15-34','35-59','60-79','80+'];
const genderOrder=['M','W','unbekannt'];

function buildChartData(){
 if(!currentCountyId) return [];
 const s=startDate.value,e=endDate.value;
 const out={};
 rawRows.forEach(r=>{
  if(String(r.IdLandkreis)!==String(currentCountyId)) return;
  if(r.Refdatum<s||r.Refdatum>e) return;
  const k=r.Altersgruppe+'_'+r.Geschlecht;
  if(!out[k]) out[k]={Altersgruppe:r.Altersgruppe,Geschlecht:r.Geschlecht,Fall:0,Genesen:0,Tod:0};
  out[k].Fall+=+r.AnzahlFall||0;
  out[k].Genesen+=+r.AnzahlGenesen||0;
  out[k].Tod+=+r.AnzahlTodesfall||0;
 });
 return Object.values(out);
}

function updateChart(){
 const data=buildChartData();
 const svg=d3.select('#barChart'); svg.selectAll('*').remove();
 const w=document.getElementById('chartContainer').clientWidth,h=document.getElementById('chartContainer').clientHeight;
 const m={t:20,r:20,b:60,l:60},iw=w-m.l-m.r,ih=h-m.t-m.b;
 const g=svg.attr('width',w).attr('height',h).append('g').attr('transform',`translate(${m.l},${m.t})`);
 const ages=ageOrder.filter(a=>data.some(d=>d.Altersgruppe===a));
 const x0=d3.scaleBand().domain(ages).range([0,iw]).padding(.25);
 const x1=d3.scaleBand().domain(genderOrder).range([0,x0.bandwidth()]);
 const maxP=d3.max(data,d=>d.Fall+d.Genesen)||1,maxN=d3.max(data,d=>d.Tod)||1;
 const y=d3.scaleLinear().domain([-maxN,maxP]).nice().range([ih,0]);
 g.append('line').attr('x1',0).attr('x2',iw).attr('y1',y(0)).attr('y2',y(0)).attr('stroke','black');
 const tip=document.getElementById('tooltip');
 const bars=g.selectAll('.b').data(data).enter().append('g').attr('transform',d=>`translate(${x0(d.Altersgruppe)+x1(d.Geschlecht)},0)`);
 function tt(ev,d){tip.style.display='block';tip.style.left=(ev.pageX+10)+'px';tip.style.top=(ev.pageY+10)+'px';tip.innerHTML=`<b>${d.Altersgruppe}</b><br>${d.Geschlecht}<br>Fälle:${d.Fall}<br>Genesen:${d.Genesen}<br>Todesfälle:${d.Tod}`;};
 function hide(){tip.style.display='none';}
 bars.append('rect').attr('width',x1.bandwidth()).attr('y',y(0)).attr('height',d=>y(-d.Tod)-y(0)).attr('fill','#ffbbbb').attr("stroke", "black").attr("stroke-width", 1).on('mousemove',tt).on('mouseout',hide);
 bars.append('rect').attr('width',x1.bandwidth()).attr('y',d=>y(d.Fall)).attr('height',d=>y(0)-y(d.Fall)).attr('fill','#a3dbf3').attr("stroke", "black").attr("stroke-width", 1).on('mousemove',tt).on('mouseout',hide);
 bars.append('rect').attr('width',x1.bandwidth()).attr('y',d=>y(d.Fall+d.Genesen)).attr('height',d=>y(d.Fall)-y(d.Fall+d.Genesen)).attr('fill','#89e59a').attr("stroke", "black").attr("stroke-width", 1).on('mousemove',tt).on('mouseout',hide);
 g.append('g').attr('transform',`translate(0,${y(0)})`).call(d3.axisBottom(x0));
 g.append('g').call(d3.axisLeft(y));
}
