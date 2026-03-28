// ==================== DATA MODEL ====================
const TYPES = {
  // Macros
  dc:               {label:'Distribution Center',icon:'factory',  color:'#74b9ff',cap:0,   cat:'macro',  w:600,h:420},
  fc:               {label:'Fulfillment Center',  icon:'office',   color:'#a29bfe',cap:0,   cat:'macro',  w:600,h:420},
  custom_macro:     {label:'Macro',               icon:'warehouse',color:'#e8e8ed',cap:0,   cat:'macro',  w:500,h:350},
  // Warehouse operations (areas)
  inbound:          {label:'Inbound',      icon:'truck',       color:'#74b9ff',cap:1000,cat:'area', w:190,h:130},
  allocation:       {label:'Allocation',   icon:'forklift',    color:'#a29bfe',cap:500, cat:'area', w:190,h:130},
  storage:          {label:'Storage',      icon:'shelves',     color:'#fdcb6e',cap:2000,cat:'area', w:210,h:150},
  picking:          {label:'Picking',      icon:'pickup',      color:'#00b894',cap:800, cat:'area', w:190,h:130},
  packing:          {label:'Packing',      icon:'packstation', color:'#e17055',cap:600, cat:'area', w:190,h:130},
  shipping:         {label:'Shipping',     icon:'box_out',     color:'#74b9ff',cap:1000,cat:'area', w:190,h:130},
  custom_area:      {label:'Area',         icon:'custom',      color:'#e8e8ed',cap:500, cat:'area', w:190,h:130},
  // Elements
  dock:             {label:'Muelle',       icon:'dock',        color:'#74b9ff',cap:500, cat:'element',w:130,h:75},
  conveyor:         {label:'Conveyor',     icon:'conveyor',    color:'#8888a0',cap:2000,cat:'element',w:130,h:75},
  sorter:           {label:'Sorter',       icon:'sorter_el',   color:'#e17055',cap:800, cat:'element',w:130,h:75},
  miniload:         {label:'MiniLoad',     icon:'miniload',    color:'#fdcb6e',cap:300, cat:'element',w:130,h:75},
  packstation:      {label:'Pack Station', icon:'packstation', color:'#00b894',cap:400, cat:'element',w:130,h:75},
  buffer:           {label:'Buffer',       icon:'buffer',      color:'#a29bfe',cap:1500,cat:'element',w:130,h:75},
  agv:              {label:'AGV',          icon:'agv',         color:'#74b9ff',cap:600, cat:'element',w:130,h:75},
  custom:           {label:'Elemento',     icon:'custom',      color:'#e8e8ed',cap:500, cat:'element',w:130,h:75},
  // Legacy area types (kept for data compatibility)
  entradas:         {label:'Entradas',       icon:'truck',     color:'#74b9ff',cap:1000,cat:'area', w:200,h:140},
  almacen_manual:   {label:'Almacen Manual', icon:'shelves',   color:'#a29bfe',cap:500, cat:'area', w:200,h:140},
  sorter_area:      {label:'Zona Sorter',    icon:'sorting',   color:'#e17055',cap:800, cat:'area', w:200,h:140},
  expediciones_area:{label:'Expediciones',   icon:'box_out',   color:'#00b894',cap:1000,cat:'area', w:200,h:140},
  incidencias:      {label:'Incidencias',    icon:'warning',   color:'#fdcb6e',cap:200, cat:'area', w:160,h:120},
  online:           {label:'Online',         icon:'globe',     color:'#74b9ff',cap:600, cat:'area', w:180,h:130},
};

// ── PORT SYSTEM ──
const PORT_NAMES = ['top','right','bottom','left'];
function portPos(node, port) {
  switch(port) {
    case 'top':    return {x:node.x+node.w/2, y:node.y};
    case 'right':  return {x:node.x+node.w,   y:node.y+node.h/2};
    case 'bottom': return {x:node.x+node.w/2, y:node.y+node.h};
    case 'left':   return {x:node.x,           y:node.y+node.h/2};
  }
}
function portDir(port) {
  switch(port){case'top':return{x:0,y:-1};case'right':return{x:1,y:0};case'bottom':return{x:0,y:1};case'left':return{x:-1,y:0};}
}

// ── STATE ──
let nodes=[], connections=[];
let selectedIds = new Set();   // multi-select node IDs
let selectedConnId = null;     // single selected connection
let selRect = null;            // rubber-band {x1,y1,x2,y2} world coords
let connectMode=false, connectSource=null, connectSourcePort=null;
let simulating=false, particles=[];
let cam={x:0,y:0,zoom:1}, dragging=null, idCounter=1, connIdCounter=1;

// Schedule
const DAYS=['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'];
const SN=['morning','afternoon','night'], SL=['Manana','Tarde','Noche'];
let schedule={shifts:{morning:{start:'06:00',end:'14:00'},afternoon:{start:'14:00',end:'22:00'},night:{start:'22:00',end:'06:00'}},days:{}};
DAYS.forEach(d=>{schedule.days[d]={};SN.forEach(s=>{schedule.days[d][s]={active:d!=='Sabado'&&d!=='Domingo',personnel:10};});});

const canvas=document.getElementById('canvas'), ctx=canvas.getContext('2d');
function resize(){
  const a=document.getElementById('canvasArea');
  canvas.width=a.clientWidth*devicePixelRatio;canvas.height=a.clientHeight*devicePixelRatio;
  canvas.style.width=a.clientWidth+'px';canvas.style.height=a.clientHeight+'px';
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);render();
}
window.addEventListener('resize',resize);

// ── SELECTION HELPERS ──
function selectNode(id) {
  selectedIds = id!==null ? new Set([id]) : new Set();
  selectedConnId = null;
  renderProps(); render();
  if(id!==null && window.innerWidth<=768){
    document.getElementById('toolbarPanel').classList.remove('open');
    document.getElementById('propsPanel').classList.add('open');
    document.getElementById('panelBackdrop').classList.add('visible');
  }
}
function selectConn(id) {
  selectedConnId=id; selectedIds.clear(); renderProps(); render();
}
function clearSelection() {
  selectedIds.clear(); selectedConnId=null; renderProps(); render();
}
function deleteSelected() {
  const ids=[...selectedIds];
  ids.forEach(id=>{
    nodes=nodes.filter(n=>n.id!==id);
    connections=connections.filter(c=>c.from!==id&&c.to!==id);
  });
  selectedIds.clear();
  saveAll(); updateStats(); renderProps(); render();
}

// ── NODE CRUD ──
function addNode(type,x,y){
  const t=TYPES[type];if(!t)return null;
  const node={id:idCounter++,type,label:t.label,icon:t.icon,x,y,w:t.w,h:t.h,
    capacity:t.cap,oee:85,operatingHours:0,personnel:0,prodPerPerson:0,
    unitType:'uds', inputBultos:0,inputFlow:0,outputFlow:0,effectiveCap:t.cap,status:'idle'};
  nodes.push(node);selectNode(node.id);saveAll();updateStats();return node;
}
function removeNode(id){
  nodes=nodes.filter(n=>n.id!==id);connections=connections.filter(c=>c.from!==id&&c.to!==id);
  selectedIds.delete(id);saveAll();updateStats();
  if(selectedIds.size===0){renderProps();}
}
function addConnection(fromId,fromPort,toId,toPort,pct){
  if(fromId===toId)return null;
  if(connections.find(c=>c.from===fromId&&c.fromPort===fromPort&&c.to===toId&&c.toPort===toPort))return null;
  const conn={id:connIdCounter++,from:fromId,fromPort,to:toId,toPort,
    label:'',capacity:9999,percent:pct||100,flow:0,status:'idle'};
  connections.push(conn);saveAll();updateStats();return conn;
}
function removeConnection(id){
  connections=connections.filter(c=>c.id!==id);
  if(selectedConnId===id){selectedConnId=null;renderProps();}
  saveAll();updateStats();
}

