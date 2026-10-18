// One reusable hit indicator; repeated attacks never grow a particle/DOM queue.
export function createDamageFeedback({edge,popup,hud,status,project}){
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let remaining=0,origin={x:0,z:0};
  return {
    hit(amount,position,shielded){
      if(!(amount>0))return;
      remaining=1.05;origin={x:position.x,z:position.z};
      popup.querySelector('strong').textContent=`−${Number(amount.toFixed(1))} HEALTH`;
      popup.querySelector('small').textContent=shielded?'MALWARE HIT · SHIELD ACTIVE':'MALWARE HIT';
    },
    update(dt,health,hidden=false){
      remaining=Math.max(0,remaining-dt);
      const hit=remaining>0,critical=health<=30;
      hud.classList.toggle('taking-damage',hit);hud.classList.toggle('critical-health',critical);
      status.textContent=hit?'UNDER ATTACK':critical?'LOW HEALTH · Return home':' ';
      edge.style.opacity=hidden?'0':String(Math.max(critical?.14:0,Math.min(.6,remaining*1.5)));
      popup.hidden=hidden||!hit;
      if(hit&&!hidden){
        const p=project(origin);popup.hidden=!p.visible;
        popup.style.left=p.x+'px';popup.style.top=(p.y-(reducedMotion.matches?0:(1.05-remaining)*28))+'px';
        popup.style.opacity=String(Math.min(1,remaining/.25));
      }
    },
  };
}
