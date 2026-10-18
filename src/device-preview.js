const presets={'phone-portrait':[390,844],'phone-landscape':[844,390],'tablet-portrait':[820,1180],'tablet-landscape':[1180,820]};
const select=document.getElementById('device'),stage=document.getElementById('stage'),frame=document.getElementById('frame'),game=document.getElementById('game');
function resize(){
  const auto=select.value==='auto',padding=auto?0:24;
  const available=[Math.max(1,stage.clientWidth-padding),Math.max(1,stage.clientHeight-padding)];
  const [width,height]=presets[select.value]||available;
  const scale=Math.min(1,available[0]/width,available[1]/height);
  frame.style.width=width*scale+'px';frame.style.height=height*scale+'px';
  game.style.width=width+'px';game.style.height=height+'px';game.style.transform=`scale(${scale})`;
  document.getElementById('dimensions').textContent=`${width} × ${height} · ${Math.round(scale*100)}% preview`;
}
select.onchange=resize;new ResizeObserver(resize).observe(stage);resize();
