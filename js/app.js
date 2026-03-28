// ==================== DATA MODEL ====================
const TYPES = {
  // Macros
  dc:               {label:'Distribution Center',icon:'factory',color:'#74b9ff',cap:0,   cat:'macro',w:500,h:350},
  fc:               {label:'Fulfillment Center',  icon:'office', color:'#a29bfe',cap:0,   cat:'macro',w:500,h:350},
  custom_macro:     {label:'Macro Personalizada', icon:'warehouse',color:'#e8e8ed',cap:0,  cat:'macro',w:400,h:300},
  // Areas
  entradas:         {label:'Entradas',       icon:'truck',    color:'#74b9ff',cap:1000,cat:'area',w:200,h:140},
  almacen_manual:   {label:'Almacen Manual', icon:'shelves',  color:'#a29bfe',cap:500, cat:'area',w:200,h:140},
  sorter_area:      {label:'Zona Sorter',    icon:'sorting',  color:'#e17055',cap:800, cat:'area',w:200,h:140},
  expediciones_area:{label:'Expediciones',   icon:'box_out',  color:'#00b894',cap:1000,cat:'area',w:200,h:140},
  incidencias:      {label:'Incidencias',    icon:'warning',  color:'#fdcb6e',cap:200, cat:'area',w:160,h:120},
  online:           {label:'Online',         icon:'globe',    color:'#74b9ff',cap:600, cat:'area',w:180,h:130},
  custom_area:      {label:'Area Personalizada',icon:'custom', color:'#e8e8ed',cap:500, cat:'area',w:200,h:140},
  // Elements
  dock:             {label:'Muelle',         icon:'dock',     color:'#74b9ff',cap:500, cat:'element',w:120,h:70},
  conveyor:         {label:'Conveyor',       icon:'conveyor', color:'#8888a0',cap:2000,cat:'element',w:120,h:70},
  sorter:           {label:'Sorter',         icon:'sorter_el',color:'#e17055',cap:800, cat:'element',w:120,h:70},
  miniload:         {label:'MiniLoad',       icon:'miniload', color:'#fdcb6e',cap:300, cat:'element',w:120,h:70},
  packstation:      {label:'Pack Station',   icon:'packstation',color:'#00b894',cap:400,cat:'element',w:120,h:70},
  buffer:           {label:'Buffer',         icon:'buffer',   color:'#a29bfe',cap:1500,cat:'element',w:120,h:70},
  custom:           {label:'Personalizado',  icon:'custom',   color:'#e8e8ed',cap:500, cat:'element',w:120,h:70},
};

// Port system: 4 ports per node (midpoint of each side)
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
  switch(port) {case 'top':return{x:0,y:-1};case 'right':return{x:1,y:0};case 'bottom':return{x:0,y:1};case 'left':return{x:-1,y:0};}
}
function nearestPort(node, wx, wy) {
  let best=null, bestD=Infinity;
  PORT_NAMES.forEach(p => {
    const pp=portPos(node,p);
    const d=Math.hypot(wx-pp.x, wy-pp.y);
    if(d<bestD){bestD=d;best=p;}
  });
  return best;
}

let nodes=[], connections=[], selectedId=null, selectedConnId=null;
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

// ==================== CRUD ====================
function addNode(type,x,y){
  const t=TYPES[type];
  const node={id:idCounter++,type,label:t.label,icon:t.icon,x,y,w:t.w,h:t.h,
    capacity:t.cap,oee:85,operatingHours:0,personnel:0,prodPerPerson:0,
    inputBultos:0,inputFlow:0,outputFlow:0,effectiveCap:t.cap,status:'idle'};
  nodes.push(node);selectNode(node.id);saveAll();updateStats();return node;
}
function removeNode(id){
  nodes=nodes.filter(n=>n.id!==id);
  connections=connections.filter(c=>c.from!==id&&c.to!==id);
  if(selectedId===id){selectedId=null;renderProps();}
  saveAll();updateStats();
}
function addConnection(fromId,fromPort,toId,toPort,pct){
  if(fromId===toId)return null;
  if(connections.find(c=>c.from===fromId&&c.fromPort===fromPort&&c.to===toId&&c.toPort===toPort))return null;
  const conn={id:connIdCounter++, from:fromId, fromPort, to:toId, toPort,
    label:'', capacity:9999, percent:pct||100, flow:0, status:'idle'};
  connections.push(conn);saveAll();updateStats();return conn;
}
function removeConnection(id){
  connections=connections.filter(c=>c.id!==id);
  if(selectedConnId===id){selectedConnId=null;renderProps();}
  saveAll();updateStats();
}

