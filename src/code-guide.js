import {CHAPTER,photoReady,codeAvailable} from './chapter.js';
import {NETWORK_DEVICES} from './world-layout.js';
// Approach the device itself: room centers can sit outside activation distance.
export function deviceApproach(id){
  const d=NETWORK_DEVICES[id];return d?{x:d.x,z:d.z-4}:null;
}
export function codeGuide(state){
  if(!state.unlocked)return null;
  if(!state.base.photoSorter){
    const ready=photoReady(state);
    return {
      title:'Code is locked · build Photo Sorter first',
      detail:ready?`Your cat and dog goals are complete. Build Photo Sorter at home for ${CHAPTER.photoCost} points to activate the code source.`:`Analyze and save ${CHAPTER.photoGoal} cat photos and ${CHAPTER.photoGoal} dog photos from the Photo Library, then build Photo Sorter at home for ${CHAPTER.photoCost} points.${state.base.imageMuncher?'':' Build the Image Analyzer at home too.'}`,
      action:ready?'Go home to build Photo Sorter':'Find cat & dog photos',
      destination:ready?{x:-3,z:5}:deviceApproach('photos'),
    };
  }
  return {
    title:codeAvailable(state)?'Code source · Developer Workstation':'Code source ready · connect the workstation',
    detail:`Follow the central corridor north of the Router Hub and approach the laptop. Collect orange 3 KB routing snippets or 6 KB scripts, then drop them off at home. The Starter Analyzer gives +1 code knowledge per file. Courier needs 6; Collector needs 14 plus a Courier.`,
    action:'Go to code source',destination:deviceApproach('developer'),
  };
}
