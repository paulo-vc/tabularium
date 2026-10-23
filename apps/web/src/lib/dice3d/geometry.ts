import type { DieShape } from '@tabula/domain';
import {
  BoxGeometry,
  BufferGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  OctahedronGeometry,
  Quaternion,
  TetrahedronGeometry,
  Vector3,
} from 'three';

/** Uma face do dado: onde fica, para onde aponta e o número que leva. */
export interface DieFace {
  value: number;
  center: Vector3;
  normal: Vector3;
  /** Direção "para cima" do número, sobre a face. */
  up: Vector3;
  /** Tamanho do número (cabe na face). */
  size: number;
}

export interface DieModel {
  geometry: BufferGeometry;
  faces: DieFace[];
}

const SIDES: Record<DieShape, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };

/**
 * d10: trapezoedro pentagonal. Os anéis ficam a ±e e as pontas a ±h; h sai da condição de
 * cada pipa ser plana (ponta, dois vértices de cima e um de baixo no mesmo plano).
 */
function d10Geometry(): BufferGeometry {
  const c = Math.cos(Math.PI / 5);
  const e = 0.11;
  const h = (e * (1 + c)) / (1 - c);
  const top = [0, 0, h];
  const bottom = [0, 0, -h];
  const ring = (k: number, z: number, offset: number) => {
    const angle = (2 * Math.PI * k) / 5 + offset;
    return [Math.cos(angle), Math.sin(angle), z];
  };
  const positions: number[] = [];
  const tri = (...points: number[][]) => points.forEach((p) => positions.push(...p));
  for (let k = 0; k < 5; k++) {
    const u0 = ring(k, e, 0);
    const u1 = ring(k + 1, e, 0);
    const l0 = ring(k, -e, Math.PI / 5);
    const lPrev = ring(k - 1, -e, Math.PI / 5);
    // Pipa de cima: ponta, U(k), L(k), U(k+1).
    tri(top, u0, l0);
    tri(top, l0, u1);
    // Pipa de baixo: ponta de baixo, L(k), U(k), L(k-1).
    tri(bottom, l0, u0);
    tri(bottom, u0, lPrev);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function baseGeometry(shape: DieShape): BufferGeometry {
  switch (shape) {
    case 'd4':
      return new TetrahedronGeometry(1.2);
    case 'd6':
      return new BoxGeometry(1.25, 1.25, 1.25).toNonIndexed();
    case 'd8':
      return new OctahedronGeometry(1.05);
    case 'd10':
      return d10Geometry().scale(1.05, 1.05, 1.05);
    case 'd12':
      return new DodecahedronGeometry(1);
    case 'd20':
      return new IcosahedronGeometry(1);
  }
}

/** Agrupa os triângulos em faces (mesma normal) e numera: faces opostas somam n + 1. */
function facesOf(geometry: BufferGeometry, sides: number): DieFace[] {
  const position = geometry.getAttribute('position');
  const groups: { normal: Vector3; points: Vector3[] }[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    const normal = new Vector3().subVectors(c, b).cross(new Vector3().subVectors(a, b)).normalize();
    let group = groups.find((g) => g.normal.dot(normal) > 0.999);
    if (!group) {
      group = { normal, points: [] };
      groups.push(group);
    }
    group.points.push(a.clone(), b.clone(), c.clone());
  }
  const raw = groups.map(({ normal, points }) => {
    const unique = points.filter((p, i) => points.findIndex((q) => q.distanceTo(p) < 1e-4) === i);
    const center = unique.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(unique.length);
    // O número aponta para o vértice mais distante do centro (a ponta, no d10 e no d4).
    const far = unique.reduce((best, p) =>
      p.distanceTo(center) > best.distanceTo(center) ? p : best,
    );
    let up = far.clone().sub(center).normalize();
    // Na face quadrada (d6), o número aponta para uma aresta, não para um canto.
    if (unique.length === 4) up = up.applyAxisAngle(normal, Math.PI / 4);
    const nearest = Math.min(...unique.map((p) => p.distanceTo(center)));
    return { center, normal, up, size: nearest * (unique.length === 3 ? 1.25 : 1.35) };
  });
  if (raw.length !== sides) throw new Error(`O dado de ${sides} faces saiu com ${raw.length}.`);

  const values = new Array<number>(raw.length).fill(0);
  let next = 1;
  raw.forEach((face, i) => {
    if (values[i]) return;
    values[i] = next;
    const opposite = raw.findIndex(
      (other, j) => !values[j] && other.normal.dot(face.normal) < -0.99,
    );
    if (opposite >= 0) values[opposite] = sides + 1 - next;
    next++;
    while (values.includes(next) && next <= sides) next++;
  });
  // Sem faces opostas (d4): numera em sequência.
  if (values.some((v) => !v) || new Set(values).size !== sides) {
    raw.forEach((_, i) => (values[i] = i + 1));
  }
  return raw.map((face, i) => ({ ...face, value: values[i] as number }));
}

const cache = new Map<DieShape, DieModel>();

export function dieModel(shape: DieShape): DieModel {
  let model = cache.get(shape);
  if (!model) {
    const geometry = baseGeometry(shape);
    geometry.computeVertexNormals();
    model = { geometry, faces: facesOf(geometry, SIDES[shape]) };
    cache.set(shape, model);
  }
  return model;
}

const TOWARD_VIEWER = new Vector3(0, 0, 1);

/**
 * Rotação que deixa a face `value` virada para quem olha (+Z), com o número de pé.
 * `tilt` gira um pouco o dado sobre a mesa (radianos), para não ficarem todos alinhados.
 */
export function restingRotation(shape: DieShape, value: number, tilt = 0): Quaternion {
  const face = dieModel(shape).faces.find((f) => f.value === value);
  if (!face) throw new Error(`O ${shape} não tem a face ${value}.`);
  const facing = new Quaternion().setFromUnitVectors(face.normal, TOWARD_VIEWER);
  const up = face.up.clone().applyQuaternion(facing);
  const angle = Math.atan2(up.x, up.y);
  const upright = new Quaternion().setFromAxisAngle(TOWARD_VIEWER, angle + tilt);
  return upright.multiply(facing);
}
