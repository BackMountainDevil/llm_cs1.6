import * as THREE from 'three';
import { CONFIG } from './config.js';

export class AIController {
    constructor(player, enemies, map) {
        this.player = player;
        this.enemies = enemies;
        this.map = map;

        this.state = 'patrol';
        this.target = null;
        this.targetPos = null;
        this.patrolTarget = null;
        this.lastStateChange = 0;
        this.stateCooldown = 2000;

        this.reactionTime = 600 + Math.random() * 800;
        this.lastSeenEnemy = 0;
        this.accuracy = 0.3 + Math.random() * 0.25;
        this.shootCooldown = 0;

        this.generatePatrolTarget();
    }

    generatePatrolTarget() {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 60;
        this.patrolTarget = new THREE.Vector3(x, 0, z);
    }

    update(delta, currentTime) {
        if (!this.player.isAlive) return;

        this.lookForEnemies();

        switch (this.state) {
            case 'patrol':
                this.doPatrol(delta);
                break;
            case 'chase':
                this.doChase(delta);
                break;
            case 'combat':
                this.doCombat(delta, currentTime);
                break;
            case 'retreat':
                this.doRetreat(delta);
                break;
        }

        this.player.velocity.x = this.moveDir ? this.moveDir.x : 0;
        this.player.velocity.z = this.moveDir ? this.moveDir.z : 0;

        this.player.update(delta);
    }

    lookForEnemies() {
        this.target = null;
        const myPos = this.player.getCameraPosition();
        const myForward = this.player.getForwardVector();

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const toEnemy = enemy.position.clone().sub(myPos);
            const dist = toEnemy.length();

            if (dist > 60) continue;

            const dirToEnemy = toEnemy.normalize();
            const dot = myForward.dot(dirToEnemy);

            if (dot > 0.7 || dist < 8) {
                this.target = enemy;
                this.lastSeenEnemy = performance.now();
                break;
            }
        }
    }

    doPatrol(delta) {
        if (this.target) {
            if (performance.now() - this.lastSeenEnemy > this.reactionTime) {
                this.state = 'combat';
            }
            return;
        }

        if (!this.patrolTarget) {
            this.generatePatrolTarget();
        }

        const toTarget = this.patrolTarget.clone().sub(this.player.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 3) {
            this.generatePatrolTarget();
            return;
        }

        toTarget.normalize();
        this.moveDir = new THREE.Vector3(
            toTarget.x * CONFIG.moveSpeed * 0.5,
            0,
            toTarget.z * CONFIG.moveSpeed * 0.5
        );

        const angle = Math.atan2(toTarget.x, toTarget.z);
        this.player.yaw = this.lerpAngle(this.player.yaw, -angle, delta * 3);
    }

    doChase(delta) {
        if (!this.target || !this.target.isAlive) {
            this.state = 'patrol';
            this.generatePatrolTarget();
            return;
        }

        const toEnemy = this.target.position.clone().sub(this.player.position);
        toEnemy.y = 0;
        const dist = toEnemy.length();

        if (dist > 40) {
            this.state = 'patrol';
            return;
        }

        if (dist < 15) {
            this.state = 'combat';
            return;
        }

        toEnemy.normalize();
        this.moveDir = new THREE.Vector3(
            toEnemy.x * CONFIG.moveSpeed * 0.7,
            0,
            toEnemy.z * CONFIG.moveSpeed * 0.7
        );

        const angle = Math.atan2(toEnemy.x, toEnemy.z);
        this.player.yaw = this.lerpAngle(this.player.yaw, -angle, delta * 4);
    }

    doCombat(delta, currentTime) {
        if (!this.target || !this.target.isAlive) {
            this.state = 'patrol';
            this.generatePatrolTarget();
            return;
        }

        const toEnemy = this.target.position.clone().sub(this.player.position);
        toEnemy.y = 0;
        const dist = toEnemy.length();

        if (dist > 50) {
            this.state = 'patrol';
            return;
        }

        const angle = Math.atan2(toEnemy.x, toEnemy.z);
        this.player.yaw = this.lerpAngle(this.player.yaw, -angle, delta * 6);

        const enemyHead = this.target.position.clone();
        enemyHead.y += CONFIG.headHeight;
        const toHead = enemyHead.clone().sub(this.player.getCameraPosition());
        const targetPitch = -Math.asin(toHead.y / toHead.length());
        this.player.pitch = this.lerpAngle(this.player.pitch, targetPitch, delta * 5);

        if (dist > 20) {
            toEnemy.normalize();
            this.moveDir = new THREE.Vector3(
                toEnemy.x * CONFIG.moveSpeed * 0.3,
                0,
                toEnemy.z * CONFIG.moveSpeed * 0.3
            );
        } else {
            const strafe = new THREE.Vector3(-toEnemy.z, 0, toEnemy.x).normalize();
            const strafeDir = Math.sin(performance.now() * 0.002) > 0 ? 1 : -1;
            this.moveDir = new THREE.Vector3(
                strafe.x * CONFIG.moveSpeed * 0.3 * strafeDir,
                0,
                strafe.z * CONFIG.moveSpeed * 0.3 * strafeDir
            );
        }

        this.shootCooldown -= delta * 1000;
        if (this.shootCooldown <= 0) {
            if (Math.random() < this.accuracy) {
                this.player.tryShoot(this.enemies, currentTime);
            }
            this.shootCooldown = 150 + Math.random() * 250;
        }
    }

    doRetreat(delta) {
        if (!this.target) {
            this.state = 'patrol';
            return;
        }

        const awayDir = this.player.position.clone().sub(this.target.position);
        awayDir.y = 0;
        awayDir.normalize();

        this.moveDir = new THREE.Vector3(
            awayDir.x * CONFIG.moveSpeed * 0.8,
            0,
            awayDir.z * CONFIG.moveSpeed * 0.8
        );

        const angle = Math.atan2(awayDir.x, awayDir.z);
        this.player.yaw = this.lerpAngle(this.player.yaw, -angle, delta * 4);

        if (this.player.health > 50 || !this.target.isAlive) {
            this.state = 'patrol';
        }
    }

    lerpAngle(current, target, t) {
        let diff = target - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return current + diff * Math.min(t, 1);
    }
}
