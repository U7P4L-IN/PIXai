'use client'

export type SpriteAnimType =
  // ── Biped humanoid ──────────────────────────────────────────────────────
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'attack'
  | 'hurt'
  | 'death'
  // ── Quadruped extras ────────────────────────────────────────────────────
  | 'pounce'
  | 'sleep'
  // ── Serpent / fish ──────────────────────────────────────────────────────
  | 'slither'
  | 'strike'
  | 'coil'
  // ── Flyer / bird ────────────────────────────────────────────────────────
  | 'flap'
  | 'glide'
  | 'dive'
  // ── Blob / amorphous ────────────────────────────────────────────────────
  | 'hop'
  | 'bounce'
  | 'lunge'


export const SPRITE_FRAME_SIZE = 512

export const SPRITE_FRAME_COUNT = 8

export const SPRITE_GRID_COLS = 4

export const SPRITE_GRID_ROWS = 2

export const SPRITE_SHEET_W = SPRITE_GRID_COLS * SPRITE_FRAME_SIZE

export const SPRITE_SHEET_H = SPRITE_GRID_ROWS * SPRITE_FRAME_SIZE
/** Horizontal strip layout for engine export (1 row × N frames). */

export const SPRITE_STRIP_W = SPRITE_FRAME_COUNT * SPRITE_FRAME_SIZE

export const SPRITE_STRIP_H = SPRITE_FRAME_SIZE

export interface SpriteAnimSpec {
  type: SpriteAnimType
  label: string
  /** Default playback frames-per-second. Editable per-anim in the studio. */
  defaultFps: number
  /** Whether the animation should loop continuously in the live preview. */
  loop: boolean
  /** One-line description shown in the studio. */
  hint: string
  /** AI-prompt scaffold describing how the 8 keyframes should be staged. */
  keyframeChoreography: string
}