// ==================== SIMULATION ====================
function runSim(){
  nodes.forEach(n=>{n.inputFlow=0;n.outputFlow=0;n.status='idle';});
  connections.forEach(c=>{c.flow=0;c.status='idle';});
  const sources=nodes.filter(n=>n.inputBultos>0);
  const visited=new Set(),order=[],queue=[...sources];
  while(queue.length){
    const n=queue.shift();if(visited.has(n.id))continue;visited.add(n.id);order.push(n);
    connections.filter(c=>c.from===n.id).forEach(c=>{
      const t=nodes.find(nn=>nn.id===c.to);if(t&&!visited.has(t.id))queue.push(t);
    });
  }
  nodes.forEach(n=>{if(!visited.has(n.id))order.push(n);});

  order.forEach(node=>{
    if(node.inputBultos>0&&node.inputFlow===0)node.inputFlow=node.inputBultos;
    let eCap=node.capacity>0 ? node.capacity*(node.oee/100) : Infinity;
    if(node.personnel>0&&node.prodPerPerson>0)eCap=Math.min(eCap,node.personnel*node.prodPerPerson);
    node.effectiveCap=node.capacity>0?Math.round(eCap):0;
    const processed=node.capacity>0?Math.min(node.inputFlow,eCap):node.inputFlow;
    node.outputFlow=processed;
    if(node.capacity>0&&eCap>0){
      const r=node.inputFlow/eCap;
      if(r>1)node.status='red';else if(r>.8)node.status='yellow';else if(node.inputFlow>0)node.status='green';
    }
    const outs=connections.filter(c=>c.from===node.id);
    const totP=outs.reduce((s,c)=>s+c.percent,0);
    outs.forEach(c=>{
      const rawFlow=processed*(totP>0?c.percent/totP:0);
      // Connection capacity limits flow
      const connCapped=Math.min(rawFlow, c.capacity);
      c.flow=connCapped;
      if(c.capacity<9999){
        const cr=rawFlow/c.capacity;
        if(cr>1)c.status='red';else if(cr>.8)c.status='yellow';else if(rawFlow>0)c.status='green';
      } else if(rawFlow>0) c.status='green';
      const tgt=nodes.find(nn=>nn.id===c.to);
      if(tgt) tgt.inputFlow+=connCapped;
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
    for(let i=0;i<cnt;i++){
      particles.push({cid:c.id,t:i/cnt,spd:.004+Math.random()*.003,col,size:3+Math.random()*2});
    }
  });
}
function updateParticles(){particles.forEach(p=>{p.t+=p.spd;if(p.t>1)p.t-=1;});}

// ==================== BEZIER ====================
function connBezier(c){
  const from=nodes.find(n=>n.id===c.from), to=nodes.find(n=>n.id===c.to);
  if(!from||!to)return null;
  const p1=portPos(from,c.fromPort||'right'), p2=portPos(to,c.toPort||'left');
  const dist=Math.max(Math.hypot(p2.x-p1.x,p2.y-p1.y)*.4,40);
  const d1=portDir(c.fromPort||'right'), d2=portDir(c.toPort||'left');
  return {x1:p1.x, y1:p1.y, cx1:p1.x+d1.x*dist, cy1:p1.y+d1.y*dist,
          cx2:p2.x+d2.x*dist, cy2:p2.y+d2.y*dist, x2:p2.x, y2:p2.y};
}
function bezPt(b,t){
  const mt=1-t;
  return {x:mt*mt*mt*b.x1+3*mt*mt*t*b.cx1+3*mt*t*t*b.cx2+t*t*t*b.x2,
          y:mt*mt*mt*b.y1+3*mt*mt*t*b.cy1+3*mt*t*t*b.cy2+t*t*t*b.y2};
}
function distToBezier(b,wx,wy){
  let minD=Infinity;
  for(let t=0;t<=1;t+=.02){const p=bezPt(b,t);const d=Math.hypot(wx-p.x,wy-p.y);if(d<minD)minD=d;}
  return minD;
}
function connAtPos(wx,wy){
  let best=null,bestD=Infinity;
  connections.forEach(c=>{const b=connBezier(c);if(!b)return;
    const d=distToBezier(b,wx,wy);if(d<12/cam.zoom&&d<bestD){bestD=d;best=c;}});
  return best;
}

// ==================== RENDERING ====================
let mouseWorld=null;

function render(){
  const w=canvas.width/devicePixelRatio,h=canvas.height/devicePixelRatio;
  ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(cam.x,cam.y);ctx.scale(cam.zoom,cam.zoom);
  drawGrid(w,h);
  ['macro','area','element'].forEach(cat=>{
    nodes.filter(n=>TYPES[n.type]&&TYPES[n.type].cat===cat).forEach(drawNode);
  });
  drawConnections();
  if(simulating)drawParticles();
  // Resize handles
  if(selectedId&&!simulating){const n=nodes.find(nn=>nn.id===selectedId);if(n)drawResizeHandles(n);}
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
  const sel=node.id===selectedId, isCont=t.cat==='macro'||t.cat==='area';

  ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=isCont?8:10;ctx.shadowOffsetY=3;
  let bg=isCont?'rgba(26,29,39,.85)':'#1e2130', bc='#2a2d3a';
  if(simulating){
    if(node.status==='red'){bc='#e17055';bg=isCont?'rgba(225,112,85,.06)':'rgba(225,112,85,.1)';}
    else if(node.status==='yellow'){bc='#fdcb6e';bg=isCont?'rgba(253,203,110,.04)':'rgba(253,203,110,.08)';}
    else if(node.status==='green'){bc='#00b894';bg=isCont?'rgba(0,184,148,.04)':'rgba(0,184,148,.08)';}
  }
  if(sel)bc='#6c5ce7';

  ctx.fillStyle=bg;ctx.strokeStyle=bc;ctx.lineWidth=sel?2.5:1.5;
  const r=isCont?16:10;
  rr(ctx,node.x,node.y,node.w,node.h,r);ctx.fill();
  if(isCont){ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);}else ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;

  // Color bar
  ctx.fillStyle=t.color;
  rrTop(ctx,node.x,node.y,node.w,isCont?5:3,r);ctx.fill();

  // Category badge
  if(isCont){
    ctx.fillStyle='rgba(255,255,255,.06)';
    rr(ctx,node.x+8,node.y+12,t.cat==='macro'?50:40,18,4);ctx.fill();
    ctx.fillStyle=t.color;ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(t.cat==='macro'?'MACRO':'AREA',node.x+14,node.y+16);
  }

  // Icon (from ICONS database)
  const iconKey=node.icon||t.icon;
  const iconFn=ICONS[iconKey];
  const iconSize=isCont?26:22;
  const iconX=node.x+(isCont?10:4);
  const iconY=node.y+(isCont?32:node.h/2-iconSize/2);
  if(iconFn){iconFn(ctx, iconX, iconY, iconSize, t.color);}

  // Label
  const lblX=iconX+iconSize+6, lblY=node.y+(isCont?34:14);
  ctx.fillStyle='#e8e8ed';ctx.font='bold '+(isCont?'13':'11')+'px Inter,sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
  let lbl=node.label;const maxLblW=node.w-(lblX-node.x)-10;
  while(ctx.measureText(lbl).width>maxLblW&&lbl.length>3)lbl=lbl.slice(0,-1);
  if(lbl!==node.label)lbl+='...';
  ctx.fillText(lbl,lblX,lblY);

  // Capacity line
  ctx.fillStyle='#8888a0';ctx.font='10px Inter,sans-serif';
  if(node.capacity>0){
    if(simulating){ctx.fillText(node.effectiveCap+' u/h eff.',lblX,lblY+16);}
    else{let cl=node.capacity+' u/h';if(node.oee<100)cl+=' (OEE '+node.oee+'%)';ctx.fillText(cl,lblX,lblY+16);}
  }

  // Badges
  if(node.personnel>0){
    const bx=node.x+node.w-48,by=node.y+node.h-20;
    ctx.fillStyle='rgba(162,155,254,.15)';rr(ctx,bx,by,42,16,4);ctx.fill();
    ctx.fillStyle='#a29bfe';ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText('\u{1F464}'+node.personnel,bx+21,by+8);
  }
  if(node.inputBultos>0){
    const bx=node.x+6,by=node.y+node.h-20;
    ctx.fillStyle='rgba(116,185,255,.15)';rr(ctx,bx,by,50,16,4);ctx.fill();
    ctx.fillStyle='#74b9ff';ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='center';
    ctx.fillText(node.inputBultos+' in',bx+25,by+8);
  }
  if(simulating&&node.inputFlow>0){
    ctx.fillStyle=t.color;ctx.font='bold 10px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText('In:'+Math.round(node.inputFlow)+' Out:'+Math.round(node.outputFlow),lblX,lblY+30);
  }

  // 4 Connection ports (top, right, bottom, left)
  if(!simulating){
    PORT_NAMES.forEach(p=>{
      const pp=portPos(node,p);
      ctx.beginPath();ctx.arc(pp.x,pp.y,4.5,0,Math.PI*2);
      ctx.fillStyle=connectMode?'#6c5ce7':'#3a3d4a';ctx.fill();
      ctx.strokeStyle=connectMode?'#a29bfe':'#555';ctx.lineWidth=1;ctx.stroke();
    });
  }
}

function drawResizeHandles(n){
  const hs=6, pts=[
    {x:n.x,y:n.y},{x:n.x+n.w,y:n.y},{x:n.x+n.w,y:n.y+n.h},{x:n.x,y:n.y+n.h},
    {x:n.x+n.w/2,y:n.y},{x:n.x+n.w,y:n.y+n.h/2},{x:n.x+n.w/2,y:n.y+n.h},{x:n.x,y:n.y+n.h/2}
  ];
  pts.forEach(p=>{
    ctx.fillStyle='#6c5ce7';ctx.strokeStyle='#fff';ctx.lineWidth=1;
    ctx.fillRect(p.x-hs/2,p.y-hs/2,hs,hs);ctx.strokeRect(p.x-hs/2,p.y-hs/2,hs,hs);
  });
}
function getResizeHandle(node,wx,wy){
  const hs=8/cam.zoom, pts=[
    {x:node.x,y:node.y,cursor:'nw-resize',dx:-1,dy:-1},
    {x:node.x+node.w,y:node.y,cursor:'ne-resize',dx:1,dy:-1},
    {x:node.x+node.w,y:node.y+node.h,cursor:'se-resize',dx:1,dy:1},
    {x:node.x,y:node.y+node.h,cursor:'sw-resize',dx:-1,dy:1},
    {x:node.x+node.w/2,y:node.y,cursor:'n-resize',dx:0,dy:-1},
    {x:node.x+node.w,y:node.y+node.h/2,cursor:'e-resize',dx:1,dy:0},
    {x:node.x+node.w/2,y:node.y+node.h,cursor:'s-resize',dx:0,dy:1},
    {x:node.x,y:node.y+node.h/2,cursor:'w-resize',dx:-1,dy:0},
  ];
  for(const p of pts){if(Math.abs(wx-p.x)<hs&&Math.abs(wy-p.y)<hs)return p;}
  return null;
}

function drawConnections(){
  connections.forEach(c=>{
    const b=connBezier(c);if(!b)return;
    const isSel=(c.id===selectedConnId);
    let col=simulating
      ? (c.status==='red'?'#e17055':c.status==='yellow'?'#fdcb6e':c.flow>0?'#00b894':'#3a3d4a')
      : (isSel?'#6c5ce7':'#3a3d4a');

    // Glow
    if(simulating&&c.flow>0){
      ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=8;ctx.globalAlpha=.15;
      ctx.moveTo(b.x1,b.y1);ctx.bezierCurveTo(b.cx1,b.cy1,b.cx2,b.cy2,b.x2,b.y2);ctx.stroke();ctx.globalAlpha=1;
    }
    if(isSel&&!simulating){
      ctx.beginPath();ctx.strokeStyle='#6c5ce7';ctx.lineWidth=7;ctx.globalAlpha=.18;
      ctx.moveTo(b.x1,b.y1);ctx.bezierCurveTo(b.cx1,b.cy1,b.cx2,b.cy2,b.x2,b.y2);ctx.stroke();ctx.globalAlpha=1;
    }

    // Line
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=isSel?3:2;
    ctx.moveTo(b.x1,b.y1);ctx.bezierCurveTo(b.cx1,b.cy1,b.cx2,b.cy2,b.x2,b.y2);ctx.stroke();

    // Arrow
    const ang=Math.atan2(b.y2-b.cy2,b.x2-b.cx2);
    ctx.beginPath();ctx.fillStyle=col;ctx.moveTo(b.x2,b.y2);
    ctx.lineTo(b.x2-9*Math.cos(ang-.35),b.y2-9*Math.sin(ang-.35));
    ctx.lineTo(b.x2-9*Math.cos(ang+.35),b.y2-9*Math.sin(ang+.35));ctx.fill();

    // Mid label
    const mp=bezPt(b,.5);
    // Capacity badge (when not unlimited)
    if(!simulating&&c.capacity<9999){
      const txt=c.capacity+' u/h';
      ctx.font='bold 9px Inter,sans-serif';const tw=ctx.measureText(txt).width;
      ctx.fillStyle='rgba(15,17,23,.85)';rr(ctx,mp.x-tw/2-5,mp.y-19,tw+10,16,4);ctx.fill();
      ctx.fillStyle='#a29bfe';ctx.textAlign='center';ctx.fillText(txt,mp.x,mp.y-8);
    }
    // Percent label
    if(c.percent<100){
      ctx.fillStyle='#8888a0';ctx.font='10px Inter,sans-serif';ctx.textAlign='center';
      ctx.fillText(c.percent+'%',mp.x,mp.y+(c.capacity<9999?6:-6));
    }
    // Connection name
    if(!simulating&&isSel&&c.label){
      ctx.fillStyle='#a29bfe';ctx.font='bold 9px Inter,sans-serif';ctx.textAlign='center';
      ctx.fillText(c.label,mp.x,mp.y+16);
    }
    // Sim flow
    if(simulating&&c.flow>0){
      const fl=Math.round(c.flow);const txt=fl+' u/h';
      ctx.font='bold 10px Inter,sans-serif';const tw=ctx.measureText(txt).width;
      ctx.fillStyle='rgba(15,17,23,.75)';rr(ctx,mp.x-tw/2-4,mp.y+3,tw+8,16,4);ctx.fill();
      ctx.fillStyle=col;ctx.textAlign='center';ctx.fillText(txt,mp.x,mp.y+14);
    }
  });
}

function drawParticles(){
  particles.forEach(p=>{
    const c=connections.find(cc=>cc.id===p.cid);if(!c)return;
    const b=connBezier(c);if(!b)return;
    const pt=bezPt(b,p.t);
    // Outer glow
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size+4,0,Math.PI*2);
    ctx.fillStyle=p.col;ctx.globalAlpha=.12;ctx.fill();ctx.globalAlpha=1;
    // Middle
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size+1.5,0,Math.PI*2);
    ctx.fillStyle=p.col;ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1;
    // Core
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size,0,Math.PI*2);
    ctx.fillStyle='#fff';ctx.globalAlpha=.9;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(pt.x,pt.y,p.size-.8,0,Math.PI*2);
    ctx.fillStyle=p.col;ctx.fill();
    // Trail
    for(let tr=1;tr<=3;tr++){
      const tt=p.t-tr*.025;if(tt<0)continue;
      const tp=bezPt(b,tt);
      ctx.beginPath();ctx.arc(tp.x,tp.y,p.size*(1-tr*.2),0,Math.PI*2);
      ctx.fillStyle=p.col;ctx.globalAlpha=.3-tr*.08;ctx.fill();ctx.globalAlpha=1;
    }
  });
}