// ── SIMULATION ──
function runSim(){
  nodes.forEach(n=>{n.inputFlow=0;n.outputFlow=0;n.status='idle';});
  connections.forEach(c=>{c.flow=0;c.status='idle';});
  const sources=nodes.filter(n=>n.inputBultos>0);
  const visited=new Set(),order=[],queue=[...sources];
  while(queue.length){const n=queue.shift();if(visited.has(n.id))continue;visited.add(n.id);order.push(n);
    connections.filter(c=>c.from===n.id).forEach(c=>{const t=nodes.find(nn=>nn.id===c.to);if(t&&!visited.has(t.id))queue.push(t);});}
  nodes.forEach(n=>{if(!visited.has(n.id))order.push(n);});
  order.forEach(node=>{
    if(node.inputBultos>0&&node.inputFlow===0)node.inputFlow=node.inputBultos;
    let eCap=node.capacity>0?node.capacity*(node.oee/100):Infinity;
    if(node.personnel>0&&node.prodPerPerson>0)eCap=Math.min(eCap,node.personnel*node.prodPerPerson);
    node.effectiveCap=node.capacity>0?Math.round(eCap):0;
    const processed=node.capacity>0?Math.min(node.inputFlow,eCap):node.inputFlow;
    node.outputFlow=processed;
    if(node.capacity>0&&eCap>0){const r=node.inputFlow/eCap;
      if(r>1)node.status='red';else if(r>.8)node.status='yellow';else if(node.inputFlow>0)node.status='green';}
    const outs=connections.filter(c=>c.from===node.id);
    const totP=outs.reduce((s,c)=>s+c.percent,0);
    outs.forEach(c=>{
      const rawFlow=processed*(totP>0?c.percent/totP:0);
      const connCapped=Math.min(rawFlow,c.capacity);
      c.flow=connCapped;
      if(c.capacity<9999){const cr=rawFlow/c.capacity;if(cr>1)c.status='red';else if(cr>.8)c.status='yellow';else if(rawFlow>0)c.status='green';}
      else if(rawFlow>0)c.status='green';
      const tgt=nodes.find(nn=>nn.id===c.to);if(tgt)tgt.inputFlow+=connCapped;
    });
  });
  updateStats();
}
function spawnParticles(){
  particles=[];
  connections.forEach(c=>{
    if(c.flow<=0)return;
    const cnt=Math.min(Math.max(Math.floor(c.flow/30),2),20);
    let col='#00b894';
    if(c.status==='red')col='#e17055';else if(c.status==='yellow')col='#fdcb6e';
    const to=nodes.find(n=>n.id===c.to);
    if(to&&to.status==='red')col='#e17055';else if(to&&to.status==='yellow'&&c.status!=='red')col='#fdcb6e';
    for(let i=0;i<cnt;i++)particles.push({cid:c.id,t:i/cnt,spd:.004+Math.random()*.003,col,size:3+Math.random()*2});
  });
}
function updateParticles(){particles.forEach(p=>{p.t+=p.spd;if(p.t>1)p.t-=1;});}

// ── BEZIER HELPERS ──
function connBezier(c){
  const from=nodes.find(n=>n.id===c.from),to=nodes.find(n=>n.id===c.to);if(!from||!to)return null;
  const p1=portPos(from,c.fromPort||'right'),p2=portPos(to,c.toPort||'left');
  const dist=Math.max(Math.hypot(p2.x-p1.x,p2.y-p1.y)*.4,40);
  const d1=portDir(c.fromPort||'right'),d2=portDir(c.toPort||'left');
  return{x1:p1.x,y1:p1.y,cx1:p1.x+d1.x*dist,cy1:p1.y+d1.y*dist,cx2:p2.x+d2.x*dist,cy2:p2.y+d2.y*dist,x2:p2.x,y2:p2.y};
}
function bezPt(b,t){const mt=1-t;return{x:mt*mt*mt*b.x1+3*mt*mt*t*b.cx1+3*mt*t*t*b.cx2+t*t*t*b.x2,y:mt*mt*mt*b.y1+3*mt*mt*t*b.cy1+3*mt*t*t*b.cy2+t*t*t*b.y2};}
function distToBezier(b,wx,wy){let m=Infinity;for(let t=0;t<=1;t+=.02){const p=bezPt(b,t);const d=Math.hypot(wx-p.x,wy-p.y);if(d<m)m=d;}return m;}
function connAtPos(wx,wy){let best=null,bestD=Infinity;connections.forEach(c=>{const b=connBezier(c);if(!b)return;const d=distToBezier(b,wx,wy);if(d<12/cam.zoom&&d<bestD){bestD=d;best=c;}});return best;}

