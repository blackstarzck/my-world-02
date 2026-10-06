import { CatmullRomCurve3, Vector3 } from 'three';

export const eyeHeight = 1.65;
export const screenSize = { width: 4.5, height: 2.8125 };
export const rooms = [
  { name: '첫 번째 전시실', x: [-8, 3], z: [-7, 3], height: 4 },
  { name: '중앙 홀', x: [-8, 14], z: [-20, -7], height: 6 },
  { name: '측면 전시실', x: [8, 23], z: [-32, -20], height: 4 },
  { name: '안쪽 전시실', x: [18, 29], z: [-44, -32], height: 4 },
];
export const exhibits = [
  { x: -3.5, y: 2.1, z: -6.58, yaw: 0 },
  { x: 5.15, y: 2.15, z: -19.08, yaw: -8 },
  { x: 16.5, y: 2.1, z: -31.04, yaw: -10 },
  { x: 24.2, y: 2.1, z: -43.08, yaw: -8 },
];
export const portals = [
  { x: [-1, 3], z: -7, height: 3.35 },
  { x: [10, 14], z: -20, height: 3.5 },
  { x: [19, 23], z: -32, height: 3.35 },
];

// The same solids drive rendering, occlusion and route-clearance checks.
export const walls = [];
const wall = (w, h, d, x, y, z) => walls.push({ size: [w, h, d], center: [x, y, z] });
const across = (a, b, z, h, bottom = 0) => wall(b-a, h-bottom, .6, (a+b)/2, (h+bottom)/2, z);
const along = (x, a, b, h) => wall(.6, h, b-a, x, h/2, (a+b)/2);
along(-8, -7, 3, 4); along(-8, -20, -7, 6);
along(3, -7, 3, 4); across(-8, 3, 3, 4);
across(-8, -1, -7, 4); across(-1, 3, -7, 4, 3.35);
across(-8, 3, -7, 6, 4); across(3, 14, -7, 6);
along(14, -20, -7, 6);
across(-8, 10, -20, 6); across(10, 14, -20, 6, 3.5);
across(14, 23, -20, 4);
along(8, -32, -20, 4); along(23, -32, -20, 4);
across(8, 19, -32, 4); across(19, 23, -32, 4, 3.35);
across(23, 29, -32, 4);
along(18, -44, -32, 4); along(29, -44, -32, 4); across(18, 29, -44, 4);

const points = [
  [-3.5, 1.8], [-3.5, .5], [-.3, -4.5], [1.1, -6], [1.1, -8],
  [4.1, -11.5], [8.5, -16], [11.5, -18], [12, -20], [12, -21.5],
  [15.35, -24.5], [19.5, -29], [21, -31], [21, -33], [23.25, -36.5],
];
const stopPoints = [1, 5, 10, 14];
const curve = new CatmullRomCurve3(points.map(([x,z]) => new Vector3(x, eyeHeight, z)), false, 'centripetal');
// Include every control point in the length table, even where segment lengths differ.
curve.arcLengthDivisions = (points.length-1)*1000;
const lengths = curve.getLengths();
export const routeLength = lengths.at(-1);
export const stops = stopPoints.map(pointIndex => {
  const n = pointIndex/(points.length-1)*curve.arcLengthDivisions, i = Math.floor(n);
  return lengths[i] + ((lengths[i+1] ?? lengths[i])-lengths[i])*(n-i);
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function sampleRoute(distance, target = new Vector3()) {
  return curve.getPointAt(clamp(distance/routeLength, 0, 1), target);
}
export function routeYaw(distance) {
  const i = Math.max(0, Math.min(2, stops.findIndex(stop => stop > distance)-1));
  if (distance >= stops.at(-1)) return exhibits.at(-1).yaw * Math.PI/180;
  const t = clamp((distance-stops[i])/(stops[i+1]-stops[i]), 0, 1);
  const blend = t*t*(3-2*t);
  return (exhibits[i].yaw + (exhibits[i+1].yaw-exhibits[i].yaw)*blend)*Math.PI/180;
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