// Rounded rect helpers
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function rrTop(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+h);ctx.lineTo(x,y+h);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

// ==================== PROPERTIES ====================
function selectNode(id){selectedId=id;selectedConnId=null;renderProps();render();}
function selectConn(id){selectedConnId=id;selectedId=null;renderProps();render();}

function renderProps(){
  const panel=document.getElementById('propsContent');

  // Connection properties
  if(selectedConnId){
    const c=connections.find(cc=>cc.id===selectedConnId);
    if(!c){panel.innerHTML='<div class="prop-title">Propiedades</div>';return;}
    const from=nodes.find(n=>n.id===c.from),to=nodes.find(n=>n.id===c.to);

    let simHTML='';
    if(simulating){
      const sat=c.capacity<9999&&c.capacity>0?Math.round(c.flow/c.capacity*100):0;
      simHTML=`<div class="prop-section">Simulacion</div>
        <div class="prop-group"><span class="prop-label">Estado</span>
          <span class="status-badge ${c.status}">${c.status==='red'?'CUELLO DE BOTELLA':c.status==='yellow'?'CERCA DEL LIMITE':c.status==='green'?'OK':'SIN FLUJO'}</span></div>
        <div class="prop-group"><span class="prop-label">Flujo actual</span>
          <div style="font-size:18px;font-weight:700;color:var(--blue);">${Math.round(c.flow)} u/h</div></div>
        ${c.capacity<9999?`<div class="prop-group"><span class="prop-label">Saturacion conector</span>
          <div style="font-size:16px;font-weight:700;">${sat}%</div>
          <div style="height:5px;background:var(--border);border-radius:3px;margin-top:3px;overflow:hidden;">
            <div style="height:100%;width:${Math.min(sat,100)}%;background:${c.status==='red'?'var(--red)':c.status==='yellow'?'var(--yellow)':'var(--green)'};border-radius:3px;"></div></div></div>`:''}`;
    }

    panel.innerHTML=`
      <div class="prop-title">\u{1F517} CONECTOR</div>
      <div class="prop-group"><span class="prop-label">Nombre</span>
        <input type="text" class="prop-input" value="${c.label}" onchange="updConnProp(${c.id},'label',this.value)"></div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">
        ${from?from.label:'?'} <span style="color:var(--accent-light)">(${c.fromPort})</span>
        \u2192 ${to?to.label:'?'} <span style="color:var(--accent-light)">(${c.toPort})</span></div>
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
            ${PORT_NAMES.map(p=>`<option value="${p}" ${c.fromPort===p?'selected':''}>${p}</option>`).join('')}</select></div>
        <div style="flex:1;"><span class="prop-label">Destino</span>
          <select class="prop-input" onchange="updConnProp(${c.id},'toPort',this.value)">
            ${PORT_NAMES.map(p=>`<option value="${p}" ${c.toPort===p?'selected':''}>${p}</option>`).join('')}</select></div>
      </div>
      ${simHTML}
      <div style="margin-top:16px;"><button class="btn danger" style="width:100%;justify-content:center;" onclick="removeConnection(${c.id});render();">Eliminar conector</button></div>`;
    return;
  }

  // Node properties
  const node=nodes.find(n=>n.id===selectedId);
  if(!node){panel.innerHTML='<div class="prop-title">Propiedades</div><p style="font-size:12px;color:var(--text-dim);margin-top:30px;text-align:center;">Selecciona un elemento o conector.</p>';return;}
  const t=TYPES[node.type];if(!t)return;

  let statusHTML='';
  if(simulating&&node.capacity>0){
    const sat=node.effectiveCap>0?Math.round(node.inputFlow/node.effectiveCap*100):0;
    statusHTML=`
    <div class="prop-section">Simulacion</div>
    <div class="prop-group"><span class="prop-label">Estado</span>
      <span class="status-badge ${node.status}">${node.status==='red'?'CUELLO DE BOTELLA':node.status==='yellow'?'CERCA DEL LIMITE':node.status==='green'?'OK':'SIN FLUJO'}</span></div>
    <div class="prop-group"><span class="prop-label">Flujo entrada</span>
      <div style="font-size:18px;font-weight:700;color:${t.color}">${Math.round(node.inputFlow)} u/h</div></div>
    <div class="prop-group"><span class="prop-label">Flujo salida</span>
      <div style="font-size:18px;font-weight:700;color:${t.color}">${Math.round(node.outputFlow)} u/h</div></div>
    <div class="prop-group"><span class="prop-label">Saturacion</span>
      <div style="font-size:18px;font-weight:700;">${sat}%</div>
      <div style="height:5px;background:var(--border);border-radius:3px;margin-top:3px;overflow:hidden;">
        <div style="height:100%;width:${Math.min(sat,100)}%;background:${node.status==='red'?'var(--red)':node.status==='yellow'?'var(--yellow)':'var(--green)'};border-radius:3px;"></div></div></div>
    <div class="prop-group"><span class="prop-label">Capacidad efectiva</span>
      <div style="font-size:16px;font-weight:700;color:var(--accent-light);">${node.effectiveCap} u/h</div></div>`;
  }

  let connsHTML='';
  const outs=connections.filter(c=>c.from===node.id),ins=connections.filter(c=>c.to===node.id);
  if(outs.length){connsHTML+='<div class="prop-section">Conectores salida</div>';
    outs.forEach(c=>{const tgt=nodes.find(n=>n.id===c.to);if(!tgt)return;
      connsHTML+=`<div style="display:flex;align-items:center;gap:4px;margin:4px 0;padding:5px 6px;background:rgba(255,255,255,.03);border-radius:5px;cursor:pointer;" onclick="selectConn(${c.id})">
        <span style="font-size:11px;flex:1;">\u2192 ${tgt.label} <span style="color:var(--text-dim);font-size:9px;">${c.fromPort}\u2192${c.toPort}</span></span>
        <span style="font-size:10px;color:var(--accent-light);">${c.capacity<9999?c.capacity+'u/h ':''}${c.percent}%</span></div>`;});}
  if(ins.length){connsHTML+='<div class="prop-section">Conectores entrada</div>';
    ins.forEach(c=>{const src=nodes.find(n=>n.id===c.from);if(!src)return;
      connsHTML+=`<div style="display:flex;align-items:center;gap:4px;margin:4px 0;padding:5px 6px;background:rgba(255,255,255,.03);border-radius:5px;cursor:pointer;" onclick="selectConn(${c.id})">
        <span style="font-size:11px;flex:1;">\u2190 ${src.label} <span style="color:var(--text-dim);font-size:9px;">${c.fromPort}\u2192${c.toPort}</span></span>
        <span style="font-size:10px;color:var(--text-dim);">${c.percent}%</span></div>`;});}

  let persSum='';
  if(node.personnel>0&&node.prodPerPerson>0){
    const pc=node.personnel*node.prodPerPerson, mc=Math.round(node.capacity*node.oee/100);
    persSum=`<div style="padding:6px;background:rgba(108,92,231,.08);border-radius:6px;margin-top:4px;font-size:10px;">
      <div style="color:var(--accent-light);">Cap. personal: <strong>${pc} u/h</strong></div>
      <div style="color:var(--text-dim);">Cap. maquina (OEE): <strong>${mc} u/h</strong></div>
      <div style="color:var(--text);">Efectiva: <strong>${Math.round(Math.min(pc,mc))} u/h</strong></div></div>`;
  }

  // Icon picker button
  const iconKey=node.icon||t.icon;
  const iconPickerBtn=`<div class="prop-group"><span class="prop-label">Icono</span>
    <button class="btn" style="width:100%;justify-content:center;gap:8px;" onclick="openIconPicker(${node.id})">
      <canvas id="iconPreview" width="24" height="24" style="width:24px;height:24px;"></canvas>
      Cambiar icono</button></div>`;

  panel.innerHTML=`
    <div class="prop-title">${t.cat.toUpperCase()} — ${node.type}</div>
    <div class="prop-group"><span class="prop-label">Nombre</span>
      <input type="text" class="prop-input" value="${node.label}" onchange="updProp(${node.id},'label',this.value)"></div>
    ${iconPickerBtn}
    <div class="prop-section">Dimensiones</div>
    <div class="prop-group" style="display:flex;gap:6px;">
      <div style="flex:1;"><span class="prop-label">Ancho</span>
        <input type="number" class="prop-input" value="${node.w}" min="60" step="10" onchange="updProp(${node.id},'w',+this.value)"></div>
      <div style="flex:1;"><span class="prop-label">Alto</span>
        <input type="number" class="prop-input" value="${node.h}" min="40" step="10" onchange="updProp(${node.id},'h',+this.value)"></div>
    </div>

    ${node.capacity>0||t.cat!=='macro'?`
    <div class="prop-section">Capacidad</div>
    <div class="prop-group"><span class="prop-label">Capacidad nominal (u/h)</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="5000" step="10" value="${node.capacity}"
        oninput="updProp(${node.id},'capacity',+this.value);this.nextElementSibling.textContent=this.value">
        <span class="prop-value">${node.capacity}</span></div></div>
    <div class="prop-group"><span class="prop-label">Bultos de entrada (u/h) — 0 si recibe de otros</span>
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
    <div class="prop-group" style="${node.personnel>0?'':'opacity:.35;pointer-events:none;'}"><span class="prop-label">Productividad/persona (u/h)</span>
      <div class="prop-slider-row"><input type="range" class="prop-slider" min="0" max="500" step="5" value="${node.prodPerPerson}"
        oninput="updProp(${node.id},'prodPerPerson',+this.value);this.nextElementSibling.textContent=this.value">
        <span class="prop-value">${node.prodPerPerson}</span></div></div>
    ${persSum}
    `:''}

    ${statusHTML}
    ${connsHTML}
    <div style="margin-top:16px;"><button class="btn danger" style="width:100%;justify-content:center;" onclick="removeNode(${node.id});render();">Eliminar</button></div>
  `;

  // Draw icon preview
  setTimeout(()=>{
    const prev=document.getElementById('iconPreview');
    if(prev){const pc=prev.getContext('2d');pc.clearRect(0,0,24,24);
      const fn=ICONS[iconKey];if(fn)fn(pc,0,0,24,t.color);}
  },0);
}