// ── RENDERING ──
let mouseWorld=null;
function render(){
  const w=canvas.width/devicePixelRatio,h=canvas.height/devicePixelRatio;
  ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(cam.x,cam.y);ctx.scale(cam.zoom,cam.zoom);
  drawGrid(w,h);
  ['macro','area','element'].forEach(cat=>nodes.filter(n=>TYPES[n.type]&&TYPES[n.type].cat===cat).forEach(drawNode));
  drawConnections();
  if(simulating)drawParticles();

  // Resize handles only for single selected node
  if(selectedIds.size===1&&!simulating){
    const sId=[...selectedIds][0];const n=nodes.find(nn=>nn.id===sId);if(n)drawResizeHandles(n);
  }
  // Selection rect (rubber-band)
  if(selRect){
    const rx=Math.min(selRect.x1,selRect.x2),ry=Math.min(selRect.y1,selRect.y2);
    const rw=Math.abs(selRect.x2-selRect.x1),rh=Math.abs(selRect.y2-selRect.y1);
    ctx.fillStyle='rgba(108,92,231,.06)';ctx.fillRect(rx,ry,rw,rh);
    ctx.strokeStyle='#6c5ce7';ctx.lineWidth=1.5/cam.zoom;
    ctx.setLineDash([5/cam.zoom,3/cam.zoom]);ctx.strokeRect(rx,ry,rw,rh);ctx.setLineDash([]);
  }
  // Connect preview line
  if(connectMode&&connectSource!==null){
    const src=nodes.find(n=>n.id===connectSource);
    if(src&&mouseWorld){
      const sp=portPos(src,connectSourcePort||'right');
      ctx.beginPath();ctx.setLineDash([6,3]);ctx.strokeStyle='#6c5ce7';ctx.lineWidth=2;
      ctx.moveTo(sp.x,sp.y);ctx.lineTo(mouseWorld.x,mouseWorld.y);ctx.stroke();ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

function drawGrid(w,h){
  const step=40;ctx.strokeStyle='rgba(255,255,255,.03)';ctx.lineWidth=1;
  const sx=Math.floor(-cam.x/cam.zoom/step)*step-step,ex=sx+w/cam.zoom+step*2;
  const sy=Math.floor(-cam.y/cam.zoom/step)*step-step,ey=sy+h/cam.zoom+step*2;
  for(let x=sx;x<ex;x+=step){ctx.beginPath();ctx.moveTo(x,sy);ctx.lineTo(x,ey);ctx.stroke();}
  for(let y=sy;y<ey;y+=step){ctx.beginPath();ctx.moveTo(sx,y);ctx.lineTo(ex,y);ctx.stroke();}
}

function drawNode(node){
  const t=TYPES[node.type];if(!t)return;
  const sel=selectedIds.has(node.id), isCont=t.cat==='macro'||t.cat==='area';
  ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=isCont?8:10;ctx.shadowOffsetY=3;

  let bg=isCont?'rgba(26,29,39,.85)':'#1e2130', bc='#2a2d3a';
  if(simulating){
    if(node.status==='red')  {bc='#e17055';bg=isCont?'rgba(225,112,85,.06)':'rgba(225,112,85,.1)';}
    else if(node.status==='yellow'){bc='#fdcb6e';bg=isCont?'rgba(253,203,110,.04)':'rgba(253,203,110,.08)';}
    else if(node.status==='green') {bc='#00b894';bg=isCont?'rgba(0,184,148,.04)':'rgba(0,184,148,.08)';}
  }
  if(sel){bc='#6c5ce7';}

  ctx.fillStyle=bg;ctx.strokeStyle=bc;ctx.lineWidth=sel?2.5:1.5;
  const r=isCont?16:10;
  rr(ctx,node.x,node.y,node.w,node.h,r);ctx.fill();
  // Multi-select overlay
  if(sel&&selectedIds.size>1){ctx.fillStyle='rgba(108,92,231,.07)';rr(ctx,node.x,node.y,node.w,node.h,r);ctx.fill();}
  if(isCont){ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);}else ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;

  // Color bar
  ctx.fillStyle=t.color;rrTop(ctx,node.x,node.y,node.w,isCont?5:3,r);ctx.fill();

  // Category badge
  if(isCont){
    ctx.fillStyle='rgba(255,255,255,.06)';rr(ctx,node.x+8,node.y+12,t.cat==='macro'?50:40,18,4);ctx.fill();
    ctx.fillStyle=t.color;ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(t.cat==='macro'?'MACRO':'AREA',node.x+14,node.y+16);
  }

  // Icon
  const iconKey=node.icon||t.icon;const iconFn=ICONS[iconKey];
  const iconSize=isCont?26:22;
  const iconX=node.x+(isCont?10:4),iconY=node.y+(isCont?32:node.h/2-iconSize/2);
  if(iconFn)iconFn(ctx,iconX,iconY,iconSize,t.color);

  // Label
  const lblX=iconX+iconSize+6,lblY=node.y+(isCont?34:14);
  ctx.fillStyle='#e8e8ed';ctx.font='bold '+(isCont?'13':'11')+'px Inter,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
  let lbl=node.label;const maxLblW=node.w-(lblX-node.x)-10;
  while(ctx.measureText(lbl).width>maxLblW&&lbl.length>3)lbl=lbl.slice(0,-1);
  if(lbl!==node.label)lbl+='...';ctx.fillText(lbl,lblX,lblY);

  // Capacity / unit line
  ctx.fillStyle='#8888a0';ctx.font='10px Inter,sans-serif';
  const uLabel=node.unitType==='bultos'?'bultos/h':'uds/h';
  if(node.capacity>0){
    if(simulating)ctx.fillText(node.effectiveCap+' '+uLabel+' eff.',lblX,lblY+16);
    else{let cl=node.capacity+' '+uLabel;if(node.oee<100)cl+=' (OEE '+node.oee+'%)';ctx.fillText(cl,lblX,lblY+16);}
  }

  // Badges
  if(node.personnel>0){const bx=node.x+node.w-48,by=node.y+node.h-20;
    ctx.fillStyle='rgba(162,155,254,.15)';rr(ctx,bx,by,42,16,4);ctx.fill();
    ctx.fillStyle='#a29bfe';ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='center';ctx.fillText('\u{1F464}'+node.personnel,bx+21,by+8);}
  if(node.inputBultos>0){const bx=node.x+6,by=node.y+node.h-20;
    ctx.fillStyle='rgba(116,185,255,.15)';rr(ctx,bx,by,54,16,4);ctx.fill();
    ctx.fillStyle='#74b9ff';ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='center';ctx.fillText(node.inputBultos+' in',bx+27,by+8);}
  if(simulating&&node.inputFlow>0){ctx.fillStyle=t.color;ctx.font='bold 10px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText('In:'+Math.round(node.inputFlow)+' Out:'+Math.round(node.outputFlow),lblX,lblY+30);}

  // 4 ports
  if(!simulating){PORT_NAMES.forEach(p=>{const pp=portPos(node,p);
    ctx.beginPath();ctx.arc(pp.x,pp.y,4.5,0,Math.PI*2);
    ctx.fillStyle=connectMode?'#6c5ce7':'#3a3d4a';ctx.fill();
    ctx.strokeStyle=connectMode?'#a29bfe':'#555';ctx.lineWidth=1;ctx.stroke();});}
}

function drawResizeHandles(n){
  const hs=6,pts=[{x:n.x,y:n.y},{x:n.x+n.w,y:n.y},{x:n.x+n.w,y:n.y+n.h},{x:n.x,y:n.y+n.h},
    {x:n.x+n.w/2,y:n.y},{x:n.x+n.w,y:n.y+n.h/2},{x:n.x+n.w/2,y:n.y+n.h},{x:n.x,y:n.y+n.h/2}];
  pts.forEach(p=>{ctx.fillStyle='#6c5ce7';ctx.strokeStyle='#fff';ctx.lineWidth=1;
    ctx.fillRect(p.x-hs/2,p.y-hs/2,hs,hs);ctx.strokeRect(p.x-hs/2,p.y-hs/2,hs,hs);});
}
function getResizeHandle(node,wx,wy){
  const hs=8/cam.zoom,pts=[
    {x:node.x,y:node.y,cursor:'nw-resize',dx:-1,dy:-1},{x:node.x+node.w,y:node.y,cursor:'ne-resize',dx:1,dy:-1},
    {x:node.x+node.w,y:node.y+node.h,cursor:'se-resize',dx:1,dy:1},{x:node.x,y:node.y+node.h,cursor:'sw-resize',dx:-1,dy:1},
    {x:node.x+node.w/2,y:node.y,cursor:'n-resize',dx:0,dy:-1},{x:node.x+node.w,y:node.y+node.h/2,cursor:'e-resize',dx:1,dy:0},
    {x:node.x+node.w/2,y:node.y+node.h,cursor:'s-resize',dx:0,dy:1},{x:node.x,y:node.y+node.h/2,cursor:'w-resize',dx:-1,dy:0}];
  for(const p of pts)if(Math.abs(wx-p.x)<hs&&Math.abs(wy-p.y)<hs)return p;return null;
}

function drawConnections(){
  connections.forEach(c=>{
    const b=connBezier(c);if(!b)return;
    const isSel=(c.id===selectedConnId);
    let col=simulating?(c.status==='red'?'#e17055':c.status==='yellow'?'#fdcb6e':c.flow>0?'#00b894':'#3a3d4a'):(isSel?'#6c5ce7':'#3a3d4a');
    if(simulating&&c.flow>0){ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=8;ctx.globalAlpha=.15;
      ctx.moveTo(b.x1,b.y1);ctx.bezierCurveTo(b.cx1,b.cy1,b.cx2,b.cy2,b.x2,b.y2);ctx.stroke();ctx.globalAlpha=1;}
    if(isSel&&!simulating){ctx.beginPath();ctx.strokeStyle='#6c5ce7';ctx.lineWidth=7;ctx.globalAlpha=.18;
      ctx.moveTo(b.x1,b.y1);ctx.bezierCurveTo(b.cx1,b.cy1,b.cx2,b.cy2,b.x2,b.y2);ctx.stroke();ctx.globalAlpha=1;}
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=isSel?3:2;
    ctx.moveTo(b.x1,b.y1);ctx.bezierCurveTo(b.cx1,b.cy1,b.cx2,b.cy2,b.x2,b.y2);ctx.stroke();
    const ang=Math.atan2(b.y2-b.cy2,b.x2-b.cx2);
    ctx.beginPath();ctx.fillStyle=col;ctx.moveTo(b.x2,b.y2);
    ctx.lineTo(b.x2-9*Math.cos(ang-.35),b.y2-9*Math.sin(ang-.35));ctx.lineTo(b.x2-9*Math.cos(ang+.35),b.y2-9*Math.sin(ang+.35));ctx.fill();
    const mp=bezPt(b,.5);
    if(!simulating&&c.capacity<9999){const txt=c.capacity+' u/h';ctx.font='bold 9px Inter,sans-serif';const tw=ctx.measureText(txt).width;
      ctx.fillStyle='rgba(15,17,23,.85)';rr(ctx,mp.x-tw/2-5,mp.y-19,tw+10,16,4);ctx.fill();ctx.fillStyle='#a29bfe';ctx.textAlign='center';ctx.fillText(txt,mp.x,mp.y-8);}
    if(c.percent<100){ctx.fillStyle='#8888a0';ctx.font='10px Inter,sans-serif';ctx.textAlign='center';ctx.fillText(c.percent+'%',mp.x,mp.y+(c.capacity<9999?6:-6));}
    if(!simulating&&isSel&&c.label){ctx.fillStyle='#a29bfe';ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='center';ctx.fillText(c.label,mp.x,mp.y+16);}
    if(simulating&&c.flow>0){const fl=Math.round(c.flow);const txt=fl+' u/h';ctx.font='bold 10px Inter,sans-serif';const tw=ctx.measureText(txt).width;
      ctx.fillStyle='rgba(15,17,23,.75)';rr(ctx,mp.x-tw/2-4,mp.y+3,tw+8,16,4);ctx.fill();ctx.fillStyle=col;ctx.textAlign='center';ctx.fillText(txt,mp.x,mp.y+14);}
  });
}

function drawParticles(){
  particles.forEach(p=>{
    const c=connections.find(cc=>cc.id===p.cid);if(!c)return;const b=connBezier(c);if(!b)return;
    const pt=bezPt(b,p.t);
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size+4,0,Math.PI*2);ctx.fillStyle=p.col;ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size+1.5,0,Math.PI*2);ctx.fillStyle=p.col;ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size,0,Math.PI*2);ctx.fillStyle='#fff';ctx.globalAlpha=.9;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size-.8,0,Math.PI*2);ctx.fillStyle=p.col;ctx.fill();
    for(let tr=1;tr<=3;tr++){const tt=p.t-tr*.025;if(tt<0)continue;const tp=bezPt(b,tt);
      ctx.beginPath();ctx.arc(tp.x,tp.y,p.size*(1-tr*.2),0,Math.PI*2);ctx.fillStyle=p.col;ctx.globalAlpha=.3-tr*.08;ctx.fill();ctx.globalAlpha=1;}
  });
}

