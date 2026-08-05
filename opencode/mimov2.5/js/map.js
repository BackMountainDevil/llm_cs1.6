import * as THREE from 'three';
import { CONFIG } from './config.js';

export class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.slopes = [];
        this.build();
    }

    build() {
        this.createGround();
        this.createPlatform();
        this.createWalls();
        this.createSlopes();
        this.createCover();
        this.createBombSites();
        this.createSkybox();
    }

    createGround() {
        const geo = new THREE.PlaneGeometry(120, 80);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x4a7a3a,
            roughness: 0.9,
            metalness: 0.0
        });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const floorGeo = new THREE.PlaneGeometry(120, 80);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x3a6a2a,
            roughness: 1.0
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    createPlatform() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.7,
            metalness: 0.1
        });

        const platformGeo = new THREE.BoxGeometry(40, 2, 30);
        const platform = new THREE.Mesh(platformGeo, mat);
        platform.position.set(0, 1, 0);
        platform.castShadow = true;
        platform.receiveShadow = true;
        this.scene.add(platform);

        this.colliders.push({
            min: { x: -20, y: 0, z: -15 },
            max: { x: 20, y: 2, z: 15 }
        });

        const edgeMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
        const edges = [
            { pos: [0, 1.5, -15], size: [40, 1, 0.5] },
            { pos: [0, 1.5, 15], size: [40, 1, 0.5] },
            { pos: [-20, 1.5, 0], size: [0.5, 1, 30] },
            { pos: [20, 1.5, 0], size: [0.5, 1, 30] }
        ];

        edges.forEach(e => {
            const geo = new THREE.BoxGeometry(...e.size);
            const mesh = new THREE.Mesh(geo, edgeMat);
            mesh.position.set(...e.pos);
            mesh.castShadow = true;
            this.scene.add(mesh);
        });
    }

    createWalls() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.8
        });

        const walls = [
            { pos: [0, 3, -40], size: [120, 6, 1] },
            { pos: [0, 3, 40], size: [120, 6, 1] },
            { pos: [-60, 3, 0], size: [1, 6, 80] },
            { pos: [60, 3, 0], size: [1, 6, 80] }
        ];

        walls.forEach(w => {
            const geo = new THREE.BoxGeometry(...w.size);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...w.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push({
                min: {
                    x: w.pos[0] - w.size[0] / 2,
                    y: w.pos[1] - w.size[1] / 2,
                    z: w.pos[2] - w.size[2] / 2
                },
                max: {
                    x: w.pos[0] + w.size[0] / 2,
                    y: w.pos[1] + w.size[1] / 2,
                    z: w.pos[2] + w.size[2] / 2
                }
            });
        });

        const innerMat = new THREE.MeshStandardMaterial({
            color: 0x9b8365,
            roughness: 0.75
        });

        const innerWalls = [
            { pos: [-10, 2, 8], size: [8, 4, 0.6] },
            { pos: [10, 2, -8], size: [8, 4, 0.6] },
            { pos: [0, 2, 20], size: [0.6, 4, 10] },
            { pos: [0, 2, -20], size: [0.6, 4, 10] }
        ];

        innerWalls.forEach(w => {
            const geo = new THREE.BoxGeometry(...w.size);
            const mesh = new THREE.Mesh(geo, innerMat);
            mesh.position.set(...w.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push({
                min: {
                    x: w.pos[0] - w.size[0] / 2,
                    y: w.pos[1] - w.size[1] / 2,
                    z: w.pos[2] - w.size[2] / 2
                },
                max: {
                    x: w.pos[0] + w.size[0] / 2,
                    y: w.pos[1] + w.size[1] / 2,
                    z: w.pos[2] + w.size[2] / 2
                }
            });
        });
    }

    createSlopes() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.65
        });

        const slopeDefs = [
            { x: -26, z: 0, rotZ: 0.45, label: 'left' },
            { x: 26, z: 0, rotZ: -0.45, label: 'right' },
            { x: 0, z: 25, rotX: 0.45, label: 'front' },
            { x: 0, z: -25, rotX: -0.45, label: 'back' }
        ];

        slopeDefs.forEach(s => {
            const geo = new THREE.BoxGeometry(8, 0.6, 14);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(s.x, 1, s.z);
            if (s.rotZ) mesh.rotation.z = s.rotZ;
            if (s.rotX) mesh.rotation.x = s.rotX;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.slopes.push({
                x: s.x,
                y: 1,
                z: s.z,
                width: 8,
                length: 14,
                rotZ: s.rotZ || 0,
                rotX: s.rotX || 0,
                angle: Math.abs(s.rotZ || s.rotX)
            });
        });
    }

    createCover() {
        const crateMat = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b,
            roughness: 0.85
        });

        const darkCrateMat = new THREE.MeshStandardMaterial({
            color: 0x5a3a1b,
            roughness: 0.85
        });

        const crates = [
            { pos: [-8, 2.5, -5], size: [2, 2, 2], mat: crateMat },
            { pos: [8, 2.5, 5], size: [2, 2, 2], mat: crateMat },
            { pos: [-14, 2.5, 8], size: [3, 2, 2], mat: darkCrateMat },
            { pos: [14, 2.5, -8], size: [3, 2, 2], mat: darkCrateMat },
            { pos: [0, 2.5, 10], size: [2, 2, 3], mat: crateMat },
            { pos: [0, 2.5, -10], size: [2, 2, 3], mat: darkCrateMat },
            { pos: [-35, 0.9, 0], size: [2, 1.8, 2], mat: crateMat },
            { pos: [35, 0.9, 0], size: [2, 1.8, 2], mat: darkCrateMat },
            { pos: [-30, 0.9, 8], size: [2, 1.8, 2], mat: crateMat },
            { pos: [30, 0.9, -8], size: [2, 1.8, 2], mat: darkCrateMat },
            { pos: [-5, 2.5, 0], size: [1.5, 2, 1.5], mat: crateMat },
            { pos: [5, 2.5, 0], size: [1.5, 2, 1.5], mat: darkCrateMat },
            { pos: [-18, 2.5, -10], size: [2, 2, 2], mat: crateMat },
            { pos: [18, 2.5, 10], size: [2, 2, 2], mat: darkCrateMat }
        ];

        crates.forEach(c => {
            const geo = new THREE.BoxGeometry(...c.size);
            const mesh = new THREE.Mesh(geo, c.mat);
            mesh.position.set(...c.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push({
                min: {
                    x: c.pos[0] - c.size[0] / 2,
                    y: c.pos[1] - c.size[1] / 2,
                    z: c.pos[2] - c.size[2] / 2
                },
                max: {
                    x: c.pos[0] + c.size[0] / 2,
                    y: c.pos[1] + c.size[1] / 2,
                    z: c.pos[2] + c.size[2] / 2
                }
            });
        });
    }

    createBombSites() {
        const siteMatA = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            roughness: 0.5,
            transparent: true,
            opacity: 0.35,
            emissive: 0xff0000,
            emissiveIntensity: 0.2
        });
        const siteMatB = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            roughness: 0.5,
            transparent: true,
            opacity: 0.35,
            emissive: 0xff0000,
            emissiveIntensity: 0.2
        });

        const siteGeo = new THREE.CylinderGeometry(3, 3, 0.15, 32);

        const siteA = new THREE.Mesh(siteGeo, siteMatA);
        siteA.position.set(CONFIG.bombSites.A.x, 2.1, CONFIG.bombSites.A.z);
        this.scene.add(siteA);

        const siteB = new THREE.Mesh(siteGeo, siteMatB);
        siteB.position.set(CONFIG.bombSites.B.x, 2.1, CONFIG.bombSites.B.z);
        this.scene.add(siteB);

        const labelMatA = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const labelGeo = new THREE.BoxGeometry(1.5, 0.5, 0.1);
        const labelA = new THREE.Mesh(labelGeo, labelMatA);
        labelA.position.set(CONFIG.bombSites.A.x, 3, CONFIG.bombSites.A.z - 3.5);
        this.scene.add(labelA);

        const labelB = new THREE.Mesh(labelGeo, labelMatA.clone());
        labelB.position.set(CONFIG.bombSites.B.x, 3, CONFIG.bombSites.B.z + 3.5);
        this.scene.add(labelB);
    }

    createSkybox() {
        const skyGeo = new THREE.SphereGeometry(200, 32, 15);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x87ceeb,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        for (let i = 0; i < 20; i++) {
            const treeGeo = new THREE.ConeGeometry(1.5, 4, 8);
            const treeMat = new THREE.MeshStandardMaterial({
                color: 0x228b22,
                roughness: 0.9
            });
            const tree = new THREE.Mesh(treeGeo, treeMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 45 + Math.random() * 15;
            tree.position.set(
                Math.cos(angle) * dist,
                2,
                Math.sin(angle) * dist
            );
            tree.castShadow = true;
            this.scene.add(tree);

            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 6);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(tree.position.x, 0.75, tree.position.z);
            this.scene.add(trunk);
        }
    }

    checkCollision(pos, halfExtents) {
        const box = {
            min: {
                x: pos.x - halfExtents.x,
                y: pos.y - halfExtents.y,
                z: pos.z - halfExtents.z
            },
            max: {
                x: pos.x + halfExtents.x,
                y: pos.y + halfExtents.y,
                z: pos.z + halfExtents.z
            }
        };

        for (const c of this.colliders) {
            if (
                box.min.x < c.max.x && box.max.x > c.min.x &&
                box.min.y < c.max.y && box.max.y > c.min.y &&
                box.min.z < c.max.z && box.max.z > c.min.z
            ) {
                return true;
            }
        }
        return false;
    }

    getGroundHeight(x, z) {
        for (const slope of this.slopes) {
            const halfW = slope.width / 2;
            const halfL = slope.length / 2;

            if (x >= slope.x - halfW && x <= slope.x + halfW &&
                z >= slope.z - halfL && z <= slope.z + halfL) {

                let t;
                if (slope.rotZ !== 0) {
                    t = (x - (slope.x - halfW)) / slope.width;
                    if (slope.rotZ > 0) t = 1 - t;
                } else {
                    t = (z - (slope.z - halfL)) / slope.length;
                    if (slope.rotX > 0) t = 1 - t;
                }

                t = Math.max(0, Math.min(1, t));
                const height = t * 2;
                return Math.max(0, height);
            }
        }

        for (const c of this.colliders) {
            if (x >= c.min.x && x <= c.max.x && z >= c.min.z && z <= c.max.z) {
                if (c.max.y > 0.5) {
                    return c.max.y;
                }
            }
        }

        return 0;
    }

    isOnSlope(x, z) {
        for (const slope of this.slopes) {
            const halfW = slope.width / 2;
            const halfL = slope.length / 2;
            if (x >= slope.x - halfW && x <= slope.x + halfW &&
                z >= slope.z - halfL && z <= slope.z + halfL) {
                return slope;
            }
        }
        return null;
    }
}