function updProp(id,prop,val){
  const n=nodes.find(nn=>nn.id===id);if(!n)return;n[prop]=val;
  if(simulating){runSim();spawnParticles();renderProps();}saveAll();render();
}
function updConnProp(id,prop,val){
  const c=connections.find(cc=>cc.id===id);if(!c)return;c[prop]=val;
  if(simulating){runSim();spawnParticles();renderProps();}saveAll();render();
}

// ==================== ICON PICKER ====================
function openIconPicker(nodeId){
  const node=nodes.find(n=>n.id===nodeId);if(!node)return;
  const t=TYPES[node.type];if(!t)return;
  const cat=t.cat;
  const iconList=ICON_CATALOG[cat]||ICON_CATALOG.element;

  // Create overlay
  const ovl=document.createElement('div');ovl.className='icon-picker-overlay';
  ovl.onclick=e=>{if(e.target===ovl)ovl.remove();};
  const box=document.createElement('div');box.className='icon-picker-box';
  box.innerHTML=`<h3>Elegir icono</h3><div class="icon-grid" id="iconGridPicker"></div>`;
  ovl.appendChild(box);document.body.appendChild(ovl);

  const grid=document.getElementById('iconGridPicker');
  iconList.forEach(key=>{
    const fn=ICONS[key];if(!fn)return;
    const cell=document.createElement('div');cell.className='icon-cell';
    if((node.icon||t.icon)===key)cell.classList.add('selected');
    cell.title=ICON_NAMES[key]||key;
    const cvs=document.createElement('canvas');cvs.width=28;cvs.height=28;cvs.style.width='28px';cvs.style.height='28px';
    cell.appendChild(cvs);
    const ic=cvs.getContext('2d');fn(ic,0,0,28,t.color);
    // Name
    const nm=document.createElement('div');nm.style.cssText='font-size:8px;color:var(--text-dim);text-align:center;margin-top:2px;';
    nm.textContent=ICON_NAMES[key]||key;
    cell.appendChild(nm);
    cell.onclick=()=>{node.icon=key;saveAll();renderProps();render();ovl.remove();};
    grid.appendChild(cell);
  });
}

