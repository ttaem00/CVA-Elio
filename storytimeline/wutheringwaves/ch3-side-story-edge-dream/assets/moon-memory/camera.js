import {Vector3, nativeCamera} from './scene-runtime.js?v=1491640ae11d';

const SOURCE_WIDTH = 1920;
const SOURCE_HEIGHT = 810;
const radians = degrees => degrees * Math.PI / 180;

export function fitViewport(width, height) {
  return {width, height, left:0, top:0};
}

export function createMoonCamera(scene, config) {
  const camera = scene.camera;
  const authored = config.character.nativeWorldProfile.camera;
  // The supplied scene settles its projection before resting at .12 exploration.
  const native = nativeCamera(camera, scene.nativeProfile, scene.nativeBounds, {
    width:SOURCE_WIDTH, height:SOURCE_HEIGHT, reveal:1, yaw:0, pitch:0,
    settleOverride:1, exploration:.12, storyProgress:0, reduced:true,
  });
  const alpha = native.projectionAlpha;
  if (!(alpha > 0)) throw Error('The supplied settled camera must have perspective depth');
  const target = new Vector3(...native.target);
  const direction = camera.position.clone().sub(target).normalize();
  const baseYaw = Math.atan2(direction.x, direction.z);
  const basePitch = Math.asin(direction.y);
  const roll = radians(authored.roll || 0) * (1-native.settle);
  // The original mixed projection has w=(1-alpha)+alpha*depth/distance.
  // A longer standard lens reproduces its image without morphing projection.
  const fov = 2*Math.atan(alpha*Math.tan(radians(camera.fov)/2))*180/Math.PI;
  const distance = native.distance/alpha;
  const offsetX = -(authored.shiftX || 0)*(1-native.settle);
  const offsetY = -(authored.shiftY || 0)*(1-native.settle);
  const near = camera.near, far = camera.far;

  let viewportWidth=SOURCE_WIDTH, viewportHeight=SOURCE_HEIGHT;
  function apply({yaw=0, pitch=0, dolly=1, width=SOURCE_WIDTH, height=SOURCE_HEIGHT}={}) {
    viewportWidth=width; viewportHeight=height;
    // Fill the available scene with a real perspective viewport. A narrow
    // viewport backs the whole camera away uniformly rather than stretching it.
    const fitDolly=Math.max(1,.70/(width/height));
    const azimuth=baseYaw+yaw, elevation=basePitch+pitch;
    direction.set(Math.sin(azimuth)*Math.cos(elevation), Math.sin(elevation),
      Math.cos(azimuth)*Math.cos(elevation));
    camera.position.copy(target).addScaledVector(direction, distance*dolly*fitDolly);
    camera.up.set(0,1,0);
    camera.lookAt(target);
    camera.rotateZ(roll);
    // Keep focal length fixed; aspect follows the actual buffer, so pixels stay isotropic.
    camera.fov=fov; camera.near=near; camera.far=far;
    camera.setViewOffset(width,height,offsetX*width/SOURCE_WIDTH,offsetY*height/SOURCE_HEIGHT,width,height);
    camera.updateMatrixWorld(true);
    // This uniform controls fragment rim/satin lighting, never mesh geometry.
    scene.projectionUniform.value=1;
  }

  function snapshot() {
    return {projection:'perspective', fov:camera.fov, aspect:camera.aspect,
      distance:camera.position.distanceTo(target), baseDistance:distance,
      target:target.toArray(), position:camera.position.toArray(),
      quaternion:camera.quaternion.toArray(), projectionMatrix:camera.projectionMatrix.toArray(),
      viewOffset:{fullWidth:viewportWidth,fullHeight:viewportHeight,
        offsetX:offsetX*viewportWidth/SOURCE_WIDTH,offsetY:offsetY*viewportHeight/SOURCE_HEIGHT,
        width:viewportWidth,height:viewportHeight},
      nativeProjectionAlpha:alpha, lightingProjectionAlpha:scene.projectionUniform.value};
  }

  apply();
  return {apply, snapshot};
}
