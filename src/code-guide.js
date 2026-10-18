import {networkAccess} from './story.js';
import {NETWORK_DEVICES} from './world-layout.js';
// Approach the device itself: room centers can sit outside activation distance.
export function deviceApproach(id){
  const d=NETWORK_DEVICES[id];return d?{x:d.x,z:d.z-4}:null;
}
export function codeGuide(state){
  if(!networkAccess(state))return null;
  return {
    title:'Safe code · Developer Workstation',
    detail:`Follow the central corridor north of the Router Hub and approach the laptop. Collect orange 3 KB routing snippets or 6 KB scripts, then drop them off at home. The Starter Analyzer gives +1 code knowledge per file. Shield needs 8; Cleaner needs 16 plus a Shield. Optional helpers: Courier 6; Collector 14 plus a Courier.`,
    action:'Go to code source',destination:deviceApproach('developer'),
  };
}