// ==================== INTERACTION ====================
let spaceDown=false;
function s2w(sx,sy){return{x:(sx-cam.x)/cam.zoom,y:(sy-cam.y)/cam.zoom};}
function nodeAtPos(wx,wy){
  for(const cat of ['element','area','macro']){
    for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];
      if(TYPES[n.type]&&TYPES[n.type].cat===cat&&wx>=n.x&&wx<=n.x+n.w&&wy>=n.y&&wy<=n.y+n.h)return n;}}
  return null;
}
function portAtPos(wx,wy){
  const threshold=12/cam.zoom;
  for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];
    for(const p of PORT_NAMES){const pp=portPos(n,p);if(Math.hypot(wx-pp.x,wy-pp.y)<threshold)return{node:n,port:p};}}
  return null;
}

canvas.addEventListener('mousedown',e=>{
  const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wp=s2w(sx,sy);
  hideCtx();
  if(e.button===1||(e.button===0&&spaceDown)){
    dragging={type:'pan',sx:e.clientX,sy:e.clientY,cx:cam.x,cy:cam.y};canvas.style.cursor='grabbing';return;}
  if(e.button===0){
    // Connect mode — click ports
    if(connectMode){
      const pa=portAtPos(wp.x,wp.y);
      if(pa){
        if(!connectSource){connectSource=pa.node.id;connectSourcePort=pa.port;}
        else{addConnection(connectSource,connectSourcePort,pa.node.id,pa.port,100);
          connectSource=null;connectSourcePort=null;
          if(simulating){runSim();spawnParticles();renderProps();}render();}
      }return;
    }
    // Resize handle
    if(selectedId){const sn=nodes.find(n=>n.id===selectedId);
      if(sn){const h=getResizeHandle(sn,wp.x,wp.y);
        if(h){dragging={type:'resize',id:sn.id,handle:h,origX:sn.x,origY:sn.y,origW:sn.w,origH:sn.h,startWx:wp.x,startWy:wp.y};return;}}}
    // Check if clicking a connection
    const cc=connAtPos(wp.x,wp.y);
    const node=nodeAtPos(wp.x,wp.y);
    if(node){selectNode(node.id);dragging={type:'node',id:node.id,ox:wp.x-node.x,oy:wp.y-node.y};}
    else if(cc){selectConn(cc.id);}
    else{selectedId=null;selectedConnId=null;renderProps();render();}
  }
});

