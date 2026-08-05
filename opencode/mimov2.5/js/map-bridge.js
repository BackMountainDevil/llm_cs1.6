import * as THREE from 'three';
import { CONFIG } from './config.js';

export class GameMapBridge {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.slopes = [];
        this.stairs = [];
        this.bridges = [];
        this.build();
    }

    build() {
        this.createGround();
        this.createLowerLevel();
        this.createUpperPlatforms();
        this.createBridges();
        this.createStairs();
        this.createWalls();
        this.createCover();
        this.createBombSites();
        this.createSkybox();
        this.createDecorations();
    }

    createGround() {
        const geo = new THREE.PlaneGeometry(120, 80);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a,
            roughness: 0.85,
            metalness: 0.05
        });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridGeo = new THREE.PlaneGeometry(120, 80, 60, 40);
        const gridMat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9,
            wireframe: false
        });
        const grid = new THREE.Mesh(gridGeo, gridMat);
        grid.rotation.x = -Math.PI / 2;
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    createLowerLevel() {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.75
        });

        const pits = [
            { pos: [-15, -0.5, 0], size: [16, 1, 20] },
            { pos: [15, -0.5, 0], size: [16, 1, 20] }
        ];

        pits.forEach(p => {
            const geo = new THREE.BoxGeometry(...p.size);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...p.pos);
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });
    }

    createUpperPlatforms() {
        const platMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.65,
            metalness: 0.1
        });

        const platforms = [
            { pos: [-25, 4, 0], size: [18, 1.5, 14] },
            { pos: [25, 4, 0], size: [18, 1.5, 14] },
            { pos: [0, 4, -20], size: [14, 1.5, 10] },
            { pos: [0, 4, 20], size: [14, 1.5, 10] },
            { pos: [0, 3, 0], size: [10, 1, 10] }
        ];

        platforms.forEach(p => {
            const geo = new THREE.BoxGeometry(...p.size);
            const mesh = new THREE.Mesh(geo, platMat);
            mesh.position.set(...p.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push({
                min: {
                    x: p.pos[0] - p.size[0] / 2,
                    y: p.pos[1] - p.size[1] / 2,
                    z: p.pos[2] - p.size[2] / 2
                },
                max: {
                    x: p.pos[0] + p.size[0] / 2,
                    y: p.pos[1] + p.size[1] / 2,
                    z: p.pos[2] + p.size[2] / 2
                }
            });

            const edgeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
            const edges = [
                { pos: [p.pos[0], p.pos[1] + p.size[1] / 2 + 0.1, p.pos[2] - p.size[2] / 2], size: [p.size[0], 0.2, 0.2] },
                { pos: [p.pos[0], p.pos[1] + p.size[1] / 2 + 0.1, p.pos[2] + p.size[2] / 2], size: [p.size[0], 0.2, 0.2] },
                { pos: [p.pos[0] - p.size[0] / 2, p.pos[1] + p.size[1] / 2 + 0.1, p.pos[2]], size: [0.2, 0.2, p.size[2]] },
                { pos: [p.pos[0] + p.size[0] / 2, p.pos[1] + p.size[1] / 2 + 0.1, p.pos[2]], size: [0.2, 0.2, p.size[2]] }
            ];
            edges.forEach(e => {
                const eGeo = new THREE.BoxGeometry(...e.size);
                const eMesh = new THREE.Mesh(eGeo, edgeMat);
                eMesh.position.set(...e.pos);
                this.scene.add(eMesh);
            });
        });
    }

    createBridges() {
        const bridgeMat = new THREE.MeshStandardMaterial({
            color: 0x996633,
            roughness: 0.7,
            metalness: 0.15
        });

        const railMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.3
        });

        const bridges = [
            { from: [-25, 4, 0], to: [0, 3, 0], width: 3, rotY: Math.PI / 2 },
            { from: [25, 4, 0], to: [0, 3, 0], width: 3, rotY: -Math.PI / 2 },
            { from: [0, 4, -20], to: [0, 3, 0], width: 3, rotY: 0 },
            { from: [0, 4, 20], to: [0, 3, 0], width: 3, rotY: Math.PI }
        ];

        bridges.forEach(b => {
            const dx = b.to[0] - b.from[0];
            const dz = b.to[2] - b.from[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            const midX = (b.from[0] + b.to[0]) / 2;
            const midY = (b.from[1] + b.to[1]) / 2;
            const midZ = (b.from[2] + b.to[2]) / 2;

            const deckGeo = new THREE.BoxGeometry(b.width, 0.3, length);
            const deck = new THREE.Mesh(deckGeo, bridgeMat);
            deck.position.set(midX, midY, midZ);
            deck.rotation.y = b.rotY;
            deck.castShadow = true;
            deck.receiveShadow = true;
            this.scene.add(deck);

            this.bridges.push({
                x: midX, y: midY, z: midZ,
                width: b.width, length: length,
                rotY: b.rotY,
                fromY: b.from[1], toY: b.to[1]
            });

            const railHeight = 0.8;
            const rails = [
                { offX: -b.width / 2 + 0.1, offZ: 0 },
                { offX: b.width / 2 - 0.1, offZ: 0 }
            ];

            rails.forEach(r => {
                const railGeo = new THREE.BoxGeometry(0.1, railHeight, length);
                const rail = new THREE.Mesh(railGeo, railMat);
                const rOffX = r.offX * Math.cos(b.rotY);
                const rOffZ = r.offX * Math.sin(b.rotY);
                rail.position.set(midX + rOffX, midY + 0.15 + railHeight / 2, midZ + rOffZ);
                rail.rotation.y = b.rotY;
                rail.castShadow = true;
                this.scene.add(rail);
            });

            const supportMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6 });
            const supportPositions = [
                [midX - 1.5 * Math.cos(b.rotY), 0, midZ - 1.5 * Math.sin(b.rotY)],
                [midX + 1.5 * Math.cos(b.rotY), 0, midZ + 1.5 * Math.sin(b.rotY)]
            ];

            supportPositions.forEach(sp => {
                const sGeo = new THREE.CylinderGeometry(0.15, 0.15, midY, 8);
                const sMesh = new THREE.Mesh(sGeo, supportMat);
                sMesh.position.set(sp[0], midY / 2, sp[2]);
                sMesh.castShadow = true;
                this.scene.add(sMesh);
            });
        });
    }

    createStairs() {
        const stairMat = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.7,
            metalness: 0.05
        });

        const stairSets = [
            { base: [-17, 0, -6], steps: 8, dir: 'up-x', stepW: 3, stepH: 0.5, stepD: 0.8 },
            { base: [17, 0, 6], steps: 8, dir: 'down-x', stepW: 3, stepH: 0.5, stepD: 0.8 },
            { base: [-6, 0, -14], steps: 6, dir: 'up-z', stepW: 3, stepH: 0.5, stepD: 0.8 },
            { base: [6, 0, 14], steps: 6, dir: 'down-z', stepW: 3, stepH: 0.5, stepD: 0.8 },
            { base: [-17, 0, 6], steps: 8, dir: 'up-x', stepW: 3, stepH: 0.5, stepD: 0.8 },
            { base: [17, 0, -6], steps: 8, dir: 'down-x', stepW: 3, stepH: 0.5, stepD: 0.8 }
        ];

        stairSets.forEach(s => {
            for (let i = 0; i < s.steps; i++) {
                const geo = new THREE.BoxGeometry(s.stepW, s.stepH, s.stepD);
                const mesh = new THREE.Mesh(geo, stairMat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                let sx, sy, sz;
                sy = i * s.stepH + s.stepH / 2;

                switch (s.dir) {
                    case 'up-x':
                        sx = s.base[0] + i * s.stepD;
                        sz = s.base[2];
                        break;
                    case 'down-x':
                        sx = s.base[0] - i * s.stepD;
                        sz = s.base[2];
                        break;
                    case 'up-z':
                        sx = s.base[0];
                        sz = s.base[2] + i * s.stepD;
                        break;
                    case 'down-z':
                        sx = s.base[0];
                        sz = s.base[2] - i * s.stepD;
                        break;
                }

                mesh.position.set(sx, sy, sz);
                this.scene.add(mesh);

                this.stairs.push({
                    x: sx,
                    y: sy,
                    z: sz,
                    halfW: s.stepW / 2,
                    halfH: s.stepH / 2,
                    halfD: s.stepD / 2
                });
            }
        });
    }

    createWalls() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x6a5a4a,
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
            const mesh = new THREE.Mesh(geo, wallMat);
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

        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.6,
            metalness: 0.2
        });

        const pillars = [
            { pos: [-25, 2, -7], size: [1.5, 4, 1.5] },
            { pos: [-25, 2, 7], size: [1.5, 4, 1.5] },
            { pos: [25, 2, -7], size: [1.5, 4, 1.5] },
            { pos: [25, 2, 7], size: [1.5, 4, 1.5] },
            { pos: [-7, 2, -20], size: [1.5, 4, 1.5] },
            { pos: [7, 2, -20], size: [1.5, 4, 1.5] },
            { pos: [-7, 2, 20], size: [1.5, 4, 1.5] },
            { pos: [7, 2, 20], size: [1.5, 4, 1.5] }
        ];

        pillars.forEach(p => {
            const geo = new THREE.BoxGeometry(...p.size);
            const mesh = new THREE.Mesh(geo, pillarMat);
            mesh.position.set(...p.pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            this.colliders.push({
                min: {
                    x: p.pos[0] - p.size[0] / 2,
                    y: p.pos[1] - p.size[1] / 2,
                    z: p.pos[2] - p.size[2] / 2
                },
                max: {
                    x: p.pos[0] + p.size[0] / 2,
                    y: p.pos[1] + p.size[1] / 2,
                    z: p.pos[2] + p.size[2] / 2
                }
            });
        });
    }

    createCover() {
        const crateMat = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b,
            roughness: 0.85
        });

        const metalCrateMat = new THREE.MeshStandardMaterial({
            color: 0x556677,
            roughness: 0.5,
            metalness: 0.3
        });

        const crates = [
            { pos: [-25, 5, -4], size: [2, 2, 2], mat: crateMat },
            { pos: [-25, 5, 4], size: [2, 2, 2], mat: metalCrateMat },
            { pos: [25, 5, -4], size: [2, 2, 2], mat: crateMat },
            { pos: [25, 5, 4], size: [2, 2, 2], mat: metalCrateMat },
            { pos: [0, 3.5, -20], size: [2, 2, 2], mat: crateMat },
            { pos: [0, 3.5, 20], size: [2, 2, 2], mat: metalCrateMat },
            { pos: [0, 3.5, 3], size: [2, 2, 2], mat: crateMat },
            { pos: [0, 3.5, -3], size: [2, 2, 2], mat: metalCrateMat },
            { pos: [-35, 0.9, 5], size: [2, 1.8, 2], mat: crateMat },
            { pos: [35, 0.9, -5], size: [2, 1.8, 2], mat: metalCrateMat },
            { pos: [-35, 0.9, -5], size: [2, 1.8, 2], mat: crateMat },
            { pos: [35, 0.9, 5], size: [2, 1.8, 2], mat: metalCrateMat },
            { pos: [-10, 0.9, 0], size: [3, 1.8, 2], mat: crateMat },
            { pos: [10, 0.9, 0], size: [3, 1.8, 2], mat: metalCrateMat },
            { pos: [0, 0.9, -10], size: [2, 1.8, 3], mat: crateMat },
            { pos: [0, 0.9, 10], size: [2, 1.8, 3], mat: metalCrateMat }
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
        const siteMat = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            roughness: 0.5,
            transparent: true,
            opacity: 0.4,
            emissive: 0xff0000,
            emissiveIntensity: 0.25
        });

        const siteGeo = new THREE.CylinderGeometry(3, 3, 0.15, 32);

        const siteA = new THREE.Mesh(siteGeo, siteMat);
        siteA.position.set(CONFIG.bombSites.A.x, 4.85, CONFIG.bombSites.A.z);
        this.scene.add(siteA);

        const siteB = new THREE.Mesh(siteGeo, siteMat.clone());
        siteB.position.set(CONFIG.bombSites.B.x, 4.85, CONFIG.bombSites.B.z);
        this.scene.add(siteB);

        const pillarMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.3 });
        const pillarGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);

        const pA = new THREE.Mesh(pillarGeo, pillarMat);
        pA.position.set(CONFIG.bombSites.A.x, 5.8, CONFIG.bombSites.A.z);
        this.scene.add(pA);

        const pB = new THREE.Mesh(pillarGeo, pillarMat);
        pB.position.set(CONFIG.bombSites.B.x, 5.8, CONFIG.bombSites.B.z);
        this.scene.add(pB);
    }

    createSkybox() {
        const skyGeo = new THREE.SphereGeometry(200, 32, 15);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x667788,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        for (let i = 0; i < 12; i++) {
            const buildingGeo = new THREE.BoxGeometry(
                4 + Math.random() * 6,
                8 + Math.random() * 12,
                4 + Math.random() * 6
            );
            const buildingMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0, 0, 0.2 + Math.random() * 0.15),
                roughness: 0.8
            });
            const building = new THREE.Mesh(buildingGeo, buildingMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 15;
            building.position.set(
                Math.cos(angle) * dist,
                buildingGeo.parameters.height / 2,
                Math.sin(angle) * dist
            );
            building.castShadow = true;
            this.scene.add(building);
        }
    }

    createDecorations() {
        const pipeMat = new THREE.MeshStandardMaterial({
            color: 0x667788,
            roughness: 0.4,
            metalness: 0.5
        });

        const pipes = [
            { from: [-25, 5.5, -7], to: [25, 5.5, -7], radius: 0.15 },
            { from: [-25, 5.5, 7], to: [25, 5.5, 7], radius: 0.15 }
        ];

        pipes.forEach(p => {
            const dx = p.to[0] - p.from[0];
            const dy = p.to[1] - p.from[1];
            const dz = p.to[2] - p.from[2];
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

            const geo = new THREE.CylinderGeometry(p.radius, p.radius, length, 8);
            const mesh = new THREE.Mesh(geo, pipeMat);
            mesh.position.set(
                (p.from[0] + p.to[0]) / 2,
                (p.from[1] + p.to[1]) / 2,
                (p.from[2] + p.to[2]) / 2
            );
            mesh.rotation.z = Math.PI / 2;
            this.scene.add(mesh);
        });

        const lightMat = new THREE.MeshStandardMaterial({
            color: 0xffff88,
            emissive: 0xffff44,
            emissiveIntensity: 0.5
        });
        const lightGeo = new THREE.SphereGeometry(0.3, 8, 8);

        const lightPositions = [
            [-25, 5.8, 0],
            [25, 5.8, 0],
            [0, 5.8, -20],
            [0, 5.8, 20],
            [0, 3.8, 0]
        ];

        lightPositions.forEach(lp => {
            const mesh = new THREE.Mesh(lightGeo, lightMat);
            mesh.position.set(...lp);
            this.scene.add(mesh);

            const pointLight = new THREE.PointLight(0xffff88, 0.5, 15);
            pointLight.position.set(...lp);
            this.scene.add(pointLight);
        });
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

        for (const s of this.stairs) {
            const stairBox = {
                min: {
                    x: s.x - s.halfW,
                    y: s.y - s.halfH,
                    z: s.z - s.halfD
                },
                max: {
                    x: s.x + s.halfW,
                    y: s.y + s.halfH,
                    z: s.z + s.halfD
                }
            };

            if (
                box.min.x < stairBox.max.x && box.max.x > stairBox.min.x &&
                box.min.y < stairBox.max.y && box.max.y > stairBox.min.y &&
                box.min.z < stairBox.max.z && box.max.z > stairBox.min.z
            ) {
                return true;
            }
        }

        return false;
    }

    getGroundHeight(x, z) {
        for (const s of this.stairs) {
            const halfW = s.halfW;
            const halfD = s.halfD;
            if (x >= s.x - halfW && x <= s.x + halfW &&
                z >= s.z - halfD && z <= s.z + halfD) {
                return s.y + s.halfH;
            }
        }

        for (const b of this.bridges) {
            const halfW = b.width / 2;
            const halfL = b.length / 2;

            let localX, localZ;
            if (Math.abs(b.rotY) < 0.1 || Math.abs(b.rotY - Math.PI) < 0.1) {
                localX = x - b.x;
                localZ = z - b.z;
            } else {
                localX = z - b.z;
                localZ = x - b.x;
            }

            if (Math.abs(localX) < halfW && Math.abs(localZ) < halfL) {
                const t = (localZ + halfL) / b.length;
                return b.fromY + (b.toY - b.fromY) * t + 0.15;
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
        return null;
    }
}
