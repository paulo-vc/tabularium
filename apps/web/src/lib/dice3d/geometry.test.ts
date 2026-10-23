import type { DieShape } from '@tabula/domain';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { dieModel, restingRotation } from './geometry';

const SHAPES: [DieShape, number][] = [
  ['d4', 4],
  ['d6', 6],
  ['d8', 8],
  ['d10', 10],
  ['d12', 12],
  ['d20', 20],
];

describe('dados 3D', () => {
  it.each(SHAPES)('o %s tem uma face para cada número', (shape, sides) => {
    const values = dieModel(shape)
      .faces.map((f) => f.value)
      .sort((a, b) => a - b);
    expect(values).toEqual(Array.from({ length: sides }, (_, i) => i + 1));
  });

  it.each(SHAPES.filter(([shape]) => shape !== 'd4'))(
    'no %s, faces opostas somam n + 1',
    (shape, sides) => {
      const { faces } = dieModel(shape);
      for (const face of faces) {
        const opposite = faces.find((other) => other.normal.dot(face.normal) < -0.99);
        expect(opposite && face.value + opposite.value).toBe(sides + 1);
      }
    },
  );

  it.each(SHAPES)('o %s para com a face sorteada virada para quem olha, de pé', (shape, sides) => {
    for (let value = 1; value <= sides; value++) {
      const rotation = restingRotation(shape, value, 0);
      const face = dieModel(shape).faces.find((f) => f.value === value);
      if (!face) throw new Error(`sem a face ${value}`);
      const normal = face.normal.clone().applyQuaternion(rotation);
      const up = face.up.clone().applyQuaternion(rotation);
      expect(normal.distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-6);
      expect(up.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-6);
    }
  });
});
