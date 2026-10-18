import * as THREE from '../vendor/three/three.module.js';

// Bind once to triangles on the crown. Sampling those same vertices follows
// model transforms, morphs and future skeletal animation without per-frame rays.
export function createBrainAttachments(model,brain,parent){
  model.updateWorldMatrix(true,true);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0).transformDirection(brain.matrixWorld);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  const mounts=Array.from({length:4},(_,i)=>{
    const origin=brain.localToWorld(new THREE.Vector3(0,2,.44-i*.23));
    ray.set(origin,down);
    const hit=ray.intersectObject(model,true).find(h=>h.face);
    if(!hit)return null;
    const mesh=hit.object,indices=[hit.face.a,hit.face.b,hit.face.c];
    mesh.getVertexPosition(indices[0],a);mesh.getVertexPosition(indices[1],b);mesh.getVertexPosition(indices[2],c);
    const weights=THREE.Triangle.getBarycoord(mesh.worldToLocal(hit.point.clone()),a,b,c,new THREE.Vector3());
    return {mesh,indices,weights};
  });
  return (index,out)=>{
    const mount=mounts[index];
    if(!mount)return null;
    const {mesh,indices,weights}=mount;
    mesh.updateWorldMatrix(true,false);
    mesh.getVertexPosition(indices[0],a);mesh.getVertexPosition(indices[1],b);mesh.getVertexPosition(indices[2],c);
    out.copy(a).multiplyScalar(weights.x).addScaledVector(b,weights.y).addScaledVector(c,weights.z);
    mesh.localToWorld(out);brain.worldToLocal(out);
    out.y-=.045; // Seat the socket slightly inside the crown, hiding any seam.
    brain.localToWorld(out);parent.worldToLocal(out);
    return out;
  };
}
