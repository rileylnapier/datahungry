export const MIN_ZOOM=.65,MAX_ZOOM=1.75;
export const clampZoom=value=>Number.isFinite(value)?Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,value)):1;
export const pinchZoom=(zoom,startDistance,distance)=>clampZoom(startDistance>0?zoom*distance/startDistance:zoom);
