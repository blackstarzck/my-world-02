import { Vector3 } from 'three';
import { screenSize } from './space.js';
import { createMotion } from './motion.js';

export function frontPose(art, aspect) {
  const yaw = art.yaw*Math.PI/180, zoom = Math.min(1,aspect/.76);
  const distance = Math.max(4.3,screenSize.width*zoom/(2*Math.tan(Math.PI/6)*aspect*.78));
  return { position: new Vector3(art.x+Math.sin(yaw)*distance,art.y,art.z+Math.cos(yaw)*distance), yaw, pitch: 0 };
}

// Reuse the bounded, reversible movement curve: 6.6 units takes 1.2 seconds.
// Completion is consumed only after the caller has rendered the frontal view.
export function createInspection() {
  const span = 6.6, motion = createMotion(0,{max:span});
  let phase = 'idle', hold = 0, delivered = false, immediate = false;
  return {
    get phase() { return phase; },
    get blend() { return motion.position/span; },
    open(skip = false) {
      motion.target(span,skip); phase = skip ? 'front' : 'approaching';
      hold = 0; delivered = false; immediate = skip;
    },
    close(skip = false) {
      motion.target(0,skip); phase = motion.moving ? 'returning' : 'idle'; delivered = true;
    },
    reset() { motion.target(0,true); phase = 'idle'; delivered = true; },
    settle() {
      motion.target(motion.destination,true);
      phase = motion.destination === 0 ? 'idle' : 'front'; immediate = true;
    },
    step(dt) {
      motion.step(dt);
      if (phase === 'approaching' && !motion.moving) { phase = 'front'; hold = 0; }
      else if (phase === 'front') hold += dt;
      else if (phase === 'returning' && !motion.moving) phase = 'idle';
    },
    takeReady() {
      if (phase !== 'front' || delivered || (!immediate && hold < .24)) return false;
      delivered = true; return true;
    },
  };
}