function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function rrTop(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+h);ctx.lineTo(x,y+h);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// ── PROPERTIES ──
function renderProps(){
  const panel=document.getElementById('propsContent');

  // Multi-select panel
  if(selectedIds.size>1){
    const counts={macro:0,area:0,element:0};
    selectedIds.forEach(id=>{const n=nodes.find(nn=>nn.id===id);if(n&&TYPES[n.type])counts[TYPES[n.type].cat]++;});
    panel.innerHTML=`
      <div class="prop-title">SELECCION MULTIPLE</div>
      <div style="font-size:22px;font-weight:700;color:var(--accent-light);margin-bottom:4px;">${selectedIds.size}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:16px;">elementos seleccionados</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${counts.macro?`<span style="padding:3px 8px;border-radius:5px;background:rgba(116,185,255,.12);color:var(--blue);font-size:10px;">${counts.macro} macro</span>`:''}
        ${counts.area?`<span style="padding:3px 8px;border-radius:5px;background:rgba(162,155,254,.12);color:var(--accent-light);font-size:10px;">${counts.area} area</span>`:''}
        ${counts.element?`<span style="padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.06);color:var(--text);font-size:10px;">${counts.element} elemento</span>`:''}
      </div>
      <button class="btn" style="width:100%;justify-content:center;margin-bottom:8px;" onclick="clearSelection()">
        Deseleccionar todo</button>
      <button class="btn danger" style="width:100%;justify-content:center;" onclick="deleteSelected()">
        &#10005; Eliminar ${selectedIds.size} elementos</button>`;
    return;
  }

  // Connection properties
  if(selectedConnId){
    const c=connections.find(cc=>cc.id===selectedConnId);
    if(!c){panel.innerHTML='<div class="prop-title">Propiedades</div>';return;}
    const from=nodes.find(n=>n.id===c.from),to=nodes.find(n=>n.id===c.to);
    let simHTML='';
    if(simulating){const sat=c.capacity<9999&&c.capacity>0?Math.round(c.flow/c.capacity*100):0;
      simHTML=`<div class="prop-section">Simulacion</div>
        <div class="prop-group"><span class="prop-label">Estado</span>
          <span class="status-badge ${c.status}">${c.status==='red'?'CUELLO DE BOTELLA':c.status==='yellow'?'CERCA DEL LIMITE':c.status==='green'?'OK':'SIN FLUJO'}</span></div>
        <div class="prop-group"><span class="prop-label">Flujo actual</span>
          <div style="font-size:18px;font-weight:700;color:var(--blue);">${Math.round(c.flow)} u/h</div></div>
        ${c.capacity<9999?`<div class="prop-group"><span class="prop-label">Saturacion</span>
          <div style="font-size:16px;font-weight:700;">${sat}%</div>
          <div style="height:5px;background:var(--border);border-radius:3px;margin-top:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(sat,100)}%;background:${c.status==='red'?'var(--red)':c.status==='yellow'?'var(--yellow)':'var(--green)'};border-radius:3px;"></div></div></div>`:''}`;}
    panel.innerHTML=`
      <div class="prop-title">&#128279; CONECTOR</div>
      <div class="prop-group"><span class="prop-label">Nombre</span>
        <input type="text" class="prop-input" value="${c.label}" onchange="updConnProp(${c.id},'label',this.value)"></div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
        ${from?from.label:'?'} <span style="color:var(--accent-light)">(${c.fromPort})</span>
        &#8594; ${to?to.label:'?'} <span style="color:var(--accent-light)">(${c.toPort})</span></div>
      <div class="prop-section">Configuracion</div>
      <div class="prop-group"><span class="prop-label">Velocidad / Capacidad (u/h)</span>
        <div class="prop-slider-row"><input type="range" class="prop-slider" min="50" max="10000" step="50" value="${c.capacity}"
          oninput="updConnProp(${c.id},'capacity',+this.value);this.nextElementSibling.textContent=this.value>=9999?'Sin limite':this.value">
          <span class="prop-value">${c.capacity>=9999?'Sin limite':c.capacity}</span></div></div>
      <div class="prop-group"><span class="prop-label">% del flujo de salida</span>
        <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="100" step="1" value="${c.percent}"
          oninput="updConnProp(${c.id},'percent',+this.value);this.nextElementSibling.textContent=this.value+'%'">
          <span class="prop-value">${c.percent}%</span></div></div>
      <div class="prop-section">Puertos</div>
      <div class="prop-group" style="display:flex;gap:6px;">
        <div style="flex:1;"><span class="prop-label">Origen</span>
          <select class="prop-input" onchange="updConnProp(${c.id},'fromPort',this.value)">
            ${PORT_NAMES.map(p=>`<option value="${p}"${c.fromPort===p?' selected':''}>${p}</option>`).join('')}</select></div>
        <div style="flex:1;"><span class="prop-label">Destino</span>
          <select class="prop-input" onchange="updConnProp(${c.id},'toPort',this.value)">
            ${PORT_NAMES.map(p=>`<option value="${p}"${c.toPort===p?' selected':''}>${p}</option>`).join('')}</select></div>
      </div>
      ${simHTML}
      <div style="margin-top:16px;"><button class="btn danger" style="width:100%;justify-content:center;" onclick="removeConnection(${c.id});render();">Eliminar conector</button></div>`;
    return;
  }

  // Single node
  if(selectedIds.size!==1){
    panel.innerHTML='<div class="prop-title">Propiedades</div><p style="font-size:12px;color:var(--text-dim);margin-top:30px;text-align:center;line-height:1.8;">Arrastra elementos al canvas.<br>Selecciona uno para ver sus propiedades.<br><br><span style="font-size:10px;opacity:.6;">Shift+clic o arrastrar en el canvas<br>para seleccion multiple.</span></p>';return;
  }
  const nodeId=[...selectedIds][0];
  const node=nodes.find(n=>n.id===nodeId);if(!node)return;
  const t=TYPES[node.type];if(!t)return;

  let statusHTML='';
  if(simulating&&node.capacity>0){
    const sat=node.effectiveCap>0?Math.round(node.inputFlow/node.effectiveCap*100):0;
    const uL=node.unitType==='bultos'?'bultos/h':'uds/h';
    statusHTML=`<div class="prop-section">Simulacion</div>
      <div class="prop-group"><span class="prop-label">Estado</span>
        <span class="status-badge ${node.status}">${node.status==='red'?'CUELLO DE BOTELLA':node.status==='yellow'?'CERCA DEL LIMITE':node.status==='green'?'OK':'SIN FLUJO'}</span></div>
      <div class="prop-group"><span class="prop-label">Flujo entrada</span>
        <div style="font-size:18px;font-weight:700;color:${t.color}">${Math.round(node.inputFlow)} ${uL}</div></div>
      <div class="prop-group"><span class="prop-label">Flujo salida</span>
        <div style="font-size:18px;font-weight:700;color:${t.color}">${Math.round(node.outputFlow)} ${uL}</div></div>
      <div class="prop-group"><span class="prop-label">Saturacion</span>
        <div style="font-size:18px;font-weight:700;">${sat}%</div>
        <div style="height:5px;background:var(--border);border-radius:3px;margin-top:3px;overflow:hidden;"><div style="height:100%;width:${Math.min(sat,100)}%;background:${node.status==='red'?'var(--red)':node.status==='yellow'?'var(--yellow)':'var(--green)'};border-radius:3px;"></div></div></div>
      <div class="prop-group"><span class="prop-label">Cap. efectiva</span>
        <div style="font-size:16px;font-weight:700;color:var(--accent-light);">${node.effectiveCap} ${uL}</div></div>`;
  }

  let connsHTML='';
  const outs=connections.filter(c=>c.from===node.id),ins=connections.filter(c=>c.to===node.id);
  if(outs.length){connsHTML+='<div class="prop-section">Conectores salida</div>';
    outs.forEach(c=>{const tgt=nodes.find(n=>n.id===c.to);if(!tgt)return;
      connsHTML+=`<div style="display:flex;align-items:center;gap:4px;margin:4px 0;padding:5px 6px;background:rgba(255,255,255,.03);border-radius:5px;cursor:pointer;" onclick="selectConn(${c.id})">
        <span style="font-size:11px;flex:1;">&#8594; ${tgt.label} <span style="color:var(--text-dim);font-size:9px;">${c.fromPort}&#8594;${c.toPort}</span></span>
        <span style="font-size:10px;color:var(--accent-light);">${c.capacity<9999?c.capacity+'u/h ':''} ${c.percent}%</span></div>`;});}
  if(ins.length){connsHTML+='<div class="prop-section">Conectores entrada</div>';
    ins.forEach(c=>{const src=nodes.find(n=>n.id===c.from);if(!src)return;
      connsHTML+=`<div style="display:flex;align-items:center;gap:4px;margin:4px 0;padding:5px 6px;background:rgba(255,255,255,.03);border-radius:5px;cursor:pointer;" onclick="selectConn(${c.id})">
        <span style="font-size:11px;flex:1;">&#8592; ${src.label} <span style="color:var(--text-dim);font-size:9px;">${c.fromPort}&#8594;${c.toPort}</span></span>
        <span style="font-size:10px;color:var(--text-dim);">${c.percent}%</span></div>`;});}

  let persSum='';
  if(node.personnel>0&&node.prodPerPerson>0){const pc=node.personnel*node.prodPerPerson,mc=Math.round(node.capacity*node.oee/100);
    persSum=`<div style="padding:6px;background:rgba(108,92,231,.08);border-radius:6px;margin-top:4px;font-size:10px;">
      <div style="color:var(--accent-light);">Cap. personal: <strong>${pc} u/h</strong></div>
      <div style="color:var(--text-dim);">Cap. maquina (OEE): <strong>${mc} u/h</strong></div>
      <div style="color:var(--text);">Efectiva: <strong>${Math.round(Math.min(pc,mc))} u/h</strong></div></div>`;}

  const iconKey=node.icon||t.icon;
  panel.innerHTML=`
    <div class="prop-title">${t.cat.toUpperCase()} — ${node.type}</div>
    <div class="prop-group"><span class="prop-label">Nombre</span>
      <input type="text" class="prop-input" value="${node.label}" onchange="updProp(${node.id},'label',this.value)"></div>
    <div class="prop-group"><span class="prop-label">Icono</span>
      <button class="btn" style="width:100%;justify-content:center;gap:8px;" onclick="openIconPicker(${node.id})">
        <canvas id="iconPreview" width="22" height="22" style="width:22px;height:22px;"></canvas>
        Cambiar icono</button></div>
    <div class="prop-section">Dimensiones</div>
    <div class="prop-group" style="display:flex;gap:6px;">
      <div style="flex:1;"><span class="prop-label">Ancho</span>
        <input type="number" class="prop-input" value="${node.w}" min="60" step="10" onchange="updProp(${node.id},'w',+this.value)"></div>
      <div style="flex:1;"><span class="prop-label">Alto</span>
        <input type="number" class="prop-input" value="${node.h}" min="40" step="10" onchange="updProp(${node.id},'h',+this.value)"></div>
    </div>
    ${node.capacity>0||t.cat!=='macro'?`
    <div class="prop-section">Capacidad</div>
    <div class="prop-group"><span class="prop-label">Unidades de medida</span>
      <div style="display:flex;gap:14px;margin-top:4px;">
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
          <input type="radio" name="ut_${node.id}" value="uds" ${node.unitType!=='bultos'?'checked':''} onchange="updProp(${node.id},'unitType','uds')"> uds/h
        </label>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
          <input type="radio" name="ut_${node.id}" value="bultos" ${node.unitType==='bultos'?'checked':''} onchange="updProp(${node.id},'unitType','bultos')"> bultos/h
        </label>
      </div>
    </div>
    <div class="prop-group"><span class="prop-label">Capacidad nominal</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="5000" step="10" value="${node.capacity}"
        oninput="updProp(${node.id},'capacity',+this.value);this.nextElementSibling.textContent=this.value">
        <span class="prop-value">${node.capacity}</span></div></div>
    <div class="prop-group"><span class="prop-label">Bultos/Uds. de entrada (0 = recibe de otros)</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="5000" step="10" value="${node.inputBultos}"
        oninput="updProp(${node.id},'inputBultos',+this.value);this.nextElementSibling.textContent=this.value">
        <span class="prop-value">${node.inputBultos}</span></div></div>
    <div class="prop-section">Rendimiento</div>
    <div class="prop-group"><span class="prop-label">OEE (%)</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="100" step="1" value="${node.oee}"
        oninput="updProp(${node.id},'oee',+this.value);this.nextElementSibling.textContent=this.value+'%'"
        style="background:linear-gradient(to right,var(--red),var(--yellow),var(--green));">
        <span class="prop-value">${node.oee}%</span></div></div>
    <div class="prop-group"><span class="prop-label">Horas func./dia (0 = horario DC)</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="24" step=".5" value="${node.operatingHours}"
        oninput="updProp(${node.id},'operatingHours',+this.value);this.nextElementSibling.textContent=this.value==0?'Auto':this.value+'h'">
        <span class="prop-value">${node.operatingHours==0?'Auto':node.operatingHours+'h'}</span></div></div>
    <div class="prop-section">Personal</div>
    <div class="prop-group"><span class="prop-label">Personas dedicadas (0 = automatizado)</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="100" step="1" value="${node.personnel}"
        oninput="updProp(${node.id},'personnel',+this.value);this.nextElementSibling.textContent=this.value==0?'Auto':this.value">
        <span class="prop-value">${node.personnel==0?'Auto':node.personnel}</span></div></div>
    <div class="prop-group" style="${node.personnel>0?'':'opacity:.35;pointer-events:none;'}"><span class="prop-label">Productividad/persona</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="500" step="5" value="${node.prodPerPerson}"
        oninput="updProp(${node.id},'prodPerPerson',+this.value);this.nextElementSibling.textContent=this.value">
        <span class="prop-value">${node.prodPerPerson}</span></div></div>
    ${persSum}
    `:''}
    ${statusHTML}${connsHTML}
    <div style="margin-top:16px;"><button class="btn danger" style="width:100%;justify-content:center;" onclick="removeNode(${node.id});render();">Eliminar</button></div>`;

  setTimeout(()=>{const prev=document.getElementById('iconPreview');if(prev){const pc=prev.getContext('2d');pc.clearRect(0,0,22,22);const fn=ICONS[iconKey];if(fn)fn(pc,0,0,22,t.color);}},0);
}