canvas.addEventListener('mousemove',e=>{
  const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top;
  mouseWorld=s2w(sx,sy);
  if(dragging){
    if(dragging.type==='pan'){cam.x=dragging.cx+(e.clientX-dragging.sx);cam.y=dragging.cy+(e.clientY-dragging.sy);}
    else if(dragging.type==='node'){const n=nodes.find(nn=>nn.id===dragging.id);
      if(n){n.x=Math.round((mouseWorld.x-dragging.ox)/10)*10;n.y=Math.round((mouseWorld.y-dragging.oy)/10)*10;}}
    else if(dragging.type==='resize'){
      const n=nodes.find(nn=>nn.id===dragging.id),h=dragging.handle;if(!n)return;
      const dx=mouseWorld.x-dragging.startWx,dy=mouseWorld.y-dragging.startWy;
      const minW=60,minH=40;
      if(h.dx===1){n.w=Math.max(minW,Math.round((dragging.origW+dx)/10)*10);}
      if(h.dx===-1){const nw=Math.max(minW,Math.round((dragging.origW-dx)/10)*10);n.x=dragging.origX+dragging.origW-nw;n.w=nw;}
      if(h.dy===1){n.h=Math.max(minH,Math.round((dragging.origH+dy)/10)*10);}
      if(h.dy===-1){const nh=Math.max(minH,Math.round((dragging.origH-dy)/10)*10);n.y=dragging.origY+dragging.origH-nh;n.h=nh;}
    }
    render();
  } else {
    if(selectedId){const sn=nodes.find(n=>n.id===selectedId);
      if(sn){const h=getResizeHandle(sn,mouseWorld.x,mouseWorld.y);canvas.style.cursor=h?h.cursor:'';}}
    else canvas.style.cursor='';
    if(connectMode&&connectSource!==null)render();
  }
});

canvas.addEventListener('mouseup',()=>{if(dragging&&(dragging.type==='node'||dragging.type==='resize'))saveAll();dragging=null;canvas.style.cursor='';});

canvas.addEventListener('wheel',e=>{
  e.preventDefault();const rect=canvas.getBoundingClientRect(),sx=e.clientX-rect.left,sy=e.clientY-rect.top;
  const oz=cam.zoom,d=e.deltaY>0?.9:1.1;cam.zoom=Math.max(.2,Math.min(3,cam.zoom*d));
  cam.x=sx-(sx-cam.x)*(cam.zoom/oz);cam.y=sy-(sy-cam.y)*(cam.zoom/oz);
  document.getElementById('zoomLvl').textContent=Math.round(cam.zoom*100)+'%';render();
},{passive:false});

