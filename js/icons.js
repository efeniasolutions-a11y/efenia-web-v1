// ==================== ICON DATABASE ====================
// Each icon is a function that draws on a canvas 2d context at (0,0) within a size box.
// Usage: ICONS.truck(ctx, x, y, size, color)

const ICONS = {
  // ── MACRO icons ──
  factory: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Main building
    ctx.beginPath();ctx.rect(s*.15,s*.35,s*.7,s*.5);ctx.stroke();
    // Chimney
    ctx.beginPath();ctx.rect(s*.55,s*.15,s*.12,s*.2);ctx.stroke();
    // Smoke
    ctx.beginPath();ctx.arc(s*.61,s*.1,s*.04,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.68,s*.06,s*.03,0,Math.PI*2);ctx.stroke();
    // Door
    ctx.beginPath();ctx.rect(s*.38,s*.6,s*.24,s*.25);ctx.stroke();
    // Windows
    ctx.fillRect(s*.2,s*.42,s*.12,s*.1);
    ctx.fillRect(s*.68,s*.42,s*.12,s*.1);
    ctx.restore();
  },
  office: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Building
    ctx.beginPath();ctx.rect(s*.2,s*.15,s*.6,s*.7);ctx.stroke();
    // Windows grid
    for(let r=0;r<3;r++)for(let c=0;c<2;c++){ctx.fillRect(s*(.3+c*.22),s*(.22+r*.2),s*.12,s*.1);}
    // Door
    ctx.beginPath();ctx.rect(s*.4,s*.65,s*.2,s*.2);ctx.stroke();
    ctx.restore();
  },
  warehouse: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Roof
    ctx.beginPath();ctx.moveTo(s*.1,s*.4);ctx.lineTo(s*.5,s*.12);ctx.lineTo(s*.9,s*.4);ctx.stroke();
    // Walls
    ctx.beginPath();ctx.rect(s*.1,s*.4,s*.8,s*.45);ctx.stroke();
    // Big door
    ctx.beginPath();ctx.rect(s*.3,s*.5,s*.4,s*.35);ctx.stroke();
    // Door lines
    ctx.beginPath();ctx.moveTo(s*.5,s*.5);ctx.lineTo(s*.5,s*.85);ctx.stroke();
    ctx.restore();
  },

  // ── AREA icons ──
  truck: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Cargo
    ctx.beginPath();ctx.rect(s*.05,s*.25,s*.5,s*.4);ctx.stroke();
    // Cabin
    ctx.beginPath();ctx.moveTo(s*.55,s*.35);ctx.lineTo(s*.85,s*.35);ctx.lineTo(s*.9,s*.5);ctx.lineTo(s*.9,s*.65);ctx.lineTo(s*.55,s*.65);ctx.closePath();ctx.stroke();
    // Wheels
    ctx.beginPath();ctx.arc(s*.25,s*.72,s*.07,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.75,s*.72,s*.07,0,Math.PI*2);ctx.stroke();
    // Window
    ctx.fillStyle=col;ctx.globalAlpha=.3;ctx.fillRect(s*.62,s*.38,s*.18,s*.12);ctx.globalAlpha=1;
    ctx.restore();
  },
  shelves: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';
    // Uprights
    ctx.beginPath();ctx.moveTo(s*.2,s*.1);ctx.lineTo(s*.2,s*.9);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.8,s*.1);ctx.lineTo(s*.8,s*.9);ctx.stroke();
    // Shelves
    for(let i=0;i<4;i++){const yy=s*(.15+i*.22);ctx.beginPath();ctx.moveTo(s*.15,yy);ctx.lineTo(s*.85,yy);ctx.stroke();}
    // Boxes
    ctx.globalAlpha=.4;
    ctx.fillRect(s*.28,s*.2,s*.15,s*.12);ctx.fillRect(s*.55,s*.2,s*.18,s*.12);
    ctx.fillRect(s*.25,s*.42,s*.2,s*.12);ctx.fillRect(s*.6,s*.42,s*.12,s*.12);
    ctx.fillRect(s*.3,s*.64,s*.12,s*.12);ctx.fillRect(s*.52,s*.64,s*.2,s*.12);
    ctx.globalAlpha=1;
    ctx.restore();
  },
  sorting: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Input arrow
    ctx.beginPath();ctx.moveTo(s*.1,s*.5);ctx.lineTo(s*.4,s*.5);ctx.stroke();
    // Center box
    ctx.beginPath();ctx.rect(s*.35,s*.3,s*.3,s*.4);ctx.stroke();
    // Arrows
    ctx.fillStyle=col;
    // Output arrows
    ctx.beginPath();ctx.moveTo(s*.65,s*.35);ctx.lineTo(s*.9,s*.2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.65,s*.5);ctx.lineTo(s*.9,s*.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.65,s*.65);ctx.lineTo(s*.9,s*.8);ctx.stroke();
    // Arrow heads
    const ah=(xx,yy,ang)=>{ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-s*.08*Math.cos(ang-.4),yy-s*.08*Math.sin(ang-.4));ctx.lineTo(xx-s*.08*Math.cos(ang+.4),yy-s*.08*Math.sin(ang+.4));ctx.fill();};
    ah(s*.9,s*.2,Math.atan2(-.3,.25));ah(s*.9,s*.5,0);ah(s*.9,s*.8,Math.atan2(.3,.25));
    ctx.restore();
  },
  box_out: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Box
    ctx.beginPath();ctx.rect(s*.2,s*.25,s*.4,s*.35);ctx.stroke();
    // Tape
    ctx.beginPath();ctx.moveTo(s*.4,s*.25);ctx.lineTo(s*.4,s*.6);ctx.stroke();
    // Arrow out
    ctx.beginPath();ctx.moveTo(s*.65,s*.5);ctx.lineTo(s*.9,s*.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.85,s*.42);ctx.lineTo(s*.92,s*.5);ctx.lineTo(s*.85,s*.58);ctx.fill();
    ctx.restore();
  },
  warning: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Triangle
    ctx.beginPath();ctx.moveTo(s*.5,s*.1);ctx.lineTo(s*.9,s*.85);ctx.lineTo(s*.1,s*.85);ctx.closePath();ctx.stroke();
    // !
    ctx.beginPath();ctx.moveTo(s*.5,s*.35);ctx.lineTo(s*.5,s*.58);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.5,s*.7,s*.04,0,Math.PI*2);ctx.fill();
    ctx.restore();
  },
  globe: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';
    // Circle
    ctx.beginPath();ctx.arc(s*.5,s*.5,s*.35,0,Math.PI*2);ctx.stroke();
    // Latitude
    ctx.beginPath();ctx.ellipse(s*.5,s*.5,s*.35,s*.12,0,0,Math.PI*2);ctx.stroke();
    // Longitude
    ctx.beginPath();ctx.ellipse(s*.5,s*.5,s*.12,s*.35,0,0,Math.PI*2);ctx.stroke();
    // Equator
    ctx.beginPath();ctx.moveTo(s*.15,s*.5);ctx.lineTo(s*.85,s*.5);ctx.stroke();
    ctx.restore();
  },

  // ── ELEMENT icons ──
  dock: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Platform
    ctx.beginPath();ctx.rect(s*.1,s*.55,s*.8,s*.15);ctx.stroke();
    // Ramp
    ctx.beginPath();ctx.moveTo(s*.25,s*.55);ctx.lineTo(s*.15,s*.3);ctx.lineTo(s*.85,s*.3);ctx.lineTo(s*.75,s*.55);ctx.stroke();
    // Arrow down
    ctx.beginPath();ctx.moveTo(s*.5,s*.1);ctx.lineTo(s*.5,s*.28);ctx.stroke();
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(s*.42,s*.22);ctx.lineTo(s*.5,s*.3);ctx.lineTo(s*.58,s*.22);ctx.fill();
    ctx.restore();
  },
  conveyor: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';
    // Belt top
    ctx.beginPath();ctx.moveTo(s*.1,s*.45);ctx.lineTo(s*.9,s*.45);ctx.stroke();
    // Belt bottom
    ctx.beginPath();ctx.moveTo(s*.1,s*.6);ctx.lineTo(s*.9,s*.6);ctx.stroke();
    // Rollers
    ctx.beginPath();ctx.arc(s*.1,s*.525,s*.08,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.9,s*.525,s*.08,0,Math.PI*2);ctx.stroke();
    // Direction arrow
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(s*.55,s*.3);ctx.lineTo(s*.75,s*.38);ctx.lineTo(s*.55,s*.42);ctx.fill();
    // Rollers inside
    for(let i=0;i<3;i++){const xx=s*(.3+i*.2);ctx.beginPath();ctx.moveTo(xx,s*.45);ctx.lineTo(xx,s*.6);ctx.stroke();}
    ctx.restore();
  },
  sorter_el: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Diverter shape
    ctx.beginPath();ctx.moveTo(s*.1,s*.5);ctx.lineTo(s*.45,s*.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.45,s*.5);ctx.lineTo(s*.9,s*.25);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.45,s*.5);ctx.lineTo(s*.9,s*.75);ctx.stroke();
    // Arrow heads
    const ah=(xx,yy,ang)=>{ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-s*.07*Math.cos(ang-.4),yy-s*.07*Math.sin(ang-.4));ctx.lineTo(xx-s*.07*Math.cos(ang+.4),yy-s*.07*Math.sin(ang+.4));ctx.fill();};
    ah(s*.9,s*.25,Math.atan2(-.25,.45));ah(s*.9,s*.75,Math.atan2(.25,.45));
    // Center pivot
    ctx.beginPath();ctx.arc(s*.45,s*.5,s*.06,0,Math.PI*2);ctx.fill();
    ctx.restore();
  },
  miniload: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Left rack
    ctx.beginPath();ctx.rect(s*.08,s*.1,s*.22,s*.8);ctx.stroke();
    // Right rack
    ctx.beginPath();ctx.rect(s*.7,s*.1,s*.22,s*.8);ctx.stroke();
    // Shelves
    for(let i=1;i<4;i++){const yy=s*(.1+i*.2);
      ctx.beginPath();ctx.moveTo(s*.08,yy);ctx.lineTo(s*.3,yy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(s*.7,yy);ctx.lineTo(s*.92,yy);ctx.stroke();}
    // Crane in middle
    ctx.beginPath();ctx.moveTo(s*.5,s*.12);ctx.lineTo(s*.5,s*.88);ctx.stroke();
    // Shuttle
    ctx.fillStyle=col;ctx.fillRect(s*.4,s*.45,s*.2,s*.12);
    ctx.restore();
  },
  packstation: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Table
    ctx.beginPath();ctx.rect(s*.15,s*.35,s*.7,s*.35);ctx.stroke();
    // Legs
    ctx.beginPath();ctx.moveTo(s*.2,s*.7);ctx.lineTo(s*.2,s*.88);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.8,s*.7);ctx.lineTo(s*.8,s*.88);ctx.stroke();
    // Box on table
    ctx.beginPath();ctx.rect(s*.3,s*.2,s*.25,s*.15);ctx.stroke();
    // Tape on box
    ctx.beginPath();ctx.moveTo(s*.425,s*.2);ctx.lineTo(s*.425,s*.35);ctx.stroke();
    // Tape roll
    ctx.beginPath();ctx.arc(s*.72,s*.28,s*.08,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  },
  buffer: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';
    // Stack of items
    for(let i=0;i<3;i++){
      const yy=s*(.2+i*.22);ctx.globalAlpha=1-i*.2;
      ctx.beginPath();ctx.rect(s*.2,yy,s*.6,s*.16);ctx.stroke();
    }
    ctx.globalAlpha=1;
    // Pause marks
    ctx.beginPath();ctx.moveTo(s*.42,s*.82);ctx.lineTo(s*.42,s*.92);ctx.lineWidth=s*.08;ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.58,s*.82);ctx.lineTo(s*.58,s*.92);ctx.stroke();
    ctx.restore();
  },
  custom: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';
    // Plus sign
    ctx.beginPath();ctx.moveTo(s*.5,s*.2);ctx.lineTo(s*.5,s*.8);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.2,s*.5);ctx.lineTo(s*.8,s*.5);ctx.stroke();
    ctx.restore();
  },
  gear: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';
    const cx=s*.5,cy=s*.5,r1=s*.22,r2=s*.32,teeth=8;
    ctx.beginPath();
    for(let i=0;i<teeth;i++){
      const a1=(i/teeth)*Math.PI*2,a2=((i+.3)/teeth)*Math.PI*2,a3=((i+.5)/teeth)*Math.PI*2,a4=((i+.8)/teeth)*Math.PI*2;
      ctx.lineTo(cx+r1*Math.cos(a1),cy+r1*Math.sin(a1));
      ctx.lineTo(cx+r2*Math.cos(a2),cy+r2*Math.sin(a2));
      ctx.lineTo(cx+r2*Math.cos(a3),cy+r2*Math.sin(a3));
      ctx.lineTo(cx+r1*Math.cos(a4),cy+r1*Math.sin(a4));
    }
    ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,s*.1,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  },
  robot: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Head
    ctx.beginPath();ctx.rect(s*.3,s*.15,s*.4,s*.3);ctx.stroke();
    // Eyes
    ctx.fillRect(s*.38,s*.25,s*.08,s*.08);ctx.fillRect(s*.54,s*.25,s*.08,s*.08);
    // Body
    ctx.beginPath();ctx.rect(s*.25,s*.5,s*.5,s*.3);ctx.stroke();
    // Antenna
    ctx.beginPath();ctx.moveTo(s*.5,s*.15);ctx.lineTo(s*.5,s*.07);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.5,s*.05,s*.03,0,Math.PI*2);ctx.fill();
    // Arms
    ctx.beginPath();ctx.moveTo(s*.25,s*.55);ctx.lineTo(s*.12,s*.7);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.75,s*.55);ctx.lineTo(s*.88,s*.7);ctx.stroke();
    ctx.restore();
  },
  pallet: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Pallet top
    ctx.beginPath();ctx.rect(s*.1,s*.55,s*.8,s*.08);ctx.stroke();
    // Pallet legs
    ctx.beginPath();ctx.rect(s*.15,s*.63,s*.1,s*.15);ctx.stroke();
    ctx.beginPath();ctx.rect(s*.45,s*.63,s*.1,s*.15);ctx.stroke();
    ctx.beginPath();ctx.rect(s*.75,s*.63,s*.1,s*.15);ctx.stroke();
    // Box on pallet
    ctx.beginPath();ctx.rect(s*.2,s*.2,s*.6,s*.35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.5,s*.2);ctx.lineTo(s*.5,s*.55);ctx.stroke();
    ctx.restore();
  },
  forklift: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Mast
    ctx.beginPath();ctx.moveTo(s*.3,s*.15);ctx.lineTo(s*.3,s*.7);ctx.stroke();
    // Forks
    ctx.beginPath();ctx.moveTo(s*.3,s*.65);ctx.lineTo(s*.1,s*.65);ctx.lineTo(s*.1,s*.72);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.3,s*.55);ctx.lineTo(s*.1,s*.55);ctx.lineTo(s*.1,s*.62);ctx.stroke();
    // Body
    ctx.beginPath();ctx.rect(s*.3,s*.35,s*.45,s*.35);ctx.stroke();
    // Roof
    ctx.beginPath();ctx.moveTo(s*.3,s*.35);ctx.lineTo(s*.35,s*.2);ctx.lineTo(s*.7,s*.2);ctx.lineTo(s*.75,s*.35);ctx.stroke();
    // Wheels
    ctx.beginPath();ctx.arc(s*.4,s*.78,s*.07,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.65,s*.78,s*.07,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  },
  label: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Tag shape
    ctx.beginPath();ctx.moveTo(s*.6,s*.15);ctx.lineTo(s*.85,s*.15);ctx.lineTo(s*.85,s*.85);ctx.lineTo(s*.6,s*.85);ctx.lineTo(s*.2,s*.5);ctx.closePath();ctx.stroke();
    // Hole
    ctx.beginPath();ctx.arc(s*.65,s*.5,s*.05,0,Math.PI*2);ctx.stroke();
    // Lines
    ctx.beginPath();ctx.moveTo(s*.72,s*.35);ctx.lineTo(s*.8,s*.35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.72,s*.5);ctx.lineTo(s*.8,s*.5);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.72,s*.65);ctx.lineTo(s*.8,s*.65);ctx.stroke();
    ctx.restore();
  },
  scale: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Base
    ctx.beginPath();ctx.rect(s*.15,s*.7,s*.7,s*.1);ctx.stroke();
    // Pillar
    ctx.beginPath();ctx.moveTo(s*.5,s*.7);ctx.lineTo(s*.5,s*.35);ctx.stroke();
    // Arms
    ctx.beginPath();ctx.moveTo(s*.15,s*.35);ctx.lineTo(s*.85,s*.35);ctx.stroke();
    // Pans
    ctx.beginPath();ctx.moveTo(s*.15,s*.35);ctx.lineTo(s*.1,s*.55);ctx.lineTo(s*.35,s*.55);ctx.lineTo(s*.3,s*.35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.7,s*.35);ctx.lineTo(s*.65,s*.55);ctx.lineTo(s*.9,s*.55);ctx.lineTo(s*.85,s*.35);ctx.stroke();
    ctx.restore();
  },
  scanner: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';
    // Scanner body
    ctx.beginPath();ctx.rect(s*.3,s*.15,s*.4,s*.55);ctx.stroke();
    // Screen
    ctx.fillStyle=col;ctx.globalAlpha=.2;ctx.fillRect(s*.35,s*.2,s*.3,s*.2);ctx.globalAlpha=1;
    // Handle
    ctx.beginPath();ctx.moveTo(s*.4,s*.7);ctx.lineTo(s*.35,s*.9);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.6,s*.7);ctx.lineTo(s*.65,s*.9);ctx.stroke();
    // Beam
    ctx.strokeStyle=col;ctx.lineWidth=s*.03;
    ctx.beginPath();ctx.moveTo(s*.1,s*.45);ctx.lineTo(s*.3,s*.45);ctx.stroke();
    ctx.restore();
  },
  crossdock: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Building
    ctx.beginPath();ctx.rect(s*.15,s*.25,s*.7,s*.5);ctx.stroke();
    // Left doors
    ctx.beginPath();ctx.rect(s*.15,s*.4,s*.12,s*.2);ctx.stroke();
    ctx.beginPath();ctx.rect(s*.15,s*.62,s*.12,s*.13);ctx.stroke();
    // Right doors
    ctx.beginPath();ctx.rect(s*.73,s*.4,s*.12,s*.2);ctx.stroke();
    ctx.beginPath();ctx.rect(s*.73,s*.62,s*.12,s*.13);ctx.stroke();
    // Through arrows
    ctx.beginPath();ctx.moveTo(s*.35,s*.5);ctx.lineTo(s*.65,s*.5);ctx.stroke();
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(s*.6,s*.45);ctx.lineTo(s*.68,s*.5);ctx.lineTo(s*.6,s*.55);ctx.fill();
    ctx.restore();
  },
  returns: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.06;ctx.lineCap='round';ctx.lineJoin='round';
    // Box
    ctx.beginPath();ctx.rect(s*.25,s*.3,s*.5,s*.35);ctx.stroke();
    // Return arrow (U-turn)
    ctx.beginPath();ctx.arc(s*.5,s*.22,s*.15,Math.PI,0,false);ctx.stroke();
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(s*.62,s*.15);ctx.lineTo(s*.68,s*.22);ctx.lineTo(s*.62,s*.29);ctx.fill();
    ctx.restore();
  },
  cold: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';
    // Snowflake
    const cx=s*.5,cy=s*.5,r=s*.3;
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.stroke();
      // Small branches
      const mx=cx+r*.6*Math.cos(a),my=cy+r*.6*Math.sin(a);
      ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx+r*.25*Math.cos(a+.8),my+r*.25*Math.sin(a+.8));ctx.stroke();
      ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx+r*.25*Math.cos(a-.8),my+r*.25*Math.sin(a-.8));ctx.stroke();
    }
    ctx.restore();
  },
  agv: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Body
    ctx.beginPath();ctx.rect(s*.2,s*.3,s*.6,s*.35);ctx.stroke();
    // Wheels
    ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(s*.3,s*.72,s*.06,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(s*.7,s*.72,s*.06,0,Math.PI*2);ctx.fill();
    // Sensor on top
    ctx.beginPath();ctx.arc(s*.5,s*.22,s*.05,0,Math.PI*2);ctx.stroke();
    // Signal
    ctx.beginPath();ctx.arc(s*.5,s*.22,s*.12,-.8,-.2);ctx.stroke();
    ctx.beginPath();ctx.arc(s*.5,s*.22,s*.12,Math.PI+.2,Math.PI+.8);ctx.stroke();
    ctx.restore();
  },
  pickup: (ctx,x,y,s,col) => {
    ctx.save();ctx.translate(x,y);ctx.strokeStyle=col;ctx.lineWidth=s*.05;ctx.lineCap='round';ctx.lineJoin='round';
    // Shelf
    ctx.beginPath();ctx.moveTo(s*.15,s*.3);ctx.lineTo(s*.85,s*.3);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.15,s*.55);ctx.lineTo(s*.85,s*.55);ctx.stroke();
    // Hand picking
    ctx.beginPath();ctx.moveTo(s*.6,s*.15);ctx.lineTo(s*.6,s*.28);ctx.stroke();
    // Fingers
    ctx.beginPath();ctx.moveTo(s*.55,s*.28);ctx.lineTo(s*.55,s*.35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(s*.65,s*.28);ctx.lineTo(s*.65,s*.35);ctx.stroke();
    // Box being picked
    ctx.fillStyle=col;ctx.globalAlpha=.3;ctx.fillRect(s*.5,s*.35,s*.2,s*.15);ctx.globalAlpha=1;
    // Boxes on shelves
    ctx.beginPath();ctx.rect(s*.2,s*.35,s*.18,s*.15);ctx.stroke();
    ctx.beginPath();ctx.rect(s*.2,s*.6,s*.18,s*.15);ctx.stroke();
    ctx.beginPath();ctx.rect(s*.5,s*.6,s*.18,s*.15);ctx.stroke();
    ctx.restore();
  }
};

// Icon name -> display mapping for the icon picker
const ICON_CATALOG = {
  macro: ['factory','office','warehouse','custom','gear','cold','crossdock'],
  area:  ['truck','shelves','sorting','box_out','warning','globe','returns','cold','crossdock','custom'],
  element: ['dock','conveyor','sorter_el','miniload','packstation','buffer','custom','gear','robot','pallet','forklift','label','scale','scanner','agv','pickup']
};

// Friendly names for icon picker
const ICON_NAMES = {
  factory:'Fabrica', office:'Oficina', warehouse:'Almacen', custom:'Personalizado',
  truck:'Camion', shelves:'Estanterias', sorting:'Clasificacion', box_out:'Expedicion',
  warning:'Alerta', globe:'Global', dock:'Muelle', conveyor:'Conveyor', sorter_el:'Sorter',
  miniload:'MiniLoad', packstation:'Empaque', buffer:'Buffer', gear:'Engranaje', robot:'Robot',
  pallet:'Pallet', forklift:'Carretilla', label:'Etiqueta', scale:'Bascula', scanner:'Scanner',
  crossdock:'CrossDock', returns:'Devoluciones', cold:'Frio', agv:'AGV', pickup:'Picking'
};
