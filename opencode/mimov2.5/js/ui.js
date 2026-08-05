import { CONFIG, WEAPONS } from './config.js';

export class UI {
    constructor() {
        this.healthBar = document.getElementById('health-bar-inner');
        this.healthText = document.getElementById('health-text');
        this.armorBar = document.getElementById('armor-bar-inner');
        this.armorText = document.getElementById('armor-text');
        this.ammoCurrent = document.getElementById('ammo-current');
        this.ammoReserve = document.getElementById('ammo-reserve');
        this.weaponName = document.getElementById('weapon-name');
        this.moneyDisplay = document.getElementById('money-display');
        this.roundInfo = document.getElementById('round-info');
        this.teamScoreT = document.getElementById('team-score-t');
        this.teamScoreCT = document.getElementById('team-score-ct');
        this.buyMenu = document.getElementById('buy-menu');
        this.killFeed = document.getElementById('kill-feed');
        this.deathScreen = document.getElementById('death-screen');
        this.roundEndScreen = document.getElementById('round-end-screen');
        this.roundEndText = document.getElementById('round-end-text');
        this.roundEndScore = document.getElementById('round-end-score');

        this.buyMenuOpen = false;
    }

    updatePlayer(player) {
        if (!player || !player.isHuman) return;

        const healthPct = (player.health / CONFIG.maxHealth) * 100;
        this.healthBar.style.width = healthPct + '%';
        this.healthText.textContent = Math.ceil(player.health);

        if (healthPct > 60) {
            this.healthBar.style.background = '#00cc00';
        } else if (healthPct > 30) {
            this.healthBar.style.background = '#cccc00';
        } else {
            this.healthBar.style.background = '#cc0000';
        }

        const armorPct = (player.armor / CONFIG.maxArmor) * 100;
        this.armorBar.style.width = armorPct + '%';
        this.armorText.textContent = Math.ceil(player.armor);

        const ammo = player.ammo[player.currentWeapon];
        this.ammoCurrent.textContent = ammo.current;
        this.ammoReserve.textContent = ammo.reserve;
        this.weaponName.textContent = WEAPONS[player.currentWeapon].name;
        this.moneyDisplay.textContent = '$' + player.money;
    }

    updateRoundInfo(round, timeLeft, tScore, ctScore) {
        const mins = Math.floor(timeLeft / 60);
        const secs = Math.floor(timeLeft % 60);
        this.roundInfo.textContent = `Round ${round} | ${mins}:${secs.toString().padStart(2, '0')}`;
        this.teamScoreT.textContent = `T: ${tScore}`;
        this.teamScoreCT.textContent = `CT: ${ctScore}`;
    }

    toggleBuyMenu(player) {
        if (!player || !player.isHuman) return false;

        this.buyMenuOpen = !this.buyMenuOpen;
        this.buyMenu.classList.toggle('hidden', !this.buyMenuOpen);

        if (this.buyMenuOpen) {
            this.updateBuyMenuItems(player);
        }

        return this.buyMenuOpen;
    }

    closeBuyMenu() {
        this.buyMenuOpen = false;
        this.buyMenu.classList.add('hidden');
    }

    updateBuyMenuItems(player) {
        const items = this.buyMenu.querySelectorAll('.buy-item');
        items.forEach(item => {
            const itemWeapon = item.dataset.item;
            let price = 0;
            if (itemWeapon === 'armor') {
                price = 650;
            } else if (WEAPONS[itemWeapon]) {
                price = WEAPONS[itemWeapon].price;
            }
            item.classList.toggle('cant-afford', player.money < price);
        });
    }

    showDeathScreen() {
        this.deathScreen.classList.remove('hidden');
    }

    hideDeathScreen() {
        this.deathScreen.classList.add('hidden');
    }

    showRoundEnd(text, tScore, ctScore) {
        this.roundEndText.textContent = text;
        this.roundEndScore.textContent = `T: ${tScore} | CT: ${ctScore}`;
        this.roundEndScreen.classList.remove('hidden');
    }

    hideRoundEnd() {
        this.roundEndScreen.classList.add('hidden');
    }

    addKill(killer, victim, killerTeam, victimTeam) {
        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        const killerClass = killerTeam === 'T' ? 'killer-t' : 'killer-ct';
        const victimClass = victimTeam === 'T' ? 'victim-t' : 'victim-ct';
        entry.innerHTML = `<span class="${killerClass}">${killer}</span> [weapon] <span class="${victimClass}">${victim}</span>`;
        this.killFeed.appendChild(entry);

        setTimeout(() => {
            if (entry.parentNode) entry.parentNode.removeChild(entry);
        }, 4000);
    }
}
