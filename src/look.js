export function createLook() {
  let x = 0, y = 0, yaw = 0, pitch = 0, moving = false;
  return {
    get moving() { return moving; },
    target(nx,ny) { x = Math.max(-1,Math.min(1,nx)); y = Math.max(-1,Math.min(1,ny)); },
    reset() { x = y = 0; },
    step(dt, { enabled = true, moving: travelling = false } = {}) {
      const scale = enabled ? (travelling ? .4 : 1) : 0, blend = 1-Math.exp(-dt*5);
      const targetYaw = -x*Math.PI/30*scale, targetPitch = -y*Math.PI/51.43*scale;
      yaw += (targetYaw-yaw)*blend;
      pitch += (targetPitch-pitch)*blend;
      if (Math.abs(targetYaw-yaw) < .00002) yaw = targetYaw;
      if (Math.abs(targetPitch-pitch) < .00002) pitch = targetPitch;
      if (!enabled) yaw = pitch = 0;
      moving = enabled && (yaw !== targetYaw || pitch !== targetPitch);
      return { yaw, pitch };
    },
  };
}
