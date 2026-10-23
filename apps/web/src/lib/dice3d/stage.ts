import { faceLabel, type VisualDie } from '@tabula/domain';
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three';
import { dieModel, restingRotation } from './geometry';

/** Quanto dura a rolagem até os dados pararem (ms). */
export const ROLL_MS = 1300;

/** Texto escuro ou claro, conforme a cor do dado. */
function inkFor(color: string): string {
  const { r, g, b } = new Color(color);
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#1c1917' : '#fafaf9';
}

function labelTexture(text: string, ink: string): Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = ink;
  context.font = `bold ${text.length > 2 ? 48 : text.length > 1 ? 64 : 84}px Geist Variable, system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 64, 64);
  // 6 e 9 levam um traço embaixo, como nos dados de verdade.
  if (text === '6' || text === '9') context.fillRect(44, 104, 40, 7);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Um quique ao cair na mesa: desce, sobe um pouco e assenta. */
const bounce = (t: number) => {
  if (t < 0.55) return 1 - (t / 0.55) ** 2;
  const k = (t - 0.55) / 0.45;
  return 0.12 * Math.sin(Math.PI * k) * (1 - k);
};

export interface DiceStage {
  /**
   * Rola os dados até as faces dadas. Termina quando eles param. `still`: sem animação, já
   * parados (para quem pede menos movimento no sistema).
   */
  roll(dice: VisualDie[], color: string, still?: boolean): Promise<void>;
  dispose(): void;
}

/**
 * Palco 3D dos dados (three.js), num `<canvas>` transparente. Não há física: cada dado gira
 * cada vez mais devagar até parar exatamente na face sorteada, que já veio do resultado.
 * @returns `null` se o aparelho não tiver WebGL.
 */
export function createDiceStage(canvas: HTMLCanvasElement): DiceStage | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.9));
  const sun = new DirectionalLight(0xffffff, 2.8);
  sun.position.set(-3, 5, 8);
  scene.add(sun);
  // Câmera ortográfica: a face sorteada aparece de frente em qualquer ponto da bandeja.
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(0, 0, 20);
  let aspect = 1;

  let frame = 0;
  let current: Group | null = null;
  const owned: { dispose(): void }[] = [];

  const clear = () => {
    cancelAnimationFrame(frame);
    if (current) scene.remove(current);
    current = null;
    for (const item of owned.splice(0)) item.dispose();
  };

  const resize = () => {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    aspect = width / height;
  };

  return {
    roll(dice, color, still = false) {
      clear();
      resize();
      const group = new Group();
      current = group;
      scene.add(group);

      const columns = Math.min(dice.length, 5);
      const rows = Math.ceil(dice.length / columns);
      const spacing = 2.5;
      // Enquadra tudo (na largura e na altura), com margem para o quique.
      const half = Math.max((rows * spacing) / 2, (columns * spacing) / 2 / aspect, 2.2) + 1;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();

      const ink = inkFor(color);
      const body = new MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.05,
        flatShading: true,
      });
      const faded = new MeshStandardMaterial({
        color,
        roughness: 0.6,
        transparent: true,
        opacity: 0.35,
      });
      owned.push(body, faded);
      const extra = new Map<string, { body: MeshStandardMaterial; faded: MeshStandardMaterial }>();
      const materialsFor = (tint: string) => {
        let pair = extra.get(tint);
        if (!pair) {
          pair = {
            body: new MeshStandardMaterial({ color: tint, roughness: 0.35, flatShading: true }),
            faded: new MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.35 }),
          };
          extra.set(tint, pair);
          owned.push(pair.body, pair.faded);
        }
        return pair;
      };

      const pieces = dice.map((die, index) => {
        const model = dieModel(die.shape);
        // Dado do sistema com cor fixa (ex.: Esperança e Medo) usa a dele.
        const own = die.color ? materialsFor(die.color) : null;
        const mesh = new Mesh(
          model.geometry,
          die.dropped ? (own?.faded ?? faded) : (own?.body ?? body),
        );
        for (const face of model.faces) {
          const text = die.labels?.[face.value - 1] ?? faceLabel(die.shape, face.value, die.tens);
          const texture = labelTexture(text, die.color ? inkFor(die.color) : ink);
          if (!texture) continue;
          const material: Material = new MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: die.dropped ? 0.4 : 1,
            depthWrite: false,
          });
          const plane = new PlaneGeometry(face.size, face.size);
          owned.push(texture, material, plane);
          const label = new Mesh(plane, material);
          label.position.copy(face.center).addScaledVector(face.normal, 0.01);
          label.up.copy(face.up);
          label.lookAt(label.position.clone().add(face.normal));
          mesh.add(label);
        }
        const row = Math.floor(index / columns);
        const inRow = Math.min(columns, dice.length - row * columns);
        const slot = new Vector3(
          (index % columns) * spacing - ((inRow - 1) * spacing) / 2,
          ((rows - 1) * spacing) / 2 - row * spacing,
          0,
        );
        const rest = restingRotation(die.shape, die.face, (Math.random() - 0.5) * 0.5);
        const axis = new Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ).normalize();
        const turns = (3 + Math.random() * 2) * Math.PI * 2;
        // Entra pela esquerda, um pouco acima, sem sair do quadro.
        const from = slot
          .clone()
          .add(new Vector3(-2.2 - Math.random(), 1 + Math.random() * 0.6, 0));
        const delay = index * 0.04;
        group.add(mesh);
        return { mesh, slot, rest, axis, turns, from, delay };
      });

      const spin = new Quaternion();
      return new Promise<void>((resolve) => {
        const start = performance.now() - (still ? ROLL_MS : 0);
        const step = (now: number) => {
          const elapsed = (now - start) / ROLL_MS;
          for (const piece of pieces) {
            const t = Math.min(1, Math.max(0, (elapsed - piece.delay) / (1 - piece.delay)));
            const travel = easeOut(t);
            piece.mesh.position.lerpVectors(piece.from, piece.slot, travel);
            // Na câmera ortográfica, o quique aparece no tamanho do dado.
            piece.mesh.scale.setScalar(1 + bounce(t) * 0.35);
            // Gira em torno de um eixo cada vez mais devagar e termina na face sorteada.
            spin.setFromAxisAngle(piece.axis, piece.turns * (1 - travel));
            piece.mesh.quaternion.copy(piece.rest).multiply(spin);
          }
          renderer.render(scene, camera);
          if (elapsed < 1) frame = requestAnimationFrame(step);
          else resolve();
        };
        frame = requestAnimationFrame(step);
      });
    },
    dispose() {
      clear();
      renderer.dispose();
    },
  };
}
