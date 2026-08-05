import { Renderer } from './renderer.js';
import { GameMap } from './map.js';
import { GameMapBridge } from './map-bridge.js';
import { Input } from './input.js';
import { Game } from './game.js';

class App {
    constructor() {
        this.renderer = null;
        this.map = null;
        this.input = null;
        this.game = null;
        this.running = false;
        this.selectedMap = 'dust';
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        const selectT = document.getElementById('select-t');
        const selectCT = document.getElementById('select-ct');
        selectT.addEventListener('click', () => this.startGame('T'));
        selectCT.addEventListener('click', () => this.startGame('CT'));

        document.querySelectorAll('.map-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.map-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                this.selectedMap = opt.dataset.map;
            });
        });
    }

    startGame(team) {
        document.getElementById('start-screen').style.display = 'none';
        this.renderer = new Renderer();

        if (this.selectedMap === 'bridge') {
            this.map = new GameMapBridge(this.renderer.scene);
        } else {
            this.map = new GameMap(this.renderer.scene);
        }

        this.input = new Input();
        this.game = new Game(team, this.renderer, this.map, this.input);
        this.game.start();
        this.running = true;
        this.gameLoop();
    }

    gameLoop() {
        if (!this.running) return;
        const delta = this.renderer.getDelta();
        this.game.update(delta);
        requestAnimationFrame(() => this.gameLoop());
    }
}

new App();
