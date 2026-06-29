/**
 * Spine export for Sprite Studio (client-safe, pure).
 *
 * Turns a generated sprite sheet (per-frame cells + the body plan) into a
 * Spine-compatible project: a `skeleton.json` + a `.atlas` describing a packed
 * horizontal strip PNG. The result imports straight into Spine (and any Spine
 * runtime — spine-unity, spine-ts, pixi-spine, …):
 *
 *  - Each frame is a region attachment on a single `sprite` slot.
 *  - An animation (named after the action) swaps those attachments at the
 *    sheet's FPS → the generated animation plays as a frame/flipbook clip.
 *  - A body-plan BONE skeleton (hips, torso, limbs, …) is emitted at setup pose
 *    so the character ships with a real, named bone hierarchy to attach cut-up
 *    art to — the tedious part of rigging, auto-built from the rig the sheet was
 *    posed with.
 *
 * Coordinates are Spine-native (origin at the skeleton root, +y = UP).
 */
import type { BodyPlan } from '@/app/lib/bodyPlans'

export interface SpineBone {
  name: string
  parent?: string
  length?: number
  /** Position in the parent's local space (Spine units). */
  x?: number
  y?: number
  /** Rotation relative to the parent, degrees, CCW. */
  rotation?: number
}

/**
 * Body-plan bone scaffolds. Lengths/positions are derived from each rig's
 * proportions (see app/utils/rigs/*) scaled to a figure height H, with the root
 * at the hips/body center. A starting skeleton the user refines + binds art to.
 */
function bonesFor(bodyPlan: BodyPlan, frameSize: number): SpineBone[] {
  const H = frameSize * 0.62 // nominal figure height inside the cell
  const root: SpineBone = { name: 'root' }

  switch (bodyPlan) {
    case 'biped': {
      const thigh = 0.245 * H, shin = 0.245 * H, torso = 0.3 * H
      const neck = 0.05 * H, head = 0.15 * H, up = 0.16 * H, fore = 0.15 * H
      return [
        root,
        { name: 'hip', parent: 'root', x: 0, y: 0 },
        { name: 'torso', parent: 'hip', length: torso, rotation: 90 },
        { name: 'neck', parent: 'torso', length: neck, x: torso, rotation: 0 },
        { name: 'head', parent: 'neck', length: head, x: neck, rotation: 0 },
        { name: 'arm-upper-near', parent: 'torso', length: up, x: torso * 0.9, rotation: -120 },
        { name: 'arm-lower-near', parent: 'arm-upper-near', length: fore, x: up, rotation: -15 },
        { name: 'arm-upper-far', parent: 'torso', length: up, x: torso * 0.9, rotation: -110 },
        { name: 'arm-lower-far', parent: 'arm-upper-far', length: fore, x: up, rotation: -15 },
        { name: 'thigh-near', parent: 'hip', length: thigh, rotation: -88 },
        { name: 'shin-near', parent: 'thigh-near', length: shin, x: thigh, rotation: -8 },
        { name: 'thigh-far', parent: 'hip', length: thigh, rotation: -92 },
        { name: 'shin-far', parent: 'thigh-far', length: shin, x: thigh, rotation: -8 },
      ]
    }
    case 'quadruped': {
      const back = 1.0 * H * 0.5, thigh = 0.27 * H, shin = 0.27 * H
      const neck = 0.38 * H, head = 0.3 * H, tail = 0.52 * H
      return [
        root,
        { name: 'hip', parent: 'root', x: 0, y: 0 },
        { name: 'spine', parent: 'hip', length: back, rotation: 0 }, // hip → shoulder (+x)
        { name: 'neck', parent: 'spine', length: neck, x: back, rotation: 35 },
        { name: 'head', parent: 'neck', length: head, x: neck, rotation: 0 },
        { name: 'tail-1', parent: 'hip', length: tail * 0.5, rotation: 180 },
        { name: 'tail-2', parent: 'tail-1', length: tail * 0.5, x: tail * 0.5, rotation: -10 },
        { name: 'front-thigh-near', parent: 'spine', length: thigh, x: back, rotation: -90 },
        { name: 'front-shin-near', parent: 'front-thigh-near', length: shin, x: thigh, rotation: -10 },
        { name: 'front-thigh-far', parent: 'spine', length: thigh, x: back, rotation: -92 },
        { name: 'front-shin-far', parent: 'front-thigh-far', length: shin, x: thigh, rotation: -10 },
        { name: 'hind-thigh-near', parent: 'hip', length: thigh, rotation: -90 },
        { name: 'hind-shin-near', parent: 'hind-thigh-near', length: shin, x: thigh, rotation: -10 },
        { name: 'hind-thigh-far', parent: 'hip', length: thigh, rotation: -92 },
        { name: 'hind-shin-far', parent: 'hind-thigh-far', length: shin, x: thigh, rotation: -10 },
      ]
    }
    case 'flyer': {
      const body = 0.34 * frameSize, wingU = 0.3 * frameSize, wingL = 0.28 * frameSize
      const tail = 0.22 * frameSize, head = 0.17 * frameSize
      return [
        root,
        { name: 'body', parent: 'root', length: body, rotation: 0 },
        { name: 'head', parent: 'body', length: head, x: body, rotation: 0 },
        { name: 'tail', parent: 'root', length: tail, rotation: 180 },
        { name: 'wing-upper-near', parent: 'body', length: wingU, x: body * 0.3, rotation: 150 },
        { name: 'wing-lower-near', parent: 'wing-upper-near', length: wingL, x: wingU, rotation: -20 },
        { name: 'wing-upper-far', parent: 'body', length: wingU, x: body * 0.3, rotation: 158 },
        { name: 'wing-lower-far', parent: 'wing-upper-far', length: wingL, x: wingU, rotation: -20 },
      ]
    }
    case 'serpent': {
      // Continuous body → a chain of spine bones (tail → head).
      const seg = (0.82 * frameSize) / 6
      const bones: SpineBone[] = [root, { name: 'spine-0', parent: 'root', length: seg, rotation: 0 }]
      for (let i = 1; i < 6; i++) {
        bones.push({ name: `spine-${i}`, parent: `spine-${i - 1}`, length: seg, x: seg, rotation: 0 })
      }
      bones.push({ name: 'head', parent: 'spine-5', length: seg * 0.6, x: seg, rotation: 0 })
      return bones
    }
    case 'blob':
    default:
      // Deformable body → a single control bone (use a mesh + weights to deform).
      return [root, { name: 'body', parent: 'root', length: 0.28 * frameSize, rotation: 90 }]
  }
}

