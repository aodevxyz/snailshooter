
// Setup Three.js
let scene, camera, renderer;
let player, ground, leftEye;
const enemies = [];
const bullets = [];
const particles = [];
const powerUps = [];
const obstacles = [];

const game = {
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    score: 0,
    time: 0,
    lastTime: Date.now(),
    playerHealth: 100,
    isGameOver: false,
    isGameStarted: false,
    speedBoostTime: 0,
    shieldBoostTime: 0,
    superPowerUpTime: 0, // Super power-up
    lastEnemySpawn: 0,
    playerName: "Player",
    highScore: 0
};

// Start Screen Event Listener
window.addEventListener('load', () => {
    loadHighScore();
    document.getElementById('high-score-display').textContent = `High Score: ${game.highScore}`;

    const startButton = document.getElementById('startButton');
    const playerNameInput = document.getElementById('playerName');

    startButton.addEventListener('click', () => {
        game.playerName = playerNameInput.value || "Anonymous";
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('ui').style.display = 'flex';
        document.getElementById('controls').style.display = 'block';
        game.isGameStarted = true;
        init();
    });
});


function loadHighScore() {
    const score = localStorage.getItem('snailShooterHighScore');
    if (score) {
        game.highScore = parseInt(score, 10);
    }
}

function saveHighScore() {
    if (game.score > game.highScore) {
        game.highScore = game.score;
        localStorage.setItem('snailShooterHighScore', game.highScore);
    }
}


function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 40, 120);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(25, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    scene.add(directionalLight);

    // Ground
    createGround();

    // Player
    createPlayer();

    // Initial enemies
    for (let i = 0; i < 8; i++) {
        spawnEnemy();
    }

    // Event listeners
    document.addEventListener('keydown', (e) => game.keys[e.key] = true);
    document.addEventListener('keyup', (e) => game.keys[e.key] = false);
    
    document.addEventListener('mousemove', (e) => {
        game.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        game.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener('mousedown', () => game.mouse.down = true);
    document.addEventListener('mouseup', () => game.mouse.down = false);

    window.addEventListener('resize', onWindowResize);

    animate();
}

function createGround() {
    const groundSize = 100;
    const geometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const material = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    // Add some obstacles
    for (let i = 0; i < 20; i++) {
        const size = Math.random() * 3 + 1;
        const geometry = new THREE.BoxGeometry(size, size * 2, size);
        const material = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const obstacle = new THREE.Mesh(geometry, material);
        obstacle.position.set(
            (Math.random() - 0.5) * 80,
            size,
            (Math.random() - 0.5) * 80
        );
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

function createPlayer() {
    player = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(2, 2, 2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x00beef });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    player.add(body);

    const eyeGeo = new THREE.BoxGeometry(0.4, 0.4, 0.1);
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
    leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.5, 0.3, 1.01);
    player.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    rightEye.position.set(0.5, 0.3, 1.01);
    player.add(rightEye);

    player.position.set(0, 1, 0);
    player.userData = {
        velocity: new THREE.Vector3(),
        shootCooldown: 0,
        dashCooldown: 0,
    };
    
    scene.add(player);
}

function spawnEnemy() {
    const enemy = new THREE.Group();
    const shellColors = [0x8B4513, 0x654321, 0x5a3a1a];
    for (let i = 0; i < 3; i++) {
        const size = 1.5 - i * 0.3;
        const shellGeo = new THREE.BoxGeometry(size, size, size);
        const shellMat = new THREE.MeshLambertMaterial({ color: shellColors[i] });
        const shellPart = new THREE.Mesh(shellGeo, shellMat);
        shellPart.position.set(-i * 0.2, i * 0.2, 0);
        shellPart.rotation.x = Math.random() * 0.2;
        shellPart.rotation.z = Math.random() * 0.2;
        shellPart.castShadow = true;
        enemy.add(shellPart);
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = 45 + Math.random() * 20;
    enemy.position.set(Math.cos(angle) * distance, 0.75, Math.sin(angle) * distance);

    enemy.userData = {
        health: 20,
        speed: 0.08 + Math.random() * 0.05,
        wobblePhase: Math.random() * Math.PI * 2
    };

    enemies.push(enemy);
    scene.add(enemy);
}

function spawnPowerUp() {
    const powerUp = new THREE.Group();
    let type;
    const rand = Math.random();
    if (rand < 0.05) { // 5% chance for Super Power-up
        type = 'super';
    } else if (rand < 0.5) {
        type = 'speed';
    } else {
        type = 'shield';
    }

    const color = type === 'speed' ? 0xFFD700 : type === 'shield' ? 0x00BFFF : 0xFF0000;
    
    const coreGeo = new THREE.BoxGeometry(1, 1, 1);
    const coreMat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.8 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    powerUp.add(core);

    const angle = Math.random() * Math.PI * 2;
    const distance = 25;
    powerUp.position.set(Math.cos(angle) * distance, 1, Math.sin(angle) * distance);
    powerUp.userData = { type, rotation: 0 };
    powerUps.push(powerUp);
    scene.add(powerUp);
}


function shootBullet() {
    const bullet = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 1),
        new THREE.MeshLambertMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.8 })
    );

    let direction = player.getWorldDirection(new THREE.Vector3());

    // AIM ASSIST
    if (game.superPowerUpTime > 0) {
        let closestEnemy = null;
        let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distance = player.position.distanceTo(enemy.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });
        if (closestEnemy) {
            direction = closestEnemy.position.clone().sub(player.position).normalize();
        }
    }
    
    bullet.position.copy(player.position).add(direction.clone().multiplyScalar(1.5));
    bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), direction);

    bullet.userData = {
        velocity: direction.multiplyScalar(1.5),
        life: 80
    };

    bullets.push(bullet);
    scene.add(bullet);
}


