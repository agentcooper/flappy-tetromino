var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer();
renderer.setSize(800, 480);

document.getElementById('container').appendChild(renderer.domElement);
document.body.className = 'loaded';

renderer.domElement.oncontextmenu = function() {
  return false;  
};

var camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

camera.position.set(0, 0, 3);

var PLAYER_BLOCK_SIZE = 0.5;

var SPEED = 0.09;

var LIMIT = 5.5;

var pause = true;

var caster = new THREE.Raycaster();

var playerBlock = new THREE.BoxGeometry(
  PLAYER_BLOCK_SIZE, PLAYER_BLOCK_SIZE, PLAYER_BLOCK_SIZE
);

// http://flatuicolors.com/
var WALL_COLORS = [
  0x3498db,
  0xe74c3c,
  0x2c3e50,
  0xd35400,
  0x7f8c8d,
  0x9b59b6
].map(function(color) {
  return new THREE.MeshPhongMaterial({
    color: color
  });
});

var playerMaterial = new THREE.MeshPhongMaterial({
  map: THREE.ImageUtils.loadTexture(
    'resource/skulls.png'
  ),
  transparent: true
});

playerMaterial.opacity = 0.5;

var player = renderGrid(
  playerBlock,
  PLAYER_BLOCK_SIZE,
  [
    [1, 0, 0],
    [1, 1, 1]
  ],
  playerMaterial
);

var playerRotation = 0;

player.position.set(0, 0, 0);

var tetrominoes = [
  [
    [0, 1, 1],
    [1, 1, 0]
  ],

  [
    [0, 0, 1],
    [1, 1, 1]
  ],

  [
    [1, 1],
    [1, 1]
  ],

  [
    [1, 1, 1, 1],
  ],

  [
    [0, 1, 0],
    [1, 1, 1]
  ],
];

var center = {
    x: 800 / 2,
    y: 480 / 2
}, mouse = {
  x: center.x,
  y: center.y
};

var pointLight = new THREE.PointLight(0xffffff, 1.2, 25);

scene.add(player);
scene.add(pointLight);

var world = new THREE.Object3D();
scene.add(world);

var HOLE_GEOMETRY  = new THREE.BoxGeometry(1, 1, 3, 2, 2, 2);
var PLANE_GEOMETRY = new THREE.BoxGeometry(12, 12, 3, 5, 5, 5);

function createWall(distance) {
  var group = new THREE.Object3D();

  var wall = new ThreeBSP(PLANE_GEOMETRY);

  var hole = renderGrid(
    HOLE_GEOMETRY,
    1,
    random(tetrominoes)
  );

  var scale = random([1.1, 1.2, 1.3]);

  hole.geometry.applyMatrix(
    new THREE.Matrix4().makeScale(scale, scale, scale)
  );

  hole.geometry.applyMatrix(
    new THREE.Matrix4().makeTranslation(
      random(-4.0, 4.0, true),
      random(-4.0, 4.0, true),
      0.0
    )
  );

  hole.geometry.applyMatrix(
    new THREE.Matrix4().makeRotationZ((Math.PI / 6) * random(0, 6))
  );

  wall = wall.subtract(
    new ThreeBSP(hole.geometry)
  );

  group.add(
    wall.toMesh(random(WALL_COLORS))
  );

  group.position.z = -distance;

  world.add(group);
}

function move() {
  player.position.z -= SPEED;

  var last = world.children[world.children.length - 1];

  if (player.position.z - last.position.z < 25) {
    buildMoreWalls();
  }
}

var l = 10;
function buildMoreWalls() {
  for (var i = 1; i < 5; i++) {
    createWall(l);
    l += 15;
  }
}

buildMoreWalls();

var tween = {
  player: new TWEEN.Tween(player.position),
  camera: new TWEEN.Tween(camera.position)
};

function resetOnCollistion() {
  var ghost = player.clone();
  scene.add(ghost);

  player.position.z += 7.5;
  pause = true;
}

(function render() {
  requestAnimationFrame(render);

  TWEEN.update();

  var playerX = -(center.x - mouse.x) / 40;
  var playerY =  (center.y - mouse.y) / 40;

  if (playerX < -LIMIT) { playerX = -LIMIT; }
  if (playerX >  LIMIT) { playerX =  LIMIT; }
  if (playerY < -LIMIT) { playerY = -LIMIT; }
  if (playerY >  LIMIT) { playerY =  LIMIT; }

  tween.player.to({
    x: playerX,
    y: playerY
  }, 300).easing(TWEEN.Easing.Quadratic.Out).start();

  if (!pause) {
    move();
  }

  // light
  pointLight.position.set(player.position.x, player.position.y, player.position.z + 5);
  pointLight.intensity = Math.cos(player.position.z / 2) + 2.0;

  tween.camera.to({
    x: player.position.x,
    y: player.position.y,
  }, 500).easing(TWEEN.Easing.Quadratic.Out).start();

  camera.position.z = player.position.z + 4;

  camera.lookAt(player.position);

  if (!pause) {
    checkCollision(resetOnCollistion);
  }

  renderer.render(scene, camera);
})();

/*
 * @param {Function} onCollision Callback
 */
function checkCollision(onCollision) {
  var originPoint = player.position.clone();

  // meshes to check for
  var meshes = [];

  for (var j = 0; j < world.children.length; j++) {
    Array.prototype.push.apply(meshes, world.children[j].children);
  }

  for (var vertexIndex = 0; vertexIndex < player.geometry.vertices.length; vertexIndex++) {   
    var localVertex     = player.geometry.vertices[vertexIndex].clone(),
        globalVertex    = localVertex.applyMatrix4(player.matrix),
        directionVector = globalVertex.sub(player.position);
    
    caster.set(originPoint, directionVector.clone().normalize() );

    var collisionResults = caster.intersectObjects(meshes);

    if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() )  {
      return onCollision(collisionResults);
    }
  }
}

document.addEventListener('keydown', function(event) {
  console.log(event.which);

  if (event.which === 32 /* space */) {
    pause = false;
  }

  if (event.which === 65 /* a */) {
    playerRotation++;
  }

  if (event.which === 68 /* d */) {
    playerRotation--;
  }

  new TWEEN.Tween(player.rotation).to({
    z: (Math.PI / 6) * playerRotation
  }, 300).easing(TWEEN.Easing.Linear.None).start();
});

container.addEventListener('mousemove', function(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
});