canvas.addEventListener('contextmenu',e=>{
  e.preventDefault();const rect=canvas.getBoundingClientRect();
  const wp=s2w(e.clientX-rect.left,e.clientY-rect.top);
  const cc=connAtPos(wp.x,wp.y);const node=nodeAtPos(wp.x,wp.y);
  showCtx(e.clientX,e.clientY,node,cc);
});

document.addEventListener('keydown',e=>{
  if(e.code==='Space'){spaceDown=true;e.preventDefault();}
  if(e.code==='KeyC'&&!e.ctrlKey&&!e.metaKey&&document.activeElement.tagName!=='INPUT')toggleConnectMode();
  if((e.code==='Delete'||e.code==='Backspace')&&document.activeElement.tagName!=='INPUT'){
    if(selectedConnId){removeConnection(selectedConnId);render();}
    else if(selectedId){removeNode(selectedId);render();}
  }
  if(e.code==='Escape'){if(connectMode)toggleConnectMode();connectSource=null;connectSourcePort=null;render();}
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
    if(node){selectNode(node.id);dragging={type:'node',id:node.id,ox:wp.x-node.x,oy:wp.y-node.y};}
    else{const cc=connAtPos(wp.x,wp.y);if(cc)selectConn(cc.id);
      else{selectedId=null;selectedConnId=null;renderProps();dragging={type:'pan',sx:t.clientX,sy:t.clientY,cx:cam.x,cy:cam.y};}}render();}
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
    else if(dragging.type==='node'){const n=nodes.find(nn=>nn.id===dragging.id);
      if(n){n.x=Math.round((mouseWorld.x-dragging.ox)/10)*10;n.y=Math.round((mouseWorld.y-dragging.oy)/10)*10;}}render();}
},{passive:false});
canvas.addEventListener('touchend',()=>{if(dragging&&dragging.type==='node')saveAll();dragging=null;});

// Drag from toolbar
document.querySelectorAll('.tool-item').forEach(item=>{
  item.addEventListener('dragstart',e=>{e.dataTransfer.setData('nodeType',item.dataset.type);e.dataTransfer.effectAllowed='copy';});
});
const canvasArea=document.getElementById('canvasArea');
canvasArea.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
canvasArea.addEventListener('drop',e=>{e.preventDefault();const type=e.dataTransfer.getData('nodeType');
  if(!type||!TYPES[type])return;const rect=canvas.getBoundingClientRect();
  const wp=s2w(e.clientX-rect.left,e.clientY-rect.top);
  addNode(type,Math.round((wp.x-TYPES[type].w/2)/10)*10,Math.round((wp.y-TYPES[type].h/2)/10)*10);render();
});

