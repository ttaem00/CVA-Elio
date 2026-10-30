import * as THREE from 'three';

// Fixed placement in the supplied asset's authored XYZ units. Do not re-fit its
// bounds: adding an inferred rear surface must not move the front or the grip.
// Calibrated from display, cover, knob and handle guides in two source views.
export const CASSETTE_PLACEMENT = {
  x: [.9468788743897248, .1141492052128776, .36000006915882415],
  y: [-.2196478458662669, 1.1308599600791231, .2191475673608114],
  z: [-.2951730873974159, -.2213866401001433, .846567253359972],
  offset: [.00145400154196643, .006975421993465988, .01928821338332159],
};

export function registerCassette(model, pivot) {
  const bounds = new THREE.Box3().setFromObject(model);
  const extent = bounds.getSize(new THREE.Vector3());
  if (![extent.x, extent.y, extent.z].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Cassette model must have finite nonzero dimensions');
  }
  const prop = new THREE.Group();
  prop.add(model);
  prop.matrixAutoUpdate = false;
  prop.matrix.makeBasis(new THREE.Vector3(...CASSETTE_PLACEMENT.x),
    new THREE.Vector3(...CASSETTE_PLACEMENT.y), new THREE.Vector3(...CASSETTE_PLACEMENT.z));
  prop.matrix.setPosition(pivot.clone().add(new THREE.Vector3(...CASSETTE_PLACEMENT.offset)));

  const materials = new Map();
  function unlit(material) {
    if (material.isMeshBasicMaterial) return material;
    if (!materials.has(material)) {
      const values = {};
      for (const key of ['name', 'color', 'map', 'alphaMap', 'aoMap', 'aoMapIntensity',
        'lightMap', 'lightMapIntensity', 'envMap', 'vertexColors', 'opacity',
        'transparent', 'alphaTest', 'side', 'depthTest', 'depthWrite']) {
        if (material[key] !== undefined) values[key] = material[key];
      }
      materials.set(material, new THREE.MeshBasicMaterial(values));
    }
    return materials.get(material);
  }
  prop.traverse(object => {
    if (object.isMesh) object.material = Array.isArray(object.material)
      ? object.material.map(unlit) : unlit(object.material);
  });

  let triangles = 0;
  prop.traverseVisible(object => {
    if (object.isMesh) triangles += (object.geometry.index?.count
      ?? object.geometry.getAttribute('position')?.count ?? 0) / 3;
  });
  prop.updateWorldMatrix(true, true);
  const anchor = prop.getObjectByName('ELIO_Reel_Anchor');
  const reelAnchor = anchor ? anchor.getWorldPosition(new THREE.Vector3()) : null;
  return { prop, reelAnchor, triangles };
}
