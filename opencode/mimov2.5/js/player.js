import * as THREE from 'three';
import { CONFIG, WEAPONS } from './config.js';
import { WeaponSystem } from './weapon.js';

export class Player {
    constructor(team, spawnIndex, input, map, audio, isHuman = false) {
        this.team = team;
        this.isHuman = isHuman;
        this.isAlive = true;
        this.input = input;
        this.map = map;
        this.audio = audio;

        const spawn = CONFIG.spawnPositions[team][spawnIndex];
        this.position = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.yaw = team === 'T' ? Math.PI / 2 : -Math.PI / 2;
        this.pitch = 0;

        this.health = CONFIG.maxHealth;
        this.armor = 0;
        this.money = 800;
        this.kills = 0;
        this.deaths = 0;

        this.onGround = true;
        this.isCrouching = false;
        this.canJump = true;

        this.currentWeapon = team === 'T' ? 'glock' : 'usp';
        this.ammo = {};
        this.initAmmo();

        this.weaponSystem = new WeaponSystem();
        this.lastFireTime = 0;

        this.camera = null;
        this.mesh = null;

        this.createMesh();

        if (this.isHuman) {
            this.camera = new THREE.PerspectiveCamera(
                80, window.innerWidth / window.innerHeight, 0.05, 300
            );
        }
    }

    initAmmo() {
        Object.keys(WEAPONS).forEach(id => {
            this.ammo[id] = {
                current: WEAPONS[id].ammo,
                reserve: WEAPONS[id].maxAmmo
            };
        });
    }

