// Quintic travel has zero velocity and acceleration at arrival. Retargeting
// preserves the current position, velocity and acceleration instead of restarting.
function trajectory(start, end, velocity, acceleration, duration) {
  const distance = end-start, v = velocity*duration, a = acceleration*duration*duration;
  return { start, end, duration, time: 0, coefficients: [
    start, v, a/2, 10*distance-6*v-1.5*a, -15*distance+8*v+1.5*a, 6*distance-3*v-.5*a,
  ] };
}
function sample(plan, u) {
  const c = plan.coefficients, t = plan.duration;
  return {
    position: c[0]+u*(c[1]+u*(c[2]+u*(c[3]+u*(c[4]+u*c[5])))),
    velocity: (c[1]+u*(2*c[2]+u*(3*c[3]+u*(4*c[4]+u*5*c[5]))))/t,
    acceleration: (2*c[2]+u*(6*c[3]+u*(12*c[4]+u*20*c[5])))/(t*t),
  };
}
export function createMotion(initial = 0, { min = 0, max = Infinity } = {}) {
  let position = initial, destination = initial, velocity = 0, acceleration = 0, plan = null;
  const clamp = value => Math.max(min,Math.min(max,value));
  function travel() {
    const delta = destination-position;
    if (Math.abs(delta) < .000001 && Math.abs(velocity) < .00001) { position = destination; velocity = acceleration = 0; plan = null; return; }
    let duration = .65+Math.abs(delta)/12;
    if (velocity*delta > 0) duration = Math.min(duration,2.4*Math.abs(delta/velocity));
    const candidate = trajectory(position,destination,velocity,acceleration,Math.max(.08,duration));
    const direction = Math.sign(delta);
    const monotone = Array.from({length:81},(_,i) => sample(candidate,i/80)).every(s => direction*s.velocity >= -.00001
      && s.position >= Math.min(position,destination)-.00001 && s.position <= Math.max(position,destination)+.00001);
    if (Math.abs(velocity) < .00001 || (direction*velocity > 0 && monotone)) { plan = candidate; return; }
    // A reverse request brakes on the same rail before starting the return.
    const speed = Math.abs(velocity), available = velocity > 0 ? max-position : position-min;
    let brakeTime = Math.min(.6,Math.max(.2,speed/24),available*1.4/speed);
    if (velocity*acceleration < 0) brakeTime = Math.min(brakeTime,2*speed/Math.abs(acceleration));
    brakeTime = Math.max(.001,brakeTime);
    const end = clamp(position+velocity*brakeTime/2+acceleration*brakeTime*brakeTime/12);
    plan = trajectory(position,end,velocity,acceleration,brakeTime);
  }
  return {
    get position() { return position; },
    get destination() { return destination; },
    get velocity() { return velocity; },
    get acceleration() { return acceleration; },
    get moving() { return plan !== null; },
    target(distance, immediate = false) {
      const next = clamp(distance);
      if (!immediate && next === destination) return;
      destination = next;
      if (immediate) { position = destination; velocity = acceleration = 0; plan = null; }
      else travel();
    },
    step(seconds) {
      let remaining = Math.max(0,Math.min(seconds,.1));
      while (plan && remaining > 0) {
        const dt = Math.min(remaining,plan.duration-plan.time); remaining -= dt; plan.time += dt;
        const state = sample(plan,Math.min(1,plan.time/plan.duration));
        position = state.position; velocity = state.velocity; acceleration = state.acceleration;
        if (plan.time >= plan.duration) {
          position = plan.end; velocity = acceleration = 0; plan = null;
          if (Math.abs(destination-position) > .000001) travel();
        }
      }
      return position;
    },
  };
}
export function travelDim(velocity) {
  const t = Math.min(1,Math.abs(velocity)/14);
  return .18*t*t*(3-2*t);
}
