
let rawRows=[];
let currentCountyId=null;
let currentMetric='AnzahlFall';
const today = new Date();

async function loadCSV(path=`../Bereinigte_Daten_${today.getFullYear()}_${String(today.getMonth()+1).padStart(2,'0')}_${String(today.getDate()).padStart(2,'0')}.csv`){
 return new Promise(resolve=>{
  Papa.parse(path,{download:true,header:true,dynamicTyping:true,
   complete:r=>{rawRows=r.data.filter(d=>d.IdLandkreis);resolve();}
  });
 });
}