// Context menu
function showCtx(x,y,node,conn){
  const m=document.getElementById('ctxMenu');
  if(node) m.innerHTML=`
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
  const nn=addNode(n.type,n.x+30,n.y+30);nn.label=n.label+' (copia)';nn.capacity=n.capacity;
  nn.oee=n.oee;nn.personnel=n.personnel;nn.prodPerPerson=n.prodPerPerson;nn.w=n.w;nn.h=n.h;nn.icon=n.icon;render();}
document.addEventListener('click',e=>{if(!e.target.closest('.ctx-menu'))hideCtx();});

// Modes
function toggleConnectMode(){connectMode=!connectMode;connectSource=null;connectSourcePort=null;
  const btn=document.getElementById('connectBtn'),ind=document.getElementById('modeInd');
  if(connectMode){btn.classList.add('primary');btn.textContent='\u2713 Conectando...';ind.className='mode-ind connect';ind.innerHTML='Clic en un PUERTO del origen, luego en un PUERTO del destino — ESC cancelar';}
  else{btn.classList.remove('primary');btn.textContent='Conectar';ind.className='mode-ind';ind.innerHTML='';}render();}

function toggleSimulation(){simulating=!simulating;
  const btn=document.getElementById('simBtn'),ind=document.getElementById('modeInd');
  if(simulating){btn.classList.remove('success');btn.classList.add('danger');btn.innerHTML='&#9632; Parar';
    ind.className='mode-ind simulate';ind.innerHTML='Simulacion activa';runSim();spawnParticles();renderProps();animLoop();}
  else{btn.classList.remove('danger');btn.classList.add('success');btn.innerHTML='&#9654; Simular';
    ind.className='mode-ind';ind.innerHTML='';particles=[];
    nodes.forEach(n=>{n.status='idle';n.inputFlow=0;n.outputFlow=0;});
    connections.forEach(c=>{c.flow=0;c.status='idle';});
    renderProps();render();}
}
let _animFrame=0;
function animLoop(){if(!simulating)return;_animFrame++;updateParticles();
  if(_animFrame%120===0){runSim();spawnParticles();renderProps();}
  render();requestAnimationFrame(animLoop);}

// ==================== SCHEDULE ====================
function openSchedule(){renderSched();document.getElementById('schedOvl').classList.add('visible');}
function renderSched(){
  document.getElementById('shiftTimes').innerHTML=SN.map((s,i)=>{const sh=schedule.shifts[s];
    return`<div class="shift-tg"><strong>${SL[i]}</strong><label>De</label><input type="time" value="${sh.start}" onchange="schedule.shifts['${s}'].start=this.value;renderSched();">
    <label>A</label><input type="time" value="${sh.end}" onchange="schedule.shifts['${s}'].end=this.value;renderSched();"></div>`;}).join('');
  SN.forEach((s,i)=>{document.getElementById('sL'+i).textContent=schedule.shifts[s].start+'-'+schedule.shifts[s].end;});
  document.getElementById('schedBody').innerHTML=DAYS.map(day=>{const d=schedule.days[day];
    let tp=0,th=0;
    const cells=SN.map(s=>{const c=d[s];if(c.active){tp+=c.personnel;th+=shiftH(s);}
      return`<td><div class="sched-cell"><button class="shift-tog ${c.active?'on':'off'}" onclick="schedule.days['${day}']['${s}'].active=!schedule.days['${day}']['${s}'].active;renderSched();"></button>
        <input type="number" min="0" max="999" value="${c.personnel}" ${c.active?'':'disabled style="opacity:.3"'} onchange="schedule.days['${day}']['${s}'].personnel=+this.value;renderSched();">
        <span style="font-size:8px;color:var(--text-dim)">pers.</span></div></td>`;}).join('');
    return`<tr><td>${day}</td>${cells}<td style="font-weight:700;color:var(--accent-light)">${tp}</td><td style="font-weight:600">${th}h</td></tr>`;}).join('');
}
function shiftH(s){const sh=schedule.shifts[s];const[h1,m1]=sh.start.split(':').map(Number),[h2,m2]=sh.end.split(':').map(Number);
  let a=h1+m1/60,b=h2+m2/60;if(b<=a)b+=24;return Math.round((b-a)*10)/10;}

// ==================== SAVE/LOAD ====================
const SK='efenia_wh_sim_v3';
function saveAll(){localStorage.setItem(SK,JSON.stringify({nodes,connections,cam,idCounter,connIdCounter,schedule}));}
function loadAll(){
  const r=localStorage.getItem(SK);if(!r)return;
  try{
    const d=JSON.parse(r);
    nodes=d.nodes||[];connections=d.connections||[];cam=d.cam||{x:0,y:0,zoom:1};
    idCounter=d.idCounter||1;connIdCounter=d.connIdCounter||1;
    // Migrate old connections
    connections.forEach(c=>{
      if(!c.id)c.id=++connIdCounter;
      if(!c.fromPort)c.fromPort='right';
      if(!c.toPort)c.toPort='left';
      if(!c.label)c.label='';
      if(!c.capacity)c.capacity=9999;
      if(c.flow===undefined)c.flow=0;
      if(!c.status)c.status='idle';
    });
    // Migrate nodes without icon
    nodes.forEach(n=>{if(!n.icon&&TYPES[n.type])n.icon=TYPES[n.type].icon;});
    if(d.schedule){schedule=d.schedule;DAYS.forEach(dd=>{if(!schedule.days[dd])schedule.days[dd]={};SN.forEach(s=>{if(!schedule.days[dd][s])schedule.days[dd][s]={active:false,personnel:0};});});}
    document.getElementById('zoomLvl').textContent=Math.round(cam.zoom*100)+'%';updateStats();
  }catch(e){}
}
function clearAll(){if(!confirm('Borrar todo?'))return;nodes=[];connections=[];selectedId=null;selectedConnId=null;particles=[];idCounter=1;connIdCounter=1;saveAll();renderProps();updateStats();render();}
function exportJSON(){const d=JSON.stringify({nodes,connections,idCounter,connIdCounter,schedule},null,2);
  const b=new Blob([d],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download='efenia-warehouse.json';a.click();URL.revokeObjectURL(u);}
function importJSON(){const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);nodes=d.nodes||[];connections=d.connections||[];
      idCounter=d.idCounter||1;connIdCounter=d.connIdCounter||1;if(d.schedule)schedule=d.schedule;
      connections.forEach(c=>{if(!c.id)c.id=++connIdCounter;if(!c.fromPort)c.fromPort='right';if(!c.toPort)c.toPort='left';if(!c.label)c.label='';if(!c.capacity)c.capacity=9999;});
      nodes.forEach(n=>{if(!n.icon&&TYPES[n.type])n.icon=TYPES[n.type].icon;});
      saveAll();renderProps();updateStats();render();}catch(err){alert('Error: '+err.message);}};r.readAsText(f);};inp.click();}

function updateStats(){
  document.getElementById('stE').textContent=nodes.length+' elementos';
  document.getElementById('stC').textContent=connections.length+' conexiones';
  const bn=nodes.filter(n=>n.status==='red').length+connections.filter(c=>c.status==='red').length;
  document.getElementById('stB').textContent=bn+' cuellos de botella';
}

function showHelp(){document.getElementById('helpOvl').classList.add('visible');}

// ==================== MOBILE ====================
function toggleMobileToolbar(){const tb=document.getElementById('toolbarPanel'),pr=document.getElementById('propsPanel'),bd=document.getElementById('panelBackdrop');
  pr.classList.remove('open');const o=tb.classList.toggle('open');bd.classList.toggle('visible',o);}
function toggleMobileProps(){const tb=document.getElementById('toolbarPanel'),pr=document.getElementById('propsPanel'),bd=document.getElementById('panelBackdrop');
  tb.classList.remove('open');const o=pr.classList.toggle('open');bd.classList.toggle('visible',o);}
function closeMobilePanels(){document.getElementById('toolbarPanel').classList.remove('open');document.getElementById('propsPanel').classList.remove('open');document.getElementById('panelBackdrop').classList.remove('visible');}
function addNodeCenter(type){const a=document.getElementById('canvasArea'),wp=s2w(a.clientWidth/2,a.clientHeight/2);
  const ox=(Math.random()-.5)*80,oy=(Math.random()-.5)*80;
  addNode(type,Math.round((wp.x+ox)/10)*10,Math.round((wp.y+oy)/10)*10);render();}

// Auto-open props on mobile
const _sel=selectNode;selectNode=function(id){_sel(id);
  if(id!==null&&window.innerWidth<=768){document.getElementById('toolbarPanel').classList.remove('open');
    document.getElementById('propsPanel').classList.add('open');document.getElementById('panelBackdrop').classList.add('visible');}};

// Mobile add bar
(function(){const bar=document.getElementById('mobileAddBar');
  const items=[['entradas','\u{1F69A}','Entradas'],['almacen_manual','\u{1F4E6}','Almacen'],['sorter_area','\u{1F500}','Sorter'],
    ['expediciones_area','\u{1F4E6}','Exped.'],['online','\u{1F310}','Online'],['dock','\u25B2','Muelle'],
    ['conveyor','\u27A4','Conv.'],['miniload','\u2699','MiniLoad'],['custom','\u271A','Custom'],
    ['custom_macro','\u271A','M.Custom'],['custom_area','\u271A','A.Custom']];
  bar.innerHTML=items.map(([t,ic,lb])=>`<div class="mai" onclick="addNodeCenter('${t}')"><span>${ic}</span>${lb}</div>`).join('');
})();

// ==================== INIT ====================
loadAll();resize();render();
if(!localStorage.getItem('efenia_help3')){showHelp();localStorage.setItem('efenia_help3','1');}
