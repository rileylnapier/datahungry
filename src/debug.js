import {createState,serialize,SAVE_KEY} from './state.js';
import {CHAPTER} from './chapter.js';
export const DEBUG_KEY=SAVE_KEY+'.debug';
export function debugPreset(id){
  if(id==='sandbox')return createState();
  if(!['network','tools'].includes(id))throw Error('Unknown debug preset');
  const s=createState({unlocked:true,knowledge:{text:CHAPTER.sandboxText,image:CHAPTER.sandboxImages,code:id==='tools'?24:0},levels:{capacity:5,range:5,decode:5,parallel:3},points:250,total:3000,collected:200,trial:{legacyPassed:true},base:{imageMuncher:true,speedLevel:3,storageLevels:{text:5,image:6}}});
  if(id==='tools'){
    s.points=1000;s.base.photoSorter=true;s.base.autoSort=true;
    for(const key of Object.keys(s.programs))s.programs[key]=true;
    s.network.developerVisited=true;s.network.photosVisited=true;s.samples.cat=6;s.samples.dog=6;s.samples.routing=8;
  }
  return s;
}
// The debug session has a separate namespace; normal saves/backups are never written.
export function debugStorage(storage){
  return {getItem:key=>storage.getItem(key===SAVE_KEY?DEBUG_KEY:DEBUG_KEY+'.'+key),setItem:(key,value)=>storage.setItem(key===SAVE_KEY?DEBUG_KEY:DEBUG_KEY+'.'+key,value)};
}
export function startDebug(storage,id){storage.setItem(DEBUG_KEY,serialize(debugPreset(id)));}
