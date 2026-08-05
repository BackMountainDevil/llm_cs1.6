export class Input {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseDX = 0;
        this.mouseDY = 0;
        this.isPointerLocked = false;
        this.buyMenuOpen = false;
        this.justPressedKeys = {};

        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onKeyDown(e) {
        if (!this.keys[e.code]) {
            this.justPressedKeys[e.code] = true;
        }
        this.keys[e.code] = true;
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseMove(e) {
        if (this.isPointerLocked) {
            this.mouseDX += e.movementX || 0;
            this.mouseDY += e.movementY || 0;
        }
    }

    onMouseDown(e) {
        this.mouseButtons[e.button] = true;
    }

    onMouseUp(e) {
        this.mouseButtons[e.button] = false;
    }

    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement !== null;
    }

    requestPointerLock(element) {
        element.requestPointerLock();
    }

    isKeyDown(code) {
        return this.keys[code] === true;
    }

    isMouseButtonDown(button) {
        return this.mouseButtons[button] === true;
    }

    wasJustPressed(code) {
        if (this.justPressedKeys[code]) {
            this.justPressedKeys[code] = false;
            return true;
        }
        return false;
    }

    getMouseDelta() {
        const dx = this.mouseDX;
        const dy = this.mouseDY;
        this.mouseDX = 0;
        this.mouseDY = 0;
        return { dx, dy };
    }

    clearJustPressed() {
        this.justPressedKeys = {};
    }
}
