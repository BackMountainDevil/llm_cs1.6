import { WEAPONS } from './config.js';

export class WeaponSystem {
    constructor() {
        this.lastFireTime = 0;
    }

    canFire(weaponId, currentTime) {
        const weapon = WEAPONS[weaponId];
        if (!weapon) return false;
        return (currentTime - this.lastFireTime) >= weapon.fireRate;
    }

    fire(weaponId, ammo) {
        const weapon = WEAPONS[weaponId];
        if (!weapon) return null;

        if (ammo.current <= 0) return null;

        this.lastFireTime = performance.now();

        const spreadX = (Math.random() - 0.5) * weapon.spread;
        const spreadY = (Math.random() - 0.5) * weapon.spread;

        return {
            damage: weapon.damage + Math.floor(Math.random() * 5 - 2),
            spreadX,
            spreadY,
            range: weapon.range,
            recoil: weapon.recoil
        };
    }

    getRecoil(weaponId) {
        const weapon = WEAPONS[weaponId];
        if (!weapon) return 0;
        return weapon.recoil + Math.random() * weapon.recoil * 0.5;
    }
}
