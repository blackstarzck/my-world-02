// Distance along a single rail is the only travel state. Retargeting therefore
// cannot cut a corner, and reversing must first brake the existing velocity.
export function createMotion(initial = 0, { maxSpeed = 5.8, acceleration = 8 } = {}) {
  let position = initial, destination = initial, velocity = 0;
  return {
    get position() { return position; },
    get destination() { return destination; },
    get velocity() { return velocity; },
    get moving() { return Math.abs(destination-position) > .00001 || Math.abs(velocity) > .00001; },
    target(distance, immediate = false) {
      destination = distance;
      if (immediate) { position = distance; velocity = 0; }
    },
    step(seconds) {
      // Small integration steps make braking stable at both 30 and 144 Hz.
      let remaining = Math.min(Math.max(seconds, 0), .1);
      while (remaining > 0) {
        const dt = Math.min(remaining, 1/240); remaining -= dt;
        const delta = destination-position;
        const desired = Math.sign(delta)*Math.min(maxSpeed, Math.sqrt(2*acceleration*Math.abs(delta)));
        const nextVelocity = velocity + Math.max(-acceleration*dt, Math.min(acceleration*dt, desired-velocity));
        const movement = (velocity+nextVelocity)*.5*dt;
        // Only settle when travelling towards the target. A target behind the
        // camera keeps the current velocity until braking naturally reverses it.
        if (Math.sign(movement) === Math.sign(delta) && Math.abs(movement) >= Math.abs(delta)) {
          position = destination; velocity = 0;
        } else { position += movement; velocity = nextVelocity; }
      }
      return position;
    },
  };
}