function updProp(id,prop,val){const n=nodes.find(nn=>nn.id===id);if(!n)return;n[prop]=val;if(simulating){runSim();spawnParticles();renderProps();}saveAll();render();}
function updConnProp(id,prop,val){const c=connections.find(cc=>cc.id===id);if(!c)return;c[prop]=val;if(simulating){runSim();spawnParticles();renderProps();}saveAll();render();}

// ── ICON PICKER ──
function openIconPicker(nodeId){
  const node=nodes.find(n=>n.id===nodeId);if(!node)return;
  const t=TYPES[node.type];if(!t)return;
  const iconList=ICON_CATALOG[t.cat]||ICON_CATALOG.element;
  const ovl=document.createElement('div');ovl.className='icon-picker-overlay';
  ovl.onclick=e=>{if(e.target===ovl)ovl.remove();};
  const box=document.createElement('div');box.className='icon-picker-box';
  box.innerHTML='<h3>Elegir icono</h3><div class="icon-grid" id="iconGridPicker"></div>';
  ovl.appendChild(box);document.body.appendChild(ovl);
  const grid=document.getElementById('iconGridPicker');
  iconList.forEach(key=>{const fn=ICONS[key];if(!fn)return;
    const cell=document.createElement('div');cell.className='icon-cell';
    if((node.icon||t.icon)===key)cell.classList.add('selected');
    cell.title=ICON_NAMES[key]||key;
    const cvs=document.createElement('canvas');cvs.width=28;cvs.height=28;cvs.style.cssText='width:28px;height:28px;';cell.appendChild(cvs);
    const ic=cvs.getContext('2d');fn(ic,0,0,28,t.color);
    const nm=document.createElement('div');nm.style.cssText='font-size:8px;color:var(--text-dim);text-align:center;margin-top:2px;';nm.textContent=ICON_NAMES[key]||key;cell.appendChild(nm);
    cell.onclick=()=>{node.icon=key;saveAll();renderProps();render();ovl.remove();};
    grid.appendChild(cell);});
}