export const SPRITE_ANIMATIONS: Record<SpriteAnimType, SpriteAnimSpec> = {
  idle: {
    type: 'idle',
    label: 'Idle',
    defaultFps: 6,
    loop: true,
    hint: 'Subtle breathing loop · 8 frames @ 6 FPS',
    keyframeChoreography:
      'Subtle breathing / standing idle loop. Frames 1–4 = chest rising and shoulders slightly lifting; frames 5–8 = chest lowering and shoulders settling back. Feet planted, weight evenly distributed, very subtle weight shift. No big motion — the character should clearly look CALM and STATIONARY across all 8 frames. The pose in frame 1 and frame 8 should be near-identical so the loop reads as continuous.',
  },
  walk: {
    type: 'walk',
    label: 'Walk',
    defaultFps: 12,
    loop: true,
    hint: 'Classic 8-frame walk cycle @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame walk cycle in profile, character facing RIGHT, moving in place. Frame 1: contact (right leg forward & straight, left leg back & lifting off). Frame 2: down (weight shifts onto right leg, body lowest). Frame 3: pass (left leg passes under body, body rising). Frame 4: high point (left leg forward, right leg back). Frame 5: contact mirror (left leg forward & straight, right leg back & lifting). Frame 6: down mirror (weight on left leg, body lowest). Frame 7: pass mirror (right leg passes under, body rising). Frame 8: high point mirror (right leg forward, left leg back). Arms swing OPPOSITE to legs (right arm forward when left leg forward). Cycle loops: frame 8 → frame 1 must feel continuous.',
  },
  run: {
    type: 'run',
    label: 'Run',
    defaultFps: 14,
    loop: true,
    hint: 'Energetic 8-frame run cycle @ 14 FPS',
    keyframeChoreography:
      'Side-view 8-frame run cycle in profile, character facing RIGHT, moving in place. More vigorous than a walk: both feet leave the ground at peak moments, body leans FORWARD throughout, arms bent at ~90° and swinging strongly. Frame 1: right foot strike (right leg forward, planted; left leg pulled up behind). Frame 2: push-off (right leg straightens & pushes back, body launches forward). Frame 3: airborne (both feet off ground, knees high). Frame 4: left foot reach (left leg extending forward to plant). Frames 5–8: mirror the pattern with the opposite leg. Arms pump OPPOSITE to legs. Loop must read continuous from frame 8 back to frame 1.',
  },
  jump: {
    type: 'jump',
    label: 'Jump',
    defaultFps: 10,
    loop: false,
    hint: 'Crouch → launch → peak → land · 8 frames @ 10 FPS',
    keyframeChoreography:
      'Side-view 8-frame jump action, character facing RIGHT. Frame 1: standing neutral. Frame 2: deep crouch wind-up (knees bent, arms back). Frame 3: explosive launch (legs straightening, arms swinging forward & up, feet just leaving ground). Frame 4: ascending (body straightening, knees tucking up). Frame 5: peak (highest point, body compact, knees up, arms up for balance). Frame 6: descending (legs extending downward, body anticipating landing). Frame 7: landing impact (knees bent on contact, arms forward for balance). Frame 8: recovery to neutral standing. NOT a loop — frame 8 settles back to the starting pose.',
  },
  attack: {
    type: 'attack',
    label: 'Attack',
    defaultFps: 12,
    loop: false,
    hint: 'Wind-up → strike → recover · 8 frames @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame attack action, character facing RIGHT. Frame 1: neutral combat stance. Frame 2: anticipation (weapon/fist pulled back, body coiling). Frame 3: deep wind-up (peak coil, weight on back leg, weapon at maximum back position). Frame 4: forward burst (body uncoiling, weapon traveling forward fast, motion blur acceptable). Frame 5: impact / max extension (weapon at FURTHEST forward point, body in full lunge, front leg planted forward). Frame 6: follow-through (weapon swinging slightly past impact, body still committed). Frame 7: recovery start (weapon pulling back toward body, weight shifting back). Frame 8: return to neutral combat stance, matching frame 1. NOT a loop — the action plays once.',
  },
  hurt: {
    type: 'hurt',
    label: 'Hurt',
    defaultFps: 8,
    loop: false,
    hint: 'Take damage recoil · 8 frames @ 8 FPS',
    keyframeChoreography:
      'Side-view 8-frame hurt / take-damage reaction, character facing RIGHT. Frame 1: neutral stance. Frame 2: impact (body sharply jolted BACKWARD, head snaps back, arms flying outward, expression pained). Frame 3: peak recoil (body leaning farthest back, knees slightly buckled, off-balance). Frame 4: stagger 1 (body still leaning back but starting to recover, arms coming inward for balance). Frame 5: stagger 2 (body returning toward upright, head straightening). Frame 6: nearly recovered (slight remaining lean). Frame 7: settling (almost back to neutral, weight rebalancing). Frame 8: recovered neutral stance, matching frame 1. NOT a loop — the action plays once.',
  },
  death: {
    type: 'death',
    label: 'Death',
    defaultFps: 10,
    loop: false,
    hint: 'Collapse to ground · 8 frames @ 10 FPS',
    keyframeChoreography:
      'Side-view 8-frame death / collapse animation, character facing RIGHT. Frame 1: standing, body taking a final hit, slight shock pose. Frame 2: knees buckling, body sagging downward. Frame 3: dropping to one knee, body folding forward. Frame 4: both knees on ground, torso slumping. Frame 5: falling sideways, torso tilting toward the ground. Frame 6: nearly horizontal, one arm reaching out to break the fall. Frame 7: on the ground, body settling, last twitches. Frame 8: lying motionless on the ground, fully collapsed, character defeated. NOT a loop — the final frame is the resting "dead" pose.',
  },

  // ── Quadruped extras ──────────────────────────────────────────────────────
  pounce: {
    type: 'pounce',
    label: 'Pounce',
    defaultFps: 12,
    loop: false,
    hint: 'Crouch → leap → strike · 8 frames @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame quadruped pounce, facing RIGHT. Crouch low and coil, explosive leap forward and up, airborne reach with front paws extended, land with front paws striking down, recover. Plays once.',
  },
  sleep: {
    type: 'sleep',
    label: 'Sleep',
    defaultFps: 4,
    loop: true,
    hint: 'Curled resting breath loop · 8 frames @ 4 FPS',
    keyframeChoreography:
      'Side-view 8-frame quadruped sleep loop, facing RIGHT. The creature lies curled on the ground, only the ribcage rising and falling with slow breathing. Very low motion; frame 8 loops back to frame 1.',
  },

  // ── Serpent / fish ────────────────────────────────────────────────────────
  slither: {
    type: 'slither',
    label: 'Slither',
    defaultFps: 12,
    loop: true,
    hint: 'Traveling-wave glide loop · 8 frames @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame serpent slither/swim loop, head to the RIGHT. A smooth sinusoidal wave travels from tail to head, advancing one phase step per frame so frame 8 loops seamlessly back to frame 1. Body moves in place (no horizontal drift).',
  },
  strike: {
    type: 'strike',
    label: 'Strike',
    defaultFps: 14,
    loop: false,
    hint: 'Coil → lunge → recoil · 8 frames @ 14 FPS',
    keyframeChoreography:
      'Side-view 8-frame serpent strike, head to the RIGHT. Pull head back into a tight coil, then lunge the head forward fast (mouth open at full extension), then retract back to a ready coil. Plays once.',
  },
  coil: {
    type: 'coil',
    label: 'Coil',
    defaultFps: 10,
    loop: false,
    hint: 'Settle into a tight coil · 8 frames @ 10 FPS',
    keyframeChoreography:
      'Side-view 8-frame serpent coil, head to the RIGHT. The body tightens from a loose wave into a compact coil with the head raised on top. Plays once and rests coiled.',
  },

  // ── Flyer / bird ──────────────────────────────────────────────────────────
  flap: {
    type: 'flap',
    label: 'Fly',
    defaultFps: 12,
    loop: true,
    hint: 'Powered wing-flap loop · 8 frames @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame flyer flap loop, facing RIGHT. Both wings sweep from a high raised position down through a powerful downstroke and back up, the body bobbing slightly with each beat. Frame 8 loops back to frame 1.',
  },
  glide: {
    type: 'glide',
    label: 'Glide',
    defaultFps: 8,
    loop: true,
    hint: 'Wings held, gentle sway · 8 frames @ 8 FPS',
    keyframeChoreography:
      'Side-view 8-frame flyer glide loop, facing RIGHT. Wings held extended and mostly still with only subtle tip flutter and tail adjustments; the body drifts up and down a few pixels. Frame 8 loops back to frame 1.',
  },
  dive: {
    type: 'dive',
    label: 'Dive',
    defaultFps: 14,
    loop: false,
    hint: 'Wings swept, plunge down · 8 frames @ 14 FPS',
    keyframeChoreography:
      'Side-view 8-frame flyer dive, facing RIGHT. Wings tuck/sweep back, body pitches nose-down and plunges, then flares the wings to pull out at the bottom. Plays once.',
  },

  // ── Blob / amorphous ──────────────────────────────────────────────────────
  hop: {
    type: 'hop',
    label: 'Hop',
    defaultFps: 10,
    loop: true,
    hint: 'Squash → launch → land loop · 8 frames @ 10 FPS',
    keyframeChoreography:
      'Side-view 8-frame blob hop loop, facing RIGHT (eyes to the right). Squash down, stretch tall on launch, airborne stretch, squash on landing, settle — looping. In place (no horizontal drift).',
  },
  bounce: {
    type: 'bounce',
    label: 'Bounce',
    defaultFps: 12,
    loop: true,
    hint: 'Energetic squash-and-stretch loop · 8 frames @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame blob bounce loop, facing RIGHT. A higher, snappier version of the hop with stronger squash-and-stretch and a higher airborne arc. Frame 8 loops back to frame 1.',
  },
  lunge: {
    type: 'lunge',
    label: 'Lunge',
    defaultFps: 12,
    loop: false,
    hint: 'Stretch forward attack · 8 frames @ 12 FPS',
    keyframeChoreography:
      'Side-view 8-frame blob lunge attack, facing RIGHT. Pull back and compress, then stretch the body forward toward the right in a sharp attack, then snap back to a resting blob. Plays once.',
  },
}

