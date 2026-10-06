import { Curve, Vector3 } from 'three';

export const eyeHeight = 1.65;
export const screenSize = { width: 4.5, height: 2.8125 };
export const rooms = [
  { name: '첫 번째 전시실', x: [-8, 3], z: [-7, 3], height: 10 },
  { name: '중앙 홀', x: [-8, 14], z: [-20, -7], height: 16 },
  { name: '측면 전시실', x: [8, 23], z: [-32, -20], height: 10 },
  { name: '안쪽 전시실', x: [18, 29], z: [-44, -32], height: 10 },
];
export const exhibits = [
  { x: -7.58, y: 2.5, z: -4, yaw: 90 },
  { x: -.58, y: 2.5, z: -17, yaw: 90 },
  { x: 8.42, y: 2.5, z: -29, yaw: 90 },
  { x: 18.42, y: 2.5, z: -41, yaw: 90 },
];
export const portals = [
  { x: [-1, 3], z: -7, height: 5.2 },
  { x: [10, 14], z: -20, height: 6 },
  { x: [19, 23], z: -32, height: 5.2 },
];

// The same solids drive rendering, occlusion and route-clearance checks.
export const walls = [];
const wall = (w, h, d, x, y, z) => walls.push({ size: [w, h, d], center: [x, y, z] });
const across = (a, b, z, h, bottom = 0) => wall(b-a, h-bottom, .6, (a+b)/2, (h+bottom)/2, z);
const along = (x, a, b, h) => wall(.6, h, b-a, x, h/2, (a+b)/2);
const roomHeight = rooms[0].height, hallHeight = rooms[1].height;
along(-8, -7, 3, roomHeight); along(-8, -20, -7, hallHeight);
along(3, -7, 3, roomHeight); across(-8, 3, 3, roomHeight);
across(-8, -1, -7, roomHeight); across(-1, 3, -7, roomHeight, portals[0].height);
across(-8, 3, -7, hallHeight, roomHeight); across(3, 14, -7, hallHeight);
along(14, -20, -7, hallHeight);
// Join the exhibition wall to the entrance jamb, enclosing the unused rear bay.
// Leaving a free end exposed a separate partition and gap on the first approach.
along(-1, -20, portals[0].z, hallHeight);
across(-8, 10, -20, hallHeight); across(10, 14, -20, hallHeight, portals[1].height);
across(14, 23, -20, roomHeight);
along(8, -32, -20, roomHeight); along(23, -32, -20, roomHeight);
across(8, 19, -32, roomHeight); across(19, 23, -32, roomHeight, portals[2].height);
across(23, 29, -32, roomHeight);
along(18, -44, -32, roomHeight); along(29, -44, -32, roomHeight); across(18, 29, -44, roomHeight);

// One broad sweep through each doorway. A natural cubic keeps both tangent and
// curvature continuous; short straight/turn/straight pieces caused the old bumps.
const points = [
  [-2.6, 2.05], [-2.5, 1.2], [1.1, -7], [4.1, -10.7],
  [12, -20], [14, -23.7], [21, -32], [23.25, -35.7],
];
const stopPoints = [1, 3, 5, 7];
const depth = points.map(p => -p[1]);
const h = depth.slice(1).map((d,i) => d-depth[i]);
const second = new Array(points.length).fill(0), upper = [...second], rhs = [...second];
for (let i = 1; i < points.length-1; i++) {
  const diagonal = 2*(h[i-1]+h[i])-h[i-1]*upper[i-1];
  upper[i] = h[i]/diagonal;
  rhs[i] = (6*((points[i+1][0]-points[i][0])/h[i]-(points[i][0]-points[i-1][0])/h[i-1])-h[i-1]*rhs[i-1])/diagonal;
}
for (let i = points.length-2; i > 0; i--) second[i] = rhs[i]-upper[i]*second[i+1];
class ExhibitionRoute extends Curve {
  getPoint(t, target = new Vector3()) {
    const d = depth[0]+t*(depth.at(-1)-depth[0]);
    let i = 0;
    while (i < h.length-1 && d > depth[i+1]) i++;
    const b = (d-depth[i])/h[i], a = 1-b;
    const x = a*points[i][0]+b*points[i+1][0]+((a*a*a-a)*second[i]+(b*b*b-b)*second[i+1])*h[i]*h[i]/6;
    return target.set(x,eyeHeight,-d);
  }
}
const curve = new ExhibitionRoute();
curve.arcLengthDivisions = 12000;
const lengths = curve.getLengths();
export const routeLength = lengths.at(-1);
export const stops = stopPoints.map(pointIndex => {
  const n = (depth[pointIndex]-depth[0])/(depth.at(-1)-depth[0])*curve.arcLengthDivisions, i = Math.floor(n);
  return lengths[i]+((lengths[i+1] ?? lengths[i])-lengths[i])*(n-i);
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function sampleRoute(distance, target = new Vector3()) {
  return curve.getPointAt(clamp(distance/routeLength, 0, 1), target);
}
const stationYaw = exhibits.map((art,index) => {
  const position = sampleRoute(stops[index]);
  // Leave the artwork left of centre and show the adjoining corner on its right.
  return Math.atan2(position.x-art.x,position.z-art.z)-12*Math.PI/180;
});
export function routeYaw(distance, aspect = 16/9) {
  // Portrait framing keeps the oblique artwork within the narrow viewport.
  const portraitAim = clamp((1.2-aspect)/.5,0,1)*8*Math.PI/180;
  const i = Math.max(0, Math.min(2, stops.findIndex(stop => stop > distance)-1));
  if (distance >= stops.at(-1)) return stationYaw.at(-1)+portraitAim;
  const t = clamp((distance-stops[i])/(stops[i+1]-stops[i]), 0, 1);
  const blend = t*t*t*(10+t*(-15+6*t));
  return stationYaw[i]+(stationYaw[i+1]-stationYaw[i])*blend+portraitAim;
}
export function nearestStop(distance) {
  return stops.reduce((closest, stop, i) => Math.abs(stop-distance) < Math.abs(stops[closest]-distance) ? i : closest, 0);
}

// Planar clearance from the actual wall surfaces at eye height.
export function wallClearance(position) {
  return Math.min(...walls.filter(w => w.center[1]-w.size[1]/2 < eyeHeight && w.center[1]+w.size[1]/2 > eyeHeight).map(w => {
    const dx = Math.max(Math.abs(position.x-w.center[0])-w.size[0]/2, 0);
    const dz = Math.max(Math.abs(position.z-w.center[2])-w.size[2]/2, 0);
    return Math.hypot(dx, dz);
  }));
}
