export function createLook() {
  let x = 0, y = 0, yaw = 0, pitch = 0;
  return {
    target(nx,ny) { x = Math.max(-1,Math.min(1,nx)); y = Math.max(-1,Math.min(1,ny)); },
    reset() { x = y = 0; },
    step(dt, { enabled = true, moving = false } = {}) {
      const scale = enabled ? (moving ? .4 : 1) : 0, blend = 1-Math.exp(-dt*5);
      yaw += (-x*Math.PI/30*scale-yaw)*blend;
      pitch += (-y*Math.PI/51.43*scale-pitch)*blend;
      if (!enabled) yaw = pitch = 0;
      return { yaw, pitch };
    },
  };
}