// ── INTERACTION ──
let spaceDown=false;
function s2w(sx,sy){return{x:(sx-cam.x)/cam.zoom,y:(sy-cam.y)/cam.zoom};}
function nodeAtPos(wx,wy){
  for(const cat of ['element','area','macro'])
    for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];
      if(TYPES[n.type]&&TYPES[n.type].cat===cat&&wx>=n.x&&wx<=n.x+n.w&&wy>=n.y&&wy<=n.y+n.h)return n;}
  return null;
}
function portAtPos(wx,wy){
  const th=12/cam.zoom;
  for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];
    for(const p of PORT_NAMES){const pp=portPos(n,p);if(Math.hypot(wx-pp.x,wy-pp.y)<th)return{node:n,port:p};}}
  return null;
}
function nodesInRect(rx,ry,rx2,ry2){return nodes.filter(n=>n.x<rx2&&n.x+n.w>rx&&n.y<ry2&&n.y+n.h>ry);}

canvas.addEventListener('mousedown',e=>{
  const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wp=s2w(sx,sy);
  hideCtx();
  if(e.button===1||(e.button===0&&spaceDown)){dragging={type:'pan',sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y};canvas.style.cursor='grabbing';return;}
  if(e.button!==0)return;

  // Connect mode
  if(connectMode){const pa=portAtPos(wp.x,wp.y);if(pa){
    if(!connectSource){connectSource=pa.node.id;connectSourcePort=pa.port;}
    else{addConnection(connectSource,connectSourcePort,pa.node.id,pa.port,100);
      connectSource=null;connectSourcePort=null;
      if(simulating){runSim();spawnParticles();renderProps();}render();}
  }return;}

  // Resize handle (only for single selection)
  if(selectedIds.size===1){
    const sId=[...selectedIds][0];const sn=nodes.find(n=>n.id===sId);
    if(sn){const h=getResizeHandle(sn,wp.x,wp.y);
      if(h){dragging={type:'resize',id:sn.id,handle:h,origX:sn.x,origY:sn.y,origW:sn.w,origH:sn.h,startWx:wp.x,startWy:wp.y};return;}}}

  const node=nodeAtPos(wp.x,wp.y);
  if(node){
    if(e.shiftKey){// Shift-click: toggle
      if(selectedIds.has(node.id))selectedIds.delete(node.id);else selectedIds.add(node.id);
      selectedConnId=null;renderProps();render();
    } else {
      if(!selectedIds.has(node.id)){selectedIds=new Set([node.id]);selectedConnId=null;renderProps();}
      // Start drag for all selected
      dragging={type:'nodes',startWx:wp.x,startWy:wp.y,
        initPos:Object.fromEntries([...selectedIds].map(id=>{const n=nodes.find(nn=>nn.id===id);return[id,n?{x:n.x,y:n.y}:{x:0,y:0}];}))};
    }
  } else {
    const cc=connAtPos(wp.x,wp.y);
    if(cc){selectConn(cc.id);}
    else {// Start rubber-band selection
      selectedIds.clear();selectedConnId=null;
      selRect={x1:wp.x,y1:wp.y,x2:wp.x,y2:wp.y};
      dragging={type:'selrect'};renderProps();render();}
  }
});

canvas.addEventListener('mousemove',e=>{
  const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top;
  mouseWorld=s2w(sx,sy);
  if(dragging){
    if(dragging.type==='pan'){cam.x=dragging.cx+(e.clientX-dragging.sx);cam.y=dragging.cy+(e.clientY-dragging.sy);}
    else if(dragging.type==='nodes'){
      const dx=mouseWorld.x-dragging.startWx,dy=mouseWorld.y-dragging.startWy;
      selectedIds.forEach(id=>{const n=nodes.find(nn=>nn.id===id);
        if(n&&dragging.initPos[id]){n.x=Math.round((dragging.initPos[id].x+dx)/10)*10;n.y=Math.round((dragging.initPos[id].y+dy)/10)*10;}});}
    else if(dragging.type==='selrect'){selRect.x2=mouseWorld.x;selRect.y2=mouseWorld.y;}
    else if(dragging.type==='resize'){
      const n=nodes.find(nn=>nn.id===dragging.id),h=dragging.handle;if(!n)return;
      const dx=mouseWorld.x-dragging.startWx,dy=mouseWorld.y-dragging.startWy;
      if(h.dx===1)n.w=Math.max(60,Math.round((dragging.origW+dx)/10)*10);
      if(h.dx===-1){const nw=Math.max(60,Math.round((dragging.origW-dx)/10)*10);n.x=dragging.origX+dragging.origW-nw;n.w=nw;}
      if(h.dy===1)n.h=Math.max(40,Math.round((dragging.origH+dy)/10)*10);
      if(h.dy===-1){const nh=Math.max(40,Math.round((dragging.origH-dy)/10)*10);n.y=dragging.origY+dragging.origH-nh;n.h=nh;}
    }
    render();
  } else {
    // Cursor for resize handles
    if(selectedIds.size===1){const sId=[...selectedIds][0];const sn=nodes.find(n=>n.id===sId);
      if(sn){const h=getResizeHandle(sn,mouseWorld.x,mouseWorld.y);canvas.style.cursor=h?h.cursor:'';}}
    else canvas.style.cursor='';
    if(connectMode&&connectSource!==null)render();
  }
});

canvas.addEventListener('mouseup',()=>{
  if(dragging){
    if(dragging.type==='nodes')saveAll();
    if(dragging.type==='resize')saveAll();
    if(dragging.type==='selrect'&&selRect){
      const rx=Math.min(selRect.x1,selRect.x2),ry=Math.min(selRect.y1,selRect.y2);
      const rx2=Math.max(selRect.x1,selRect.x2),ry2=Math.max(selRect.y1,selRect.y2);
      if(rx2-rx>5||ry2-ry>5){const inRect=nodesInRect(rx,ry,rx2,ry2);selectedIds=new Set(inRect.map(n=>n.id));renderProps();}
      selRect=null;
    }
  }
  dragging=null;canvas.style.cursor='';render();
});

canvas.addEventListener('wheel',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top;
  const oz=cam.zoom,d=e.deltaY>0?.9:1.1;cam.zoom=Math.max(.2,Math.min(3,cam.zoom*d));
  cam.x=sx-(sx-cam.x)*(cam.zoom/oz);cam.y=sy-(sy-cam.y)*(cam.zoom/oz);
  document.getElementById('zoomLvl').textContent=Math.round(cam.zoom*100)+'%';render();},{passive:false});

