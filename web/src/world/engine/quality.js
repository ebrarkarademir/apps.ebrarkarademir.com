// How much the device can take. Phones, tablets and small machines get a lighter world: no
// bloom, smaller and harder-edged shadows, fewer fountain drops and fewer pixels. The look stays
// the same; the frame gets cheaper.
const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 8

export const LOW = touch || cores <= 4

export const QUALITY = LOW
  ? { bloom: false, shadowSize: 1024, softShadows: false, maxPixelRatio: 1.25, fountainDrops: 300 }
  : { bloom: true, shadowSize: 2048, softShadows: true, maxPixelRatio: 1.5, fountainDrops: 700 }
