import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Bomb {
    constructor(scene) {
        this.scene = scene;
        this.planted = false;
        this.plantedBy = null;
        this.plantedSite = null;
        this.timer = CONFIG.bombTimer;
        this.exploded = false;
        this.defused = false;
        this.defuseProgress = 0;
        this.mesh = null;
        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(0.5, 0.3, 0.3);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        wire.position.y = 0.2;
        wire.rotation.z = Math.PI / 2;
        group.add(wire);

        const lightGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const lightMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(0.2, 0.2, 0);
        group.add(light);
        this.lightMesh = light;

        group.visible = false;
        this.scene.add(group);
        this.mesh = group;
    }

    plant(site, player) {
        this.planted = true;
        this.plantedBy = player;
        this.plantedSite = site;
        this.timer = CONFIG.bombTimer;
        this.exploded = false;
        this.defused = false;
        this.defuseProgress = 0;

        const sitePos = CONFIG.bombSites[site];
        this.mesh.position.set(sitePos.x, sitePos.y + 0.3, sitePos.z);
        this.mesh.visible = true;
    }

    defuse() {
        if (!this.planted || this.exploded) return false;
        this.defused = true;
        this.mesh.visible = false;
        this.planted = false;
        return true;
    }

    update(delta) {
        if (!this.planted || this.exploded || this.defused) return false;

        this.timer -= delta;

        if (this.lightMesh) {
            const blink = Math.sin(performance.now() * 0.01) > 0;
            this.lightMesh.visible = blink;
        }

        if (this.timer <= 0) {
            this.exploded = true;
            this.mesh.visible = false;
            this.planted = false;
            return true;
        }
        return false;
    }

    reset() {
        this.planted = false;
        this.plantedBy = null;
        this.plantedSite = null;
        this.timer = CONFIG.bombTimer;
        this.exploded = false;
        this.defused = false;
        this.defuseProgress = 0;
        this.mesh.visible = false;
    }
}
