export const CONFIG = {
    rounds: 10,
    roundTime: 120,
    prepTime: 15,
    bombTimer: 40,
    defuseTime: 10,
    maxHealth: 100,
    maxArmor: 100,
    moveSpeed: 12,
    jumpForce: 8,
    gravity: 22,
    teamSize: 5,
    spawnRadius: 3,
    viewHeight: 1.7,
    playerWidth: 0.6,
    playerHeight: 1.8,
    headHeight: 1.6,
    headRadius: 0.25,

    spawnPositions: {
        T: [
            { x: -35, y: 0.9, z: 0 },
            { x: -37, y: 0.9, z: 3 },
            { x: -33, y: 0.9, z: -3 },
            { x: -35, y: 0.9, z: 6 },
            { x: -37, y: 0.9, z: -6 }
        ],
        CT: [
            { x: 35, y: 0.9, z: 0 },
            { x: 37, y: 0.9, z: 3 },
            { x: 33, y: 0.9, z: -3 },
            { x: 35, y: 0.9, z: 6 },
            { x: 37, y: 0.9, z: -6 }
        ]
    },

    bombSites: {
        A: { x: 20, y: 0.5, z: 0 },
        B: { x: -20, y: 0.5, z: 0 }
    }
};

export const WEAPONS = {
    glock: {
        name: 'Glock',
        damage: 22,
        fireRate: 300,
        spread: 0.03,
        ammo: 20,
        maxAmmo: 60,
        price: 200,
        recoil: 0.015,
        range: 80
    },
    usp: {
        name: 'USP',
        damage: 28,
        fireRate: 280,
        spread: 0.025,
        ammo: 12,
        maxAmmo: 24,
        price: 200,
        recoil: 0.012,
        range: 90
    },
    ak47: {
        name: 'AK-47',
        damage: 36,
        fireRate: 100,
        spread: 0.04,
        ammo: 30,
        maxAmmo: 90,
        price: 2700,
        recoil: 0.035,
        range: 100
    },
    m4a1: {
        name: 'M4A1',
        damage: 32,
        fireRate: 90,
        spread: 0.03,
        ammo: 30,
        maxAmmo: 90,
        price: 3100,
        recoil: 0.025,
        range: 100
    }
};
