// Builds the world's objects the way they're all made: from simple shapes, each painted with
// a color (or a picture from the atlas), then merged into a single geometry. A whole bench,
// tree or sofa is one mesh and one draw call, and every prop can share one material.
//
// Colors live in the vertices, together with a little baked shading: surfaces darken where
// they meet the ground, the soft "ambient occlusion" look, without computing any at run time.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const matrix = new THREE.Matrix4()
const quaternion = new THREE.Quaternion()
const euler = new THREE.Euler()
const color = new THREE.Color()

export class Builder {
  /**
   * @param {object} atlas  From createAtlas(); untextured parts sample its white texel
   */
  constructor (atlas) {
    this.atlas = atlas
    this.parts = []
  }

  /**
   * Adds a shape.
   * @param {THREE.BufferGeometry} geometry  Not changed; a copy is placed
   * @param {string|number} paint  Its color
   * @param {object} [at]  position [x, y, z], rotation [x, y, z], scale [x, y, z] or a number,
   *   region: an atlas region name to print on it (the shape's own uv picks the spot)
   */
  add (geometry, paint, at = {}) {
    const part = geometry.index ? geometry.toNonIndexed() : geometry.clone()
    for (const name of Object.keys(part.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) part.deleteAttribute(name)
    }
    const count = part.attributes.position.count
    // Texture coordinates: into the region, or everything on the white texel
    const uv = new Float32Array(count * 2)
    const region = at.region && this.atlas.regions[at.region]
    const source = part.attributes.uv
    for (let i = 0; i < count; i++) {
      if (region && source) {
        uv[i * 2] = region.u0 + source.getX(i) * (region.u1 - region.u0)
        uv[i * 2 + 1] = region.v0 + source.getY(i) * (region.v1 - region.v0)
      } else {
        uv[i * 2] = this.atlas.white.u
        uv[i * 2 + 1] = this.atlas.white.v
      }
    }
    part.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    const scale = at.scale === undefined ? [1, 1, 1] : typeof at.scale === 'number' ? [at.scale, at.scale, at.scale] : at.scale
    matrix.compose(
      new THREE.Vector3(...(at.position || [0, 0, 0])),
      quaternion.setFromEuler(euler.set(...(at.rotation || [0, 0, 0]))),
      new THREE.Vector3(...scale)
    )
    part.applyMatrix4(matrix)
    color.set(paint)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3)
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.parts.push(part)
    return this
  }

  /**
   * Merges everything added into one geometry.
   * @param {object} [options]
   * @param {number} [options.ao]  Height (from y = 0) over which surfaces fade in from shadow
   * @param {number} [options.aoStrength]  How dark the ground contact gets (0 to 1)
   */
  build ({ ao = 0, aoStrength = 0.45 } = {}) {
    const geometry = mergeGeometries(this.parts, false)
    this.parts.forEach(part => part.dispose())
    this.parts = []
    if (ao > 0) {
      const positions = geometry.attributes.position
      const colors = geometry.attributes.color
      for (let i = 0; i < positions.count; i++) {
        const t = Math.min(1, Math.max(0, positions.getY(i) / ao))
        const shade = 1 - aoStrength * (1 - t * t * (3 - 2 * t))
        colors.setXYZ(i, colors.getX(i) * shade, colors.getY(i) * shade, colors.getZ(i) * shade)
      }
    }
    geometry.computeBoundingSphere()
    geometry.computeBoundingBox()
    return geometry
  }
}

/** The one material most of the world shares: the atlas, tinted by vertex colors. */
export function propMaterial (atlas, options = {}) {
  return new THREE.MeshStandardMaterial({ map: atlas.texture, vertexColors: true, roughness: 0.72, metalness: 0, ...options })
}
