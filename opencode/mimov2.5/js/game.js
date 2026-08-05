import * as THREE from 'three';
import { CONFIG, WEAPONS } from './config.js';
import { Player } from './player.js';
import { AIController } from './ai.js';
import { Bomb } from './bomb.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';

const STATES = {
    WAITING: 'waiting',
    PREP: 'prep',
    COMBAT: 'combat',
    ROUND_END: 'round_end',
    MATCH_END: 'match_end'
};

export class Game {
    constructor(team, renderer, map, input) {
        this.renderer = renderer;
        this.map = map;
        this.input = input;
        this.humanTeam = team;

        this.state = STATES.WAITING;
        this.round = 1;
        this.tScore = 0;
        this.ctScore = 0;
        this.roundTimer = 0;
        this.stateTimer = 0;

        this.players = [];
        this.humanPlayer = null;
        this.aiControllers = [];
        this.bomb = new Bomb(renderer.scene);

        this.ui = new UI();
        this.audio = new Audio();

        this.lastShotTime = 0;

        this.setupPlayers();
        this.setupInput();
    }

    setupPlayers() {
        for (let i = 0; i < CONFIG.teamSize; i++) {
            const isHuman = (i === 0);
            const tPlayer = new Player('T', i, isHuman && this.humanTeam === 'T' ? this.input : null, this.map, this.audio, isHuman && this.humanTeam === 'T');
            const ctPlayer = new Player('CT', i, isHuman && this.humanTeam === 'CT' ? this.input : null, this.map, this.audio, isHuman && this.humanTeam === 'CT');

            this.players.push(tPlayer);
            this.players.push(ctPlayer);

            this.renderer.scene.add(tPlayer.mesh);
            this.renderer.scene.add(ctPlayer.mesh);

            if (tPlayer.isHuman) {
                this.humanPlayer = tPlayer;
            }
            if (ctPlayer.isHuman) {
                this.humanPlayer = ctPlayer;
            }
        }

        const enemies = this.players.filter(p => p.team !== this.humanTeam);
        const teammates = this.players.filter(p => p.team === this.humanTeam);

        this.players.forEach(p => {
            if (!p.isHuman) {
                const foes = p.team === 'T' ? teammates : enemies;
                const ai = new AIController(p, foes, this.map);
                this.aiControllers.push(ai);
            }
        });
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyB' && this.humanPlayer && this.humanPlayer.isAlive) {
                this.ui.toggleBuyMenu(this.humanPlayer);
            }
            if (e.code === 'KeyR' && this.humanPlayer && this.humanPlayer.isAlive) {
                this.humanPlayer.reload();
            }
        });

        document.getElementById('buy-menu').addEventListener('click', (e) => {
            const item = e.target.closest('.buy-item');
            if (!item || !this.humanPlayer) return;

            const itemId = item.dataset.item;
            if (this.humanPlayer.buy(itemId)) {
                this.audio.init();
                this.audio.play('buy');
                this.ui.updateBuyMenuItems(this.humanPlayer);
            }
        });

        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('click', () => {
            if (this.input && !this.input.isPointerLocked) {
                this.input.requestPointerLock(canvas);
            }
        });
    }

    start() {
        this.audio.init();
        this.state = STATES.PREP;
        this.stateTimer = CONFIG.prepTime;
        this.startRound();
    }

    startRound() {
        this.tScore = 0;
        this.ctScore = 0;
        this.round = 1;
        this.bomb.reset();
        this.startNewRound();
    }

    startNewRound() {
        this.state = STATES.PREP;
        this.stateTimer = CONFIG.prepTime;

        this.players.forEach((p, i) => {
            const spawnIndex = Math.floor(i / 2);
            p.respawn(spawnIndex);
            if (!p.isHuman) {
                p.currentWeapon = p.team === 'T' ? 'glock' : 'usp';
                p.resetAmmo(p.currentWeapon);
            }
        });

        this.bomb.reset();
        this.ui.hideDeathScreen();
        this.ui.hideRoundEnd();
    }

    update(delta) {
        const time = performance.now();

        switch (this.state) {
            case STATES.PREP:
                this.updatePrep(delta);
                break;
            case STATES.COMBAT:
                this.updateCombat(delta, time);
                break;
            case STATES.ROUND_END:
                this.stateTimer -= delta;
                if (this.stateTimer <= 0) {
                    if (this.round >= CONFIG.rounds || this.tScore >= 6 || this.ctScore >= 6) {
                        this.state = STATES.MATCH_END;
                        const winner = this.tScore >= 6 ? 'TERRORISTS' : 'COUNTER-TERRORISTS';
                        this.ui.showRoundEnd(`MATCH OVER - ${winner} WIN!`, this.tScore, this.ctScore);
                    } else {
                        this.startNewRound();
                    }
                }
                break;
        }

        this.players.forEach(p => {
            if (p.isHuman) {
                this.updateHumanPlayer(p, delta, time);
            }
        });

        this.aiControllers.forEach(ai => {
            const enemies = this.players.filter(p => p.team !== ai.player.team);
            ai.enemies = enemies;
            ai.update(delta, time);
        });

        this.players.forEach(p => {
            if (!p.isHuman && p.isAlive) {
                p.update(delta);
            }
        });

        this.updateCamera();
        this.ui.updatePlayer(this.humanPlayer);
        this.ui.updateRoundInfo(this.round, this.stateTimer, this.tScore, this.ctScore);

        this.renderer.render();
    }

    updatePrep(delta) {
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
            this.state = STATES.COMBAT;
            this.stateTimer = CONFIG.roundTime;
        }
    }

    updateCombat(delta, time) {
        this.stateTimer -= delta;

        if (this.stateTimer <= 0) {
            this.endRound('CT');
            return;
        }

        const exploded = this.bomb.update(delta);
        if (exploded) {
            this.endRound('T');
            return;
        }

        this.checkRoundEnd();
    }

    updateHumanPlayer(player, delta, time) {
        if (!player.isAlive) {
            if (this.ui.deathScreen.classList.contains('hidden')) {
                this.ui.showDeathScreen();
            }
            return;
        }

        player.update(delta);

        if (this.input.isMouseButtonDown(0) && this.input.isPointerLocked && !this.ui.buyMenuOpen) {
            const enemies = this.players.filter(p => p.team !== player.team && p.isAlive);
            const hits = player.tryShoot(enemies, time);
            if (hits.length > 0) {
                const hit = hits[0];
                hit.target.takeDamage(hit.damage, player);
                this.audio.play('hit');
                this.ui.addKill(
                    player.team === 'T' ? 'T Player' : 'CT Player',
                    hit.target.team === 'T' ? 'T Bot' : 'CT Bot',
                    player.team,
                    hit.target.team
                );
                if (!hit.target.isAlive) {
                    this.audio.play('death');
                    this.checkBombDrop(hit.target);
                }
            }
            this.audio.play('shoot');
        }

        if (this.input.isMouseButtonDown(2) && this.input.isPointerLocked) {
            this.tryPlantBomb(player);
            this.tryDefuseBomb(player);
        }
    }

    tryPlantBomb(player) {
        if (player.team !== 'T' || this.bomb.planted) return;
        if (!player.isAlive) return;

        for (const [site, pos] of Object.entries(CONFIG.bombSites)) {
            const dist = player.position.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z));
            if (dist < 4) {
                this.bomb.plant(site, player);
                this.audio.play('bombplant');
                return;
            }
        }
    }

    tryDefuseBomb(player) {
        if (player.team !== 'CT' || !this.bomb.planted) return;
        if (!player.isAlive) return;

        const bombPos = this.bomb.mesh.position;
        const dist = player.position.distanceTo(bombPos);
        if (dist < 3) {
            if (this.bomb.defuse()) {
                this.audio.play('defuse');
                this.endRound('CT');
            }
        }
    }

    checkBombDrop(player) {
        // placeholder for bomb drop mechanics
    }

    checkRoundEnd() {
        const tAlive = this.players.filter(p => p.team === 'T' && p.isAlive).length;
        const ctAlive = this.players.filter(p => p.team === 'CT' && p.isAlive).length;

        if (tAlive === 0) {
            this.endRound('CT');
        } else if (ctAlive === 0) {
            this.endRound('T');
        }
    }

    endRound(winner) {
        if (this.state === STATES.ROUND_END) return;

        this.state = STATES.ROUND_END;
        this.stateTimer = 4;

        if (winner === 'T') {
            this.tScore++;
        } else {
            this.ctScore++;
        }

        const winnerName = winner === 'T' ? 'TERRORISTS' : 'COUNTER-TERRORISTS';
        this.ui.showRoundEnd(`${winnerName} WIN THE ROUND`, this.tScore, this.ctScore);
        this.round++;

        this.players.forEach(p => {
            p.money += 1400;
        });
    }

    updateCamera() {
        if (!this.humanPlayer || !this.humanPlayer.isHuman) return;
        if (!this.humanPlayer.isAlive) return;

        const camPos = this.humanPlayer.getCameraPosition();
        this.renderer.camera.position.copy(camPos);

        const forward = this.humanPlayer.getForwardVector();
        const lookAt = camPos.clone().add(forward);
        this.renderer.camera.lookAt(lookAt);
        this.renderer.camera.rotation.z = 0;
    }
}
