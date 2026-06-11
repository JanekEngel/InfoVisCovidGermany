const ageOrder = ['00-04', '05-14', '15-34', '35-59', '60-79', '80+']
function updateChart() { if (!currentCountyId) return
const rows = (countyIndex[currentCountyId] || []).filter(r => r.Refdatum >= startDate.value && r.Refdatum <= endDate.value)
const agg = {}
rows.forEach(r => { const k = r.Altersgruppe + '_' + r.Geschlecht
agg[k] ??= { Altersgruppe: r.Altersgruppe, Geschlecht: r.Geschlecht, Fall: 0, Genesen: 0, Tod: 0 }
agg[k].Fall += +r.AnzahlFall || 0
agg[k].Genesen += +r.AnzahlGenesen || 0
agg[k].Tod += +r.AnzahlTodesfall || 0 })
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
const y = d3.scaleLinear().domain([-d3.max(data, d => d.Tod) || 1, d3.max(data, d => d.Fall + d.Genesen) || 1]).nice().range([h - 80, 0])
const bars = g.selectAll('g').data(data).enter().append('g').attr('transform', d => `translate(${x0(d.Altersgruppe) + x1(d.Geschlecht)},0)`)
bars.append('rect').attr('width', x1.bandwidth()).attr('y', d => y(0)).attr('height', d => y(-d.Tod) - y(0)).attr('fill', '#ffbbbb')
bars.append('rect').attr('width', x1.bandwidth()).attr('y', d => y(d.Fall)).attr('height', d => y(0) - y(d.Fall)).attr('fill', '#a3dbf3')
bars.append('rect').attr('width', x1.bandwidth()).attr('y', d => y(d.Fall + d.Genesen)).attr('height', d => y(d.Fall) - y(d.Fall + d.Genesen)).attr('fill', '#89e59a')
g.append('g').attr('transform', `translate(0,${y(0)})`).call(d3.axisBottom(x0))
g.append('g').call(d3.axisLeft(y))
}