// A 40-degree downward tilt reveals more side detail without rotating the board.
const tilt=40*Math.PI/180,distance=Math.hypot(18,18);
export const CAMERA_OFFSET=[0,distance*Math.sin(tilt),distance*Math.cos(tilt)];
const groundProjection=CAMERA_OFFSET[1]/Math.hypot(...CAMERA_OFFSET);

// Drag and keyboard directions follow the screen; tap destinations remain world-space.
export function screenMovement(x,z){
  const strength=Math.hypot(x,z);
  const forward=z/groundProjection;
  const scale=strength/Math.max(.00001,Math.hypot(x,forward));
  return {x:x*scale,z:forward*scale};
}