/** Visual / pick order in the studio toolbar. */

export const SPRITE_ANIM_ORDER: SpriteAnimType[] = [
  'idle',
  'walk',
  'run',
  'jump',
  'attack',
  'hurt',
  'death',
]


export interface SpriteFrame {
  /** 0-indexed frame position in the sheet (row-major). */
  index: number
  /** Post-chromakey (alpha-keyed) PNG data URL for a single frame cell. */
  imageUrl: string | null
  /** When true, the frame is excluded from playback AND from every export
   * (grid, strip, per-frame ZIP, manifest). Toggled by clicking the cell. */
  disabled?: boolean
}


export interface SpriteSheet {
  /** Animation type these frames represent. */
  anim: SpriteAnimType
  /** Individual chroma-keyed frame cells, length === SPRITE_FRAME_COUNT. */
  frames: SpriteFrame[]
  /** Stitched grid sheet PNG (chroma-keyed). Cached for export. */
  gridSheetUrl: string | null
  /** Pre-keying raw output from the AI (with magenta still in place). Kept
   * mostly for debug-mode export so users can inspect the original. */
  rawGridSheetUrl: string | null
  /** Prompt that produced this sheet — surfaced in the manifest for reproducibility. */
  prompt: string
  /** Frames-per-second the sheet should play back at. */
  fps: number
}