canvas.addEventListener('contextmenu',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect();
  const wp=s2w(e.clientX-rect.left,e.clientY-rect.top);
  const cc=connAtPos(wp.x,wp.y);const node=nodeAtPos(wp.x,wp.y);
  showCtx(e.clientX,e.clientY,node,cc);});

document.addEventListener('keydown',e=>{
  if(e.code==='Space'){spaceDown=true;e.preventDefault();}
  if(e.code==='KeyC'&&!e.ctrlKey&&!e.metaKey&&document.activeElement.tagName!=='INPUT')toggleConnectMode();
  if((e.code==='Delete'||e.code==='Backspace')&&document.activeElement.tagName!=='INPUT'){
    if(selectedConnId){removeConnection(selectedConnId);render();}
    else if(selectedIds.size>0){deleteSelected();}
  }
  if(e.code==='Escape'){
    if(connectMode)toggleConnectMode();
    connectSource=null;connectSourcePort=null;
    clearSelection();
  }
  if(e.code==='KeyA'&&(e.ctrlKey||e.metaKey)){e.preventDefault();selectedIds=new Set(nodes.map(n=>n.id));renderProps();render();}
});
document.addEventListener('keyup',e=>{if(e.code==='Space')spaceDown=false;});

// Touch
let touchDist=0,touchZoom=1;
canvas.addEventListener('touchstart',e=>{e.preventDefault();hideCtx();
  if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    touchDist=Math.sqrt(dx*dx+dy*dy);touchZoom=cam.zoom;dragging=null;return;}
  if(e.touches.length===1){const t=e.touches[0],rect=canvas.getBoundingClientRect();
    const sx=t.clientX-rect.left,sy=t.clientY-rect.top,wp=s2w(sx,sy);mouseWorld=wp;
    if(connectMode){const pa=portAtPos(wp.x,wp.y);if(pa){
      if(!connectSource){connectSource=pa.node.id;connectSourcePort=pa.port;}
      else{addConnection(connectSource,connectSourcePort,pa.node.id,pa.port,100);
        connectSource=null;connectSourcePort=null;if(simulating){runSim();spawnParticles();renderProps();}render();}}return;}
    const node=nodeAtPos(wp.x,wp.y);
    if(node){selectNode(node.id);dragging={type:'nodes',startWx:wp.x,startWy:wp.y,initPos:{[node.id]:{x:node.x,y:node.y}}};}
    else{const cc=connAtPos(wp.x,wp.y);if(cc)selectConn(cc.id);
      else{clearSelection();dragging={type:'pan',sx:t.clientX,sy:t.clientY,cx:cam.x,cy:cam.y};}render();}}
},{passive:false});
canvas.addEventListener('touchmove',e=>{e.preventDefault();
  if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    const dist=Math.sqrt(dx*dx+dy*dy),scale=dist/touchDist;
    const rect=canvas.getBoundingClientRect(),mx=(e.touches[0].clientX+e.touches[1].clientX)/2-rect.left,my=(e.touches[0].clientY+e.touches[1].clientY)/2-rect.top;
    const oz=cam.zoom;cam.zoom=Math.max(.2,Math.min(3,touchZoom*scale));
    cam.x=mx-(mx-cam.x)*(cam.zoom/oz);cam.y=my-(my-cam.y)*(cam.zoom/oz);render();return;}
  if(e.touches.length===1&&dragging){const t=e.touches[0],rect=canvas.getBoundingClientRect();
    mouseWorld=s2w(t.clientX-rect.left,t.clientY-rect.top);
    if(dragging.type==='pan'){cam.x=dragging.cx+(t.clientX-dragging.sx);cam.y=dragging.cy+(t.clientY-dragging.sy);}
    else if(dragging.type==='nodes'){const dx=mouseWorld.x-dragging.startWx,dy=mouseWorld.y-dragging.startWy;
      selectedIds.forEach(id=>{const n=nodes.find(nn=>nn.id===id);if(n&&dragging.initPos[id]){n.x=Math.round((dragging.initPos[id].x+dx)/10)*10;n.y=Math.round((dragging.initPos[id].y+dy)/10)*10;}});}
    render();}
},{passive:false});
canvas.addEventListener('touchend',()=>{if(dragging&&dragging.type==='nodes')saveAll();dragging=null;});

// Drag from toolbar
document.querySelectorAll('.tool-item').forEach(item=>{
  item.addEventListener('dragstart',e=>{e.dataTransfer.setData('nodeType',item.dataset.type);e.dataTransfer.effectAllowed='copy';});});
const canvasArea=document.getElementById('canvasArea');
canvasArea.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
canvasArea.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('nodeType');
  if(!type||!TYPES[type])return;const rect=canvas.getBoundingClientRect();const wp=s2w(e.clientX-rect.left,e.clientY-rect.top);
  addNode(type,Math.round((wp.x-TYPES[type].w/2)/10)*10,Math.round((wp.y-TYPES[type].h/2)/10)*10);render();});

// Context menu
function showCtx(x,y,node,conn){
  const m=document.getElementById('ctxMenu');
  const multiSel=selectedIds.size>1&&node&&selectedIds.has(node.id);
  if(multiSel) m.innerHTML=`
    <div class="ci" style="color:var(--text-dim);font-size:10px;padding:5px 10px;">${selectedIds.size} elementos</div>
    <div class="ci" onclick="dupSelected();hideCtx();">&#10697; Duplicar seleccion</div>
    <div class="cs"></div>
    <div class="ci danger" onclick="deleteSelected();hideCtx();">&#10005; Eliminar seleccion</div>`;
  else if(node) m.innerHTML=`
    <div class="ci" onclick="selectNode(${node.id});hideCtx();">&#9998; Propiedades</div>
    <div class="ci" onclick="dupNode(${node.id});hideCtx();">&#10697; Duplicar</div>
    <div class="cs"></div>
    <div class="ci danger" onclick="removeNode(${node.id});hideCtx();render();">&#10005; Eliminar</div>`;
  else if(conn) m.innerHTML=`
    <div class="ci" onclick="selectConn(${conn.id});hideCtx();">&#9998; Editar conector</div>
    <div class="cs"></div>
    <div class="ci danger" onclick="removeConnection(${conn.id});hideCtx();render();">&#10005; Eliminar conector</div>`;
  else m.innerHTML=`
    <div class="ci" onclick="toggleConnectMode();hideCtx();">&#128279; Conectar</div>
    <div class="cs"></div>
    <div class="ci" onclick="cam={x:0,y:0,zoom:1};document.getElementById('zoomLvl').textContent='100%';render();hideCtx();">&#127968; Centrar</div>`;
  m.style.left=x+'px';m.style.top=y+'px';m.style.display='block';
}
function hideCtx(){document.getElementById('ctxMenu').style.display='none';}
function dupNode(id){const n=nodes.find(nn=>nn.id===id);if(!n)return;
  const nn=addNode(n.type,n.x+30,n.y+30);if(!nn)return;
  nn.label=n.label+' (copia)';nn.capacity=n.capacity;nn.oee=n.oee;nn.personnel=n.personnel;nn.prodPerPerson=n.prodPerPerson;nn.w=n.w;nn.h=n.h;nn.icon=n.icon;nn.unitType=n.unitType;render();}
function dupSelected(){const ids=[...selectedIds];ids.forEach(id=>dupNode(id));}
document.addEventListener('click',e=>{if(!e.target.closest('.ctx-menu'))hideCtx();});

// Modes
function toggleConnectMode(){connectMode=!connectMode;connectSource=null;connectSourcePort=null;
  const btn=document.getElementById('connectBtn'),ind=document.getElementById('modeInd');
  if(connectMode){btn.classList.add('primary');btn.textContent='\u2713 Conectando...';ind.className='mode-ind connect';ind.innerHTML='Clic en un PUERTO (borde) del origen &#8594; PUERTO del destino &nbsp;&nbsp;ESC cancelar';}
  else{btn.classList.remove('primary');btn.textContent='Conectar';ind.className='mode-ind';ind.innerHTML='';}render();}