export interface SpineBuildOpts {
  bodyPlan: BodyPlan
  anim: string
  fps: number
  /** Number of active frames packed into the strip (left → right). */
  frameCount: number
  /** Square frame size in px (512). */
  frameSize: number
  loop: boolean
  /** Atlas/texture page file name, e.g. "knight_walk.png". */
  imageFile: string
}

/** Build the Spine `skeleton.json` object. */
export function buildSpineSkeleton(opts: SpineBuildOpts): Record<string, unknown> {
  const { bodyPlan, anim, fps, frameCount, frameSize, loop, imageFile } = opts
  const bones = bonesFor(bodyPlan, frameSize)
  const dt = 1 / Math.max(1, fps)

  // One region attachment per frame, centered on the root.
  const attachments: Record<string, unknown> = {}
  for (let i = 0; i < frameCount; i++) {
    attachments[`frame_${i}`] = {
      type: 'region',
      name: `frame_${i}`,
      x: 0,
      y: 0,
      width: frameSize,
      height: frameSize,
    }
  }

  // Attachment timeline: swap frame_0 → frame_(n-1) at the sheet FPS.
  const attachmentKeys = Array.from({ length: frameCount }, (_, i) => ({
    time: +(i * dt).toFixed(4),
    name: `frame_${i}`,
  }))
  // Hold the cycle for one extra tick so the last frame plays its full duration.
  if (loop && frameCount > 0) {
    attachmentKeys.push({ time: +(frameCount * dt).toFixed(4), name: `frame_0` })
  }

  return {
    skeleton: {
      spine: '4.1.00',
      images: './images/',
      audio: '',
      width: frameSize,
      height: frameSize,
      fps: fps,
    },
    bones,
    slots: [{ name: 'sprite', bone: 'root', attachment: 'frame_0' }],
    skins: [{ name: 'default', attachments: { sprite: attachments } }],
    animations: {
      [anim]: {
        slots: { sprite: { attachment: attachmentKeys } },
      },
    },
    // metadata hint for tooling (ignored by Spine import)
    _pixai: { bodyPlan, imageFile, frameCount, fps, loop, kind: 'frame-animation' },
  }
}

/**
 * Build the Spine `.atlas` for a horizontal strip PNG (`frameCount` cells of
 * `frameSize`, left → right). Regions are named `frame_0…frame_(n-1)`.
 */
export function buildSpineAtlas(opts: {
  imageFile: string
  frameCount: number
  frameSize: number
}): string {
  const { imageFile, frameCount, frameSize } = opts
  const W = frameCount * frameSize
  const H = frameSize
  const lines: string[] = [
    imageFile,
    `size: ${W},${H}`,
    'format: RGBA8888',
    'filter: Nearest,Nearest',
    'repeat: none',
  ]
  for (let i = 0; i < frameCount; i++) {
    lines.push(
      `frame_${i}`,
      '  rotate: false',
      `  xy: ${i * frameSize}, 0`,
      `  size: ${frameSize}, ${frameSize}`,
      `  orig: ${frameSize}, ${frameSize}`,
      '  offset: 0, 0',
      '  index: -1'
    )
  }
  return lines.join('\n') + '\n'
}
