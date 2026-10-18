import {SAVE_KEY,createState,serialize} from './state.js';
export const BACKUP_KEY=SAVE_KEY+'.before-restart';
export function hasRestartBackup(storage){try{return !!storage.getItem(BACKUP_KEY);}catch{return false;}}
export function restartProgress(storage,state){
  storage.setItem(BACKUP_KEY,serialize(state));
  storage.setItem(SAVE_KEY,serialize(createState()));
}
export function restoreProgress(storage){
  const previous=storage.getItem(BACKUP_KEY);
  if(!previous)throw new Error('No previous run');
  const parsed=JSON.parse(previous);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid previous run');
  storage.setItem(SAVE_KEY,serialize(createState(parsed)));
}