function createParticle(position, color, count) {
    for (let i=0; i < count; i++) {
        const particle = new THREE.Mesh(
             new THREE.BoxGeometry(0.2, 0.2, 0.2),
             new THREE.MeshBasicMaterial({ color })
        );
        particle.position.copy(position);
        particle.userData = {
            velocity: new THREE.Vector3((Math.random() - 0.5), Math.random(), (Math.random() - 0.5)).multiplyScalar(0.4),
            life: 30
        };
        particles.push(particle);
        scene.add(particle);
    }
}

function updatePlayer() {
    if (game.isGameOver) return;

    const playerBox = new THREE.Box3().setFromObject(player);

    // -- ROTATION --
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -player.position.y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(game.mouse, camera);
    const intersect = new THREE.Vector3();
    if(raycaster.ray.intersectPlane(plane, intersect)) {
        player.lookAt(intersect);
    }

    // -- MOVEMENT --
    let moveDirection = new THREE.Vector3(0,0,0);
    if (game.keys['w'] || game.keys['W']) {
        const forward = new THREE.Vector3();
        player.getWorldDirection(forward);
        moveDirection.add(forward);
    }
    
    const isDashing = game.keys['Shift'] && player.userData.dashCooldown === 0;
    let speed = isDashing ? 0.6 : 0.3;

    // -- POWER-UPS --
    if (game.speedBoostTime > 0) { speed *= 1.8; game.speedBoostTime--; document.getElementById('powerUp').style.display = 'block'; } 
    else { document.getElementById('powerUp').style.display = 'none'; }

    if (game.shieldBoostTime > 0) { game.shieldBoostTime--; document.getElementById('shieldUp').style.display = 'block'; } 
    else { document.getElementById('shieldUp').style.display = 'none'; }
    
    if (game.superPowerUpTime > 0) {
        speed *= 2.5; 
        game.superPowerUpTime--;
        document.getElementById('superPowerUp').style.display = 'block';
        if (leftEye.material.color.getHex() !== 0xff0000) {
             leftEye.material.color.set(0xff0000);
             leftEye.material.emissive.set(0xff0000);
             leftEye.material.emissiveIntensity = 2;
        }
    } else {
        document.getElementById('superPowerUp').style.display = 'none';
        if (leftEye.material.color.getHex() !== 0x000000) {
            leftEye.material.color.set(0x000000);
            leftEye.material.emissive.set(0x000000);
        }
    }


    if (moveDirection.length() > 0.01) {
        moveDirection.normalize().multiplyScalar(speed);
        
        const predictedPosition = player.position.clone().add(moveDirection);
        const predictedBox = new THREE.Box3().setFromObject(player).translate(moveDirection);

        let collision = false;
        for (const obstacle of obstacles) {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (predictedBox.intersectsBox(obstacleBox)) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            player.position.add(moveDirection);
        }
    }
    
    if (isDashing) {
        player.userData.dashCooldown = 40;
        createParticle(player.position, 0x00beef, 10);
    }
    if (player.userData.dashCooldown > 0) player.userData.dashCooldown--;


    const maxDist = 48;
    player.position.x = Math.max(-maxDist, Math.min(maxDist, player.position.x));
    player.position.z = Math.max(-maxDist, Math.min(maxDist, player.position.z));

    // Shooting
    if (player.userData.shootCooldown > 0) player.userData.shootCooldown--;
    if (game.mouse.down && player.userData.shootCooldown === 0) {
        shootBullet();
        player.userData.shootCooldown = game.superPowerUpTime > 0 ? 2 : 7; // Faster shooting with super power-up
    }

    // Camera follow
    const cameraOffset = new THREE.Vector3(0, 18, 12);
    camera.position.lerp(player.position.clone().add(cameraOffset), 0.05);
    camera.lookAt(player.position);
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        const direction = player.position.clone().sub(enemy.position);
        const dist = direction.length();
        
        if (dist > 0 && dist < 50) { // Only move if player is within range
            direction.normalize();
            enemy.position.add(direction.multiplyScalar(enemy.userData.speed));
            enemy.lookAt(player.position);
        }

        enemy.userData.wobblePhase += 0.1;
        enemy.position.y = 0.75 + Math.sin(enemy.userData.wobblePhase) * 0.2;

        if (dist < 1.5 && game.shieldBoostTime <= 0) {
            game.playerHealth -= 2;
            createParticle(player.position, 0xff0000, 5);
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if(bullet.position.distanceTo(enemy.position) < 1.5) {
                enemy.userData.health -= 20;
                scene.remove(bullet);
                bullets.splice(j, 1);

                if (enemy.userData.health <= 0) {
                    scene.remove(enemy);
                    enemies.splice(i, 1);
                    game.score++;
                    createParticle(enemy.position, 0x8B4513, 20);
                    if (Math.random() < 0.25) { // Higher chance for power-up
                        spawnPowerUp();
                    }
                } else {
                     createParticle(enemy.position, 0xffffff, 8);
                }
                break; 
            }
        }
    }

    if (Date.now() - game.lastEnemySpawn > 800 && enemies.length < 30) {
        spawnEnemy();
        game.lastEnemySpawn = Date.now();
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.rotation.y += 0.05;
        powerUp.position.y = 1 + Math.sin(Date.now() * 0.005 + i) * 0.3;

        if (powerUp.position.distanceTo(player.position) < 2) {
            if (powerUp.userData.type === 'speed') game.speedBoostTime = 300;
            else if (powerUp.userData.type === 'shield') game.shieldBoostTime = 400;
            else if (powerUp.userData.type === 'super') game.superPowerUpTime = 500;
            
            scene.remove(powerUp);
            powerUps.splice(i, 1);
            createParticle(player.position, 0x00ffaa, 25);
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.userData.velocity);
        bullet.userData.life--;
        if (bullet.userData.life <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.velocity);
        p.userData.velocity.y -= 0.02;
        p.userData.life--;
        p.material.opacity = p.userData.life / 30;
        p.material.transparent = true;
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
}

function updateUI() {
    document.getElementById('playerNameUI').textContent = game.playerName;
    document.getElementById('health').textContent = Math.max(0, Math.floor(game.playerHealth));
    document.getElementById('kills').textContent = game.score;
    document.getElementById('time').textContent = Math.floor((Date.now() - game.lastTime) / 1000);
    document.getElementById('dash').textContent = player.userData.dashCooldown > 0 ? Math.ceil(player.userData.dashCooldown / 10) : "READY";

    if (game.playerHealth <= 0 && !game.isGameOver) {
        game.isGameOver = true;
        saveHighScore();
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = `${game.playerName}, you killed ${game.score} snails!`;
        document.getElementById('highScore-gameover').textContent = `Your High Score: ${game.highScore}`;
    }
}

function animate() {
    if (!game.isGameStarted) return;
    requestAnimationFrame(animate);

    updatePlayer();
    updateEnemies();
    updatePowerUps();
    updateBullets();
    updateParticles();
    updateUI();

    renderer.render(scene, camera);
}

function onWindowResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