function toggleSimulation(){simulating=!simulating;
  const btn=document.getElementById('simBtn'),ind=document.getElementById('modeInd');
  if(simulating){btn.classList.remove('success');btn.classList.add('danger');btn.innerHTML='&#9632; Parar';
    ind.className='mode-ind simulate';ind.innerHTML='Simulacion activa';runSim();spawnParticles();renderProps();animLoop();}
  else{btn.classList.remove('danger');btn.classList.add('success');btn.innerHTML='&#9654; Simular';
    ind.className='mode-ind';ind.innerHTML='';particles=[];
    nodes.forEach(n=>{n.status='idle';n.inputFlow=0;n.outputFlow=0;});
    connections.forEach(c=>{c.flow=0;c.status='idle';});renderProps();render();}
}
let _af=0;
function animLoop(){if(!simulating)return;_af++;updateParticles();if(_af%120===0){runSim();spawnParticles();renderProps();}render();requestAnimationFrame(animLoop);}

// ── SCHEDULE ──
function openSchedule(){renderSched();document.getElementById('schedOvl').classList.add('visible');}
function renderSched(){
  document.getElementById('shiftTimes').innerHTML=SN.map((s,i)=>{const sh=schedule.shifts[s];
    return`<div class="shift-tg"><strong>${SL[i]}</strong><label>De</label><input type="time" value="${sh.start}" onchange="schedule.shifts['${s}'].start=this.value;renderSched();">
    <label>A</label><input type="time" value="${sh.end}" onchange="schedule.shifts['${s}'].end=this.value;renderSched();"></div>`;}).join('');
  SN.forEach((s,i)=>{document.getElementById('sL'+i).textContent=schedule.shifts[s].start+'-'+schedule.shifts[s].end;});
  document.getElementById('schedBody').innerHTML=DAYS.map(day=>{const d=schedule.days[day];let tp=0,th=0;
    const cells=SN.map(s=>{const c=d[s];if(c.active){tp+=c.personnel;th+=shiftH(s);}
      return`<td><div class="sched-cell"><button class="shift-tog ${c.active?'on':'off'}" onclick="schedule.days['${day}']['${s}'].active=!schedule.days['${day}']['${s}'].active;renderSched();"></button>
        <input type="number" min="0" max="999" value="${c.personnel}" ${c.active?'':'disabled style="opacity:.3"'} onchange="schedule.days['${day}']['${s}'].personnel=+this.value;renderSched();">
        <span style="font-size:8px;color:var(--text-dim)">pers.</span></div></td>`;}).join('');
    return`<tr><td>${day}</td>${cells}<td style="font-weight:700;color:var(--accent-light)">${tp}</td><td style="font-weight:600">${th}h</td></tr>`;}).join('');}
function shiftH(s){const sh=schedule.shifts[s];const[h1,m1]=sh.start.split(':').map(Number),[h2,m2]=sh.end.split(':').map(Number);
  let a=h1+m1/60,b=h2+m2/60;if(b<=a)b+=24;return Math.round((b-a)*10)/10;}

// ── SAVE/LOAD ──
const SK='efenia_wh_sim_v4';
function saveAll(){localStorage.setItem(SK,JSON.stringify({nodes,connections,cam,idCounter,connIdCounter,schedule}));}
function loadAll(){const r=localStorage.getItem(SK);if(!r)return;try{const d=JSON.parse(r);
  nodes=d.nodes||[];connections=d.connections||[];cam=d.cam||{x:0,y:0,zoom:1};idCounter=d.idCounter||1;connIdCounter=d.connIdCounter||1;
  connections.forEach(c=>{if(!c.id)c.id=++connIdCounter;if(!c.fromPort)c.fromPort='right';if(!c.toPort)c.toPort='left';if(!c.label)c.label='';if(!c.capacity)c.capacity=9999;if(c.flow===undefined)c.flow=0;if(!c.status)c.status='idle';});
  nodes.forEach(n=>{if(!n.icon&&TYPES[n.type])n.icon=TYPES[n.type].icon;if(!n.unitType)n.unitType='uds';});
  if(d.schedule){schedule=d.schedule;DAYS.forEach(dd=>{if(!schedule.days[dd])schedule.days[dd]={};SN.forEach(s=>{if(!schedule.days[dd][s])schedule.days[dd][s]={active:false,personnel:0};});});}
  document.getElementById('zoomLvl').textContent=Math.round(cam.zoom*100)+'%';updateStats();}catch(e){}}
function clearAll(){if(!confirm('Borrar todo?'))return;nodes=[];connections=[];selectedIds.clear();selectedConnId=null;particles=[];idCounter=1;connIdCounter=1;saveAll();renderProps();updateStats();render();}
function exportJSON(){const d=JSON.stringify({nodes,connections,idCounter,connIdCounter,schedule},null,2);
  const b=new Blob([d],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='efenia-warehouse.json';a.click();URL.revokeObjectURL(u);}
function importJSON(){const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);nodes=d.nodes||[];connections=d.connections||[];idCounter=d.idCounter||1;connIdCounter=d.connIdCounter||1;if(d.schedule)schedule=d.schedule;
      connections.forEach(c=>{if(!c.id)c.id=++connIdCounter;if(!c.fromPort)c.fromPort='right';if(!c.toPort)c.toPort='left';if(!c.label)c.label='';if(!c.capacity)c.capacity=9999;});
      nodes.forEach(n=>{if(!n.icon&&TYPES[n.type])n.icon=TYPES[n.type].icon;if(!n.unitType)n.unitType='uds';});
      saveAll();renderProps();updateStats();render();}catch(err){alert('Error: '+err.message);}};r.readAsText(f);};inp.click();}

function updateStats(){
  document.getElementById('stE').textContent=nodes.length+' elementos';
  document.getElementById('stC').textContent=connections.length+' conexiones';
  const bn=nodes.filter(n=>n.status==='red').length+connections.filter(c=>c.status==='red').length;
  document.getElementById('stB').textContent=bn+' cuellos de botella';
}
function showHelp(){document.getElementById('helpOvl').classList.add('visible');}

// ── MOBILE ──
function toggleMobileToolbar(){const tb=document.getElementById('toolbarPanel'),pr=document.getElementById('propsPanel'),bd=document.getElementById('panelBackdrop');
  pr.classList.remove('open');const o=tb.classList.toggle('open');bd.classList.toggle('visible',o);}
function toggleMobileProps(){const tb=document.getElementById('toolbarPanel'),pr=document.getElementById('propsPanel'),bd=document.getElementById('panelBackdrop');
  tb.classList.remove('open');const o=pr.classList.toggle('open');bd.classList.toggle('visible',o);}
function closeMobilePanels(){document.getElementById('toolbarPanel').classList.remove('open');document.getElementById('propsPanel').classList.remove('open');document.getElementById('panelBackdrop').classList.remove('visible');}
function addNodeCenter(type){const a=document.getElementById('canvasArea'),wp=s2w(a.clientWidth/2,a.clientHeight/2);
  addNode(type,Math.round((wp.x+(Math.random()-.5)*80)/10)*10,Math.round((wp.y+(Math.random()-.5)*80)/10)*10);render();}
(function(){const bar=document.getElementById('mobileAddBar');
  const items=[['inbound','\u{1F69A}','Inbound'],['allocation','\u{1F69B}','Allocation'],['storage','\u{1F4E6}','Storage'],
    ['picking','\u{1F91A}','Picking'],['packing','\u{1F4E6}','Packing'],['shipping','\u{1F4E4}','Shipping'],
    ['dock','\u25B2','Muelle'],['conveyor','\u27A4','Conveyor'],['custom','\u271A','Custom']];
  bar.innerHTML=items.map(([t,ic,lb])=>`<div class="mai" onclick="addNodeCenter('${t}')"><span>${ic}</span>${lb}</div>`).join('');})();

// ── INIT ──
loadAll();resize();render();
if(!localStorage.getItem('efenia_help4')){showHelp();localStorage.setItem('efenia_help4','1');}