export function createEmptySpriteSheet(anim: SpriteAnimType): SpriteSheet {
  return {
    anim,
    frames: Array.from({ length: SPRITE_FRAME_COUNT }, (_, i) => ({
      index: i,
      imageUrl: null,
    })),
    gridSheetUrl: null,
    rawGridSheetUrl: null,
    prompt: '',
    fps: SPRITE_ANIMATIONS[anim].defaultFps,
  }
}

/**
 * Starter prompts for Sprite mode. Each is a one-click character archetype
 * description — purposefully terse so it composes well with the per-frame
 * animation choreography injected by the API route.
 */

export interface SpritePreset {
  id: string
  label: string
  prompt: string
}


export const SPRITE_CHARACTER_PRESETS: SpritePreset[] = [
  {
    id: 'cat-knight',
    label: 'Cat knight',
    prompt:
      'Chibi kitten knight standing upright on two legs, oversized rounded pastel-silver armor, a tiny round shield, a stubby sword, big sparkly eyes, soft round cheeks, little ears poking out of the helmet. Adorable side-view chibi game sprite, soft pastel palette, rounded shapes, clean outlines.',
  },
  {
    id: 'mushroom-mage',
    label: 'Mushroom mage',
    prompt:
      'Tiny chibi wizard wearing a big red polka-dot mushroom cap as a hat, round pastel-lavender robe, a little wooden wand with a glowing star, big round eyes, rosy cheeks. Bipedal, side-view, adorable cartoon game sprite, soft pastels, clean rounded outlines.',
  },
  {
    id: 'bunny-archer',
    label: 'Bunny archer',
    prompt:
      'Fluffy chibi bunny ranger standing on two legs, long floppy ears, soft cream fur, a tiny leaf-green hood, a little bow, big round eyes, twitchy nose. Cute side-view game sprite, pastel palette, rounded shapes, clean outlines.',
  },
  {
    id: 'frog-paladin',
    label: 'Frog paladin',
    prompt:
      'Round chubby frog knight upright on two legs, smooth mint-green skin, a tiny golden helmet, a little heart-shaped shield, big friendly eyes, wide happy smile. Adorable side-view chibi game sprite, soft pastels, clean outlines.',
  },
  {
    id: 'star-fairy',
    label: 'Star fairy',
    prompt:
      'Tiny chibi fairy with two legs and two arms, a pastel-pink dress, small translucent wings, a glowing star wand, big sparkly eyes, a little flower in the hair. Cute side-view game sprite, soft glow, pastel palette, clean rounded outlines.',
  },
  {
    id: 'robo-buddy',
    label: 'Robo buddy',
    prompt:
      'Cute rounded little robot, chubby boxy body on two stubby legs, one big round screen-eye with a happy expression, a tiny antenna, pastel mint-and-cream paint. Bipedal, side-view, adorable cartoon game sprite, clean rounded outlines.',
  },
  {
    id: 'slime-pal',
    label: 'Slime pal',
    prompt:
      'Happy bipedal jelly slime with a clear rounded head, little arms and legs, glossy pastel-blue translucent body, two big shiny eyes and a wide cheerful smile. Adorable side-view chibi game sprite, soft highlights, clean outlines.',
  },
  {
    id: 'baby-dragon',
    label: 'Baby dragon',
    prompt:
      'Chubby baby dragon standing upright on two stubby legs, round pastel-teal body, tiny rounded wings, little nub horns, big sparkly eyes, rosy cheeks, a tiny tail. Cute side-view game sprite, soft pastels, clean rounded outlines.',
  },
  {
    id: 'acorn-scout',
    label: 'Acorn scout',
    prompt:
      'Little chibi forest scout wearing an acorn-cap hat, a round leaf-green cloak, a tiny satchel, big round eyes, freckles. Bipedal, side-view, adorable cartoon game sprite, warm pastel palette, clean outlines.',
  },
  {
    id: 'flower-druid',
    label: 'Flower druid',
    prompt:
      'Tiny chibi druid with a flower crown, a soft moss-green poncho, a little sprout staff, a round face with big gentle eyes. Bipedal, side-view game sprite, soft pastels, clean rounded outlines.',
  },

  // ── Friends ─────────────────────────────────────────────────────────────
  {
    id: 'mochi-cat',
    label: 'Mochi cat',
    prompt:
      'Very round white chibi cat standing on two tiny legs, a squishy mochi-like body, big round eyes, a tiny pink nose, a little curled tail. Adorable side-view game sprite, soft pastel shading, clean outlines.',
  },
  {
    id: 'piglet-chef',
    label: 'Piglet chef',
    prompt:
      'Cute chibi piglet cook on two legs, soft pink body, a tiny white chef hat and apron, holding a little wooden spoon, big happy eyes. Side-view cartoon game sprite, pastel palette, clean rounded outlines.',
  },
  {
    id: 'penguin-pal',
    label: 'Penguin pal',
    prompt:
      'Tiny chibi penguin standing upright on two legs, a round navy-and-white body, a cozy pastel scarf, little orange feet and beak, big round eyes. Adorable side-view game sprite, soft palette, clean outlines.',
  },
  {
    id: 'ghostling',
    label: 'Ghostling',
    prompt:
      'Cute friendly chibi ghost with a rounded floaty body and two little nub arms, big round eyes and a tiny smile, soft pastel-white body with a faint lilac glow. Side-view game sprite, soft edges, clean outlines.',
  },
  {
    id: 'corgi-hero',
    label: 'Corgi hero',
    prompt:
      'Chibi corgi standing on two stubby legs, fluffy orange-and-white fur, a tiny red hero cape, big round eyes, little tongue out. Adorable side-view game sprite, pastel palette, clean rounded outlines.',
  },
  {
    id: 'bee-buddy',
    label: 'Bee buddy',
    prompt:
      'Round chibi bumblebee person on two legs, a fuzzy yellow-and-black striped body, tiny translucent wings, little antennae, big sparkly eyes, a cheerful smile. Cute side-view game sprite, soft pastels, clean outlines.',
  },
  {
    id: 'axolotl-mage',
    label: 'Axolotl mage',
    prompt:
      'Chibi axolotl standing on two legs, a soft pastel-pink body, frilly head gills, a tiny star hat, big round eyes, a gentle smile. Adorable side-view game sprite, soft palette, clean rounded outlines.',
  },

  // ── Big friends (bosses) ────────────────────────────────────────────────
  {
    id: 'king-slime',
    label: 'King slime (boss)',
    prompt:
      'Big round jelly King Slime boss, a glossy pastel-blue translucent body, a tiny golden crown, big friendly eyes and a wide grin, little stubby arms. Large but adorable side-view chibi game sprite, soft highlights, clean outlines.',
  },
  {
    id: 'teddy-titan',
    label: 'Teddy titan (boss)',
    prompt:
      'Giant plush teddy-bear boss standing on two legs, soft caramel-brown fur, button eyes, visible stitches, oversized huggable arms, a tiny crown. Big yet cute side-view chibi game sprite, warm pastel palette, clean outlines.',
  },
  {
    id: 'pumpkin-lord',
    label: 'Pumpkin lord (boss)',
    prompt:
      "Chubby pumpkin-headed boss on two legs, a round orange jack-o'-lantern head with a cute carved smile, a little cozy cloak, big glowing soft-yellow eyes. Adorable side-view chibi game sprite, pastel autumn palette, clean outlines.",
  },
  {
    id: 'snow-yeti',
    label: 'Snow yeti (boss)',
    prompt:
      'Big fluffy friendly yeti boss standing upright on two legs, soft pastel-white fur, rosy cheeks, big gentle eyes, tiny ice-blue claws, a cozy scarf. Large but adorable side-view chibi game sprite, soft palette, clean outlines.',
  },
  {
    id: 'candy-golem',
    label: 'Candy golem (boss)',
    prompt:
      'Chunky golem boss built from gumdrops and candy, a pastel-pink-and-mint blocky body on two legs, a swirl lollipop in one hand, big round candy eyes, a cheerful look. Big yet cute side-view chibi game sprite, glossy pastels, clean outlines.',
  },
  {
    id: 'star-dragon',
    label: 'Star dragon (boss)',
    prompt:
      'Chubby celestial dragon boss standing on two legs, a soft lavender body dusted with little stars, rounded wings, a tiny crown of stars, big sparkly eyes, a gentle smile. Large but adorable side-view chibi game sprite, dreamy pastel palette, clean outlines.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational components
// ─────────────────────────────────────────────────────────────────────────────