    createMesh() {
        const group = new THREE.Group();

        const bodyColor = this.team === 'T' ? 0x8b6914 : 0x2244aa;
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.2, 12, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xdbb896, roughness: 0.6 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.4;
        head.castShadow = true;
        group.add(head);

        const gunGeo = new THREE.BoxGeometry(0.08, 0.08, 0.6);
        const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.3 });
        const gun = new THREE.Mesh(gunGeo, gunMat);
        gun.position.set(0.35, 0.8, 0.3);
        group.add(gun);

        const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.15, -0.3, 0);
        group.add(legL);
        const legR = new THREE.Mesh(legGeo, legMat);
        legR.position.set(0.15, -0.3, 0);
        group.add(legR);

        group.position.copy(this.position);
        this.mesh = group;
        return group;
    }

    update(delta) {
        if (!this.isAlive) return;

        if (this.isHuman && this.input) {
            this.handleHumanInput(delta);
        }

        this.applyGravity(delta);
        this.move(delta);
        this.syncMesh();
    }

    handleHumanInput(delta) {
        if (!this.input.isPointerLocked) return;

        const md = this.input.getMouseDelta();
        this.yaw -= md.dx * 0.002;
        this.pitch -= md.dy * 0.002;
        this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

        const forward = this.input.isKeyDown('KeyW');
        const backward = this.input.isKeyDown('KeyS');
        const left = this.input.isKeyDown('KeyA');
        const right = this.input.isKeyDown('KeyD');
        const jump = this.input.isKeyDown('Space');
        const crouch = this.input.isKeyDown('ControlLeft') || this.input.isKeyDown('ControlRight');

        this.isCrouching = crouch;

        const dir = new THREE.Vector3();
        if (forward) dir.z -= 1;
        if (backward) dir.z += 1;
        if (left) dir.x -= 1;
        if (right) dir.x += 1;

        if (dir.lengthSq() > 0) {
            dir.normalize();
            const cos = Math.cos(this.yaw);
            const sin = Math.sin(this.yaw);
            const rx = dir.x * cos - dir.z * sin;
            const rz = dir.x * sin + dir.z * cos;
            dir.x = rx;
            dir.z = rz;
        }

        const speed = CONFIG.moveSpeed * (this.isCrouching ? 0.45 : 1.0);
        this.velocity.x = dir.x * speed;
        this.velocity.z = dir.z * speed;

        if (jump && this.onGround && this.canJump) {
            this.velocity.y = CONFIG.jumpForce;
            this.onGround = false;
            this.canJump = false;
        }

        if (!jump) {
            this.canJump = true;
        }
    }

    applyGravity(delta) {
        if (!this.onGround) {
            this.velocity.y -= CONFIG.gravity * delta;
        }
    }

    move(delta) {
        const newPos = this.position.clone();
        newPos.x += this.velocity.x * delta;
        newPos.y += this.velocity.y * delta;
        newPos.z += this.velocity.z * delta;

        const hw = CONFIG.playerWidth / 2;
        const ph = CONFIG.playerHeight / 2;

        const groundH = this.map.getGroundHeight(newPos.x, newPos.z);
        if (newPos.y - ph <= groundH) {
            newPos.y = groundH + ph;
            this.velocity.y = 0;
            this.onGround = true;
        }

        const slope = this.map.isOnSlope(newPos.x, newPos.z);
        if (slope && this.onGround) {
            this.velocity.y = Math.min(this.velocity.y, 0);
        }

        const testPos = new THREE.Vector3(newPos.x, newPos.y, newPos.z);
        if (!this.map.checkCollision(testPos, { x: hw, y: ph, z: hw })) {
            this.position.copy(newPos);
        } else {
            const testX = new THREE.Vector3(newPos.x, this.position.y, this.position.z);
            if (!this.map.checkCollision(testX, { x: hw, y: ph, z: hw })) {
                this.position.x = newPos.x;
            }
            const testZ = new THREE.Vector3(this.position.x, this.position.y, newPos.z);
            if (!this.map.checkCollision(testZ, { x: hw, y: ph, z: hw })) {
                this.position.z = newPos.z;
            }
        }

        const bounds = 59;
        this.position.x = Math.max(-bounds, Math.min(bounds, this.position.x));
        this.position.z = Math.max(-39, Math.min(39, this.position.z));
    }

    syncMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.position.y -= CONFIG.playerHeight / 2;
            this.mesh.rotation.y = this.yaw;
        }
    }

    tryShoot(targets, time) {
        if (!this.isAlive) return [];

        if (!this.weaponSystem.canFire(this.currentWeapon, time)) return [];

        const ammoData = this.ammo[this.currentWeapon];
        if (ammoData.current <= 0) return [];

        const shot = this.weaponSystem.fire(this.currentWeapon, ammoData);
        if (!shot) return [];

        ammoData.current--;

        const recoil = this.weaponSystem.getRecoil(this.currentWeapon);
        this.pitch += recoil * (0.5 + Math.random() * 0.5);

        const hits = [];
        const origin = this.getCameraPosition();
        const forward = this.getForwardVector();

        forward.x += shot.spreadX;
        forward.y += shot.spreadY;
        forward.normalize();

        for (const target of targets) {
            if (target === this || !target.isAlive) continue;
            if (target.team === this.team) continue;

            const hit = this.checkHit(origin, forward, target, shot.range);
            if (hit) {
                hits.push({ target, damage: shot.damage, distance: hit.distance });
            }
        }

        hits.sort((a, b) => a.distance - b.distance);
        return hits;
    }

    checkHit(origin, forward, target, maxRange) {
        const targetCenter = target.position.clone();
        targetCenter.y += CONFIG.headHeight;

        const toTarget = targetCenter.clone().sub(origin);
        const projDist = toTarget.dot(forward);

        if (projDist < 0 || projDist > maxRange) return null;

        const closest = origin.clone().add(forward.clone().multiplyScalar(projDist));
        const diff = closest.clone().sub(targetCenter);

        const headRadius = CONFIG.headRadius;
        const bodyRadius = 0.4;

        if (diff.y > CONFIG.headHeight - headRadius) {
            const dist2D = Math.sqrt(diff.x * diff.x + diff.z * diff.z);
            if (dist2D < headRadius) {
                return { distance: projDist, headshot: true };
            }
        }

        if (Math.abs(diff.y) < 1.0) {
            const dist2D = Math.sqrt(diff.x * diff.x + diff.z * diff.z);
            if (dist2D < bodyRadius) {
                return { distance: projDist, headshot: false };
            }
        }

        return null;
    }

    getCameraPosition() {
        return new THREE.Vector3(
            this.position.x,
            this.position.y + (this.isCrouching ? 1.0 : 1.7),
            this.position.z
        );
    }

    getForwardVector() {
        const dir = new THREE.Vector3(0, 0, -1);
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        dir.applyEuler(euler);
        return dir;
    }

    takeDamage(amount, attacker) {
        if (!this.isAlive) return;

        let dmg = amount;
        if (this.armor > 0) {
            const absorbed = Math.min(dmg * 0.5, this.armor);
            this.armor -= absorbed;
            dmg -= absorbed;
        }

        this.health -= dmg;

        if (this.health <= 0) {
            this.health = 0;
            this.die(attacker);
        }
    }

    die(killer) {
        this.isAlive = false;
        this.deaths++;
        if (killer) killer.kills++;

        if (this.mesh) this.mesh.visible = false;

        if (this.isHuman && this.audio) {
            this.audio.play('death');
        }
    }

    respawn(spawnIndex) {
        const spawn = CONFIG.spawnPositions[this.team][spawnIndex];
        this.position.set(spawn.x, spawn.y, spawn.z);
        this.velocity.set(0, 0, 0);
        this.health = CONFIG.maxHealth;
        this.isAlive = true;
        this.onGround = true;
        if (this.mesh) this.mesh.visible = true;
    }

    buy(item) {
        switch (item) {
            case 'glock':
                if (this.money >= WEAPONS.glock.price) {
                    this.money -= WEAPONS.glock.price;
                    this.currentWeapon = 'glock';
                    this.resetAmmo('glock');
                    return true;
                }
                break;
            case 'usp':
                if (this.money >= WEAPONS.usp.price) {
                    this.money -= WEAPONS.usp.price;
                    this.currentWeapon = 'usp';
                    this.resetAmmo('usp');
                    return true;
                }
                break;
            case 'ak47':
                if (this.team === 'T' && this.money >= WEAPONS.ak47.price) {
                    this.money -= WEAPONS.ak47.price;
                    this.currentWeapon = 'ak47';
                    this.resetAmmo('ak47');
                    return true;
                }
                break;
            case 'm4a1':
                if (this.team === 'CT' && this.money >= WEAPONS.m4a1.price) {
                    this.money -= WEAPONS.m4a1.price;
                    this.currentWeapon = 'm4a1';
                    this.resetAmmo('m4a1');
                    return true;
                }
                break;
            case 'armor':
                if (this.money >= 650) {
                    this.money -= 650;
                    this.armor = CONFIG.maxArmor;
                    return true;
                }
                break;
        }
        return false;
    }

    resetAmmo(weaponId) {
        this.ammo[weaponId] = {
            current: WEAPONS[weaponId].ammo,
            reserve: WEAPONS[weaponId].maxAmmo
        };
    }

    reload() {
        if (!this.isAlive) return;
        const ammo = this.ammo[this.currentWeapon];
        const weapon = WEAPONS[this.currentWeapon];
        if (ammo.current >= weapon.ammo || ammo.reserve <= 0) return;

        const needed = weapon.ammo - ammo.current;
        const available = Math.min(needed, ammo.reserve);
        ammo.current += available;
        ammo.reserve -= available;

        if (this.isHuman && this.audio) {
            this.audio.play('reload');
        }
    }
}
