const state = {
    coins: parseInt(localStorage.getItem('apex_m_coins') || '400'),
    upgrades: JSON.parse(localStorage.getItem('apex_m_upgrades') || '{"dmg":0,"hp":0,"spd":0,"cdr":0}'),
    unlockedHeroes: JSON.parse(localStorage.getItem('apex_m_unlocked') || '["guardian","sprinter","pyro","engineer","vampire"]'),
    selectedHeroIndex: 0,
    selectedMapIndex: 0,
    inGame: false,
    kills: 0
};

function saveState() {
    localStorage.setItem('apex_m_coins', state.coins);
    localStorage.setItem('apex_m_upgrades', JSON.stringify(state.upgrades));
    localStorage.setItem('apex_m_unlocked', JSON.stringify(state.unlockedHeroes));
    document.getElementById('global-coins-display').innerText = state.coins;
}

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const WORLD_SIZE = 2000;
let camera = { x: 0, y: 0 };
let currentMap = MAPS[0];
let mapObstacles = { trees: [], rocks: [] };
let ambientParticles = [];

let joystickInput = { x: 0, y: 0, active: false };
let isAttacking = false;

let player = null;
let bots = [];
let bullets = [];
let particles = [];
let coins = [];
let floatingTexts = [];

function initMenu() {
    saveState();
    renderHeroPreview();
    renderMapGrid();
    updateShopUI();
    setupTouchControls();
}

function renderHeroPreview() {
    const hero = HEROES[state.selectedHeroIndex];
    document.getElementById('hero-name').innerText = hero.name;
    document.getElementById('hero-role').innerText = hero.role;

    const isUnlocked = state.unlockedHeroes.includes(hero.id);
    const lockBox = document.getElementById('hero-lock-status');
    const mainBtn = document.getElementById('main-action-btn');

    if (isUnlocked) {
        lockBox.innerHTML = '';
        mainBtn.innerText = 'В БОЙ';
        mainBtn.className = 'apple-btn start-btn';
    } else {
        lockBox.innerHTML = `<div class="lock-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg> Заблокировано</div>`;
        mainBtn.innerText = `Купить за ${hero.price} Монет`;
        mainBtn.className = 'apple-btn start-btn buy-btn';
    }

    const box = document.getElementById('hero-preview');
    box.innerHTML = `
        <svg viewBox="0 0 100 100" width="90" height="90">
            <circle cx="50" cy="50" r="38" fill="${hero.color}" stroke="#FFF" stroke-width="4"/>
            <circle cx="50" cy="50" r="28" fill="rgba(255,255,255,0.2)"/>
            <rect x="50" y="44" width="35" height="12" rx="4" fill="${hero.weaponColor}"/>
        </svg>
    `;

    const abContainer = document.getElementById('hero-abilities');
    abContainer.innerHTML = '';
    hero.abilities.forEach(a => {
        const item = document.createElement('div');
        item.className = 'ability-item';
        item.innerHTML = `<span><b>${a.name}</b></span> <span>КД: ${a.cd}с</span>`;
        abContainer.appendChild(item);
    });
}

function handleMainAction() {
    const hero = HEROES[state.selectedHeroIndex];
    const isUnlocked = state.unlockedHeroes.includes(hero.id);

    if (isUnlocked) {
        startGame();
    } else {
        if (state.coins >= hero.price) {
            state.coins -= hero.price;
            state.unlockedHeroes.push(hero.id);
            saveState();
            renderHeroPreview();
        } else {
            alert('Недостаточно монет!');
        }
    }
}

function renderMapGrid() {
    const grid = document.getElementById('map-grid-container');
    grid.innerHTML = '';
    MAPS.forEach((m, idx) => {
        const card = document.createElement('div');
        card.className = `map-card ${idx === state.selectedMapIndex ? 'selected' : ''}`;
        card.innerText = m.name;
        card.onclick = () => {
            state.selectedMapIndex = idx;
            renderMapGrid();
        };
        grid.appendChild(card);
    });
}

function prevHero() {
    state.selectedHeroIndex = (state.selectedHeroIndex - 1 + HEROES.length) % HEROES.length;
    renderHeroPreview();
}

function nextHero() {
    state.selectedHeroIndex = (state.selectedHeroIndex + 1) % HEROES.length;
    renderHeroPreview();
}

function toggleShop(show) {
    document.getElementById('shop-screen').classList.toggle('hidden', !show);
}

function updateShopUI() {
    const up = state.upgrades;
    document.getElementById('shop-dmg-lvl').innerText = `Ур. ${up.dmg}`;
    document.getElementById('cost-dmg').innerText = (up.dmg + 1) * 100;
    document.getElementById('shop-hp-lvl').innerText = `Ур. ${up.hp}`;
    document.getElementById('cost-hp').innerText = (up.hp + 1) * 100;
    document.getElementById('shop-spd-lvl').innerText = `Ур. ${up.spd}`;
    document.getElementById('cost-spd').innerText = (up.spd + 1) * 150;
    document.getElementById('shop-cdr-lvl').innerText = `Ур. ${up.cdr}`;
    document.getElementById('cost-cdr').innerText = (up.cdr + 1) * 200;
}

function buyUpgrade(type) {
    const costs = { dmg: (state.upgrades.dmg + 1)*100, hp: (state.upgrades.hp + 1)*100, spd: (state.upgrades.spd + 1)*150, cdr: (state.upgrades.cdr + 1)*200 };
    if (state.coins >= costs[type]) {
        state.coins -= costs[type];
        state.upgrades[type]++;
        saveState();
        updateShopUI();
    }
}

function setupTouchControls() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let baseRect = null;

    zone.addEventListener('touchstart', e => {
        e.preventDefault();
        baseRect = zone.getBoundingClientRect();
        joystickInput.active = true;
        updateJoystick(e.touches[0]);
    });

    zone.addEventListener('touchmove', e => {
        e.preventDefault();
        if (joystickInput.active) updateJoystick(e.touches[0]);
    });

    const resetJoy = () => {
        joystickInput.active = false;
        joystickInput.x = 0;
        joystickInput.y = 0;
        knob.style.transform = `translate(0px, 0px)`;
    };

    zone.addEventListener('touchend', resetJoy);
    zone.addEventListener('touchcancel', resetJoy);

    function updateJoystick(touch) {
        let centerX = baseRect.left + baseRect.width / 2;
        let centerY = baseRect.top + baseRect.height / 2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        let dist = Math.hypot(dx, dy);
        let maxR = 40;

        if (dist > maxR) {
            dx = (dx / dist) * maxR;
            dy = (dy / dist) * maxR;
        }

        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        joystickInput.x = dx / maxR;
        joystickInput.y = dy / maxR;
    }

    const btnAtk = document.getElementById('btn-attack');
    btnAtk.addEventListener('touchstart', e => { e.preventDefault(); isAttacking = true; });
    btnAtk.addEventListener('touchend', e => { e.preventDefault(); isAttacking = false; });

    document.getElementById('btn-ab-1').addEventListener('touchstart', e => { e.preventDefault(); if (player) player.useAbility(0); });
    document.getElementById('btn-ab-2').addEventListener('touchstart', e => { e.preventDefault(); if (player) player.useAbility(1); });
}

class Particle {
    constructor(x, y, color, radius, vx, vy, life) {
        this.x = x; this.y = y; this.color = color;
        this.radius = radius; this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life--;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color; this.life = 35;
    }
    update() { this.y -= 0.7; this.life--; }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / 35);
        ctx.font = '900 13px var(--apple-font)';
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x - camera.x, this.y - camera.y);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy, damage, owner, color) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.damage = damage; this.owner = owner; this.color = color;
        this.life = 100;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.life--;
    }
    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Entity {
    constructor(x, y, config, isBot = false) {
        this.x = x; this.y = y;
        this.config = config;
        this.isBot = isBot;

        const multDmg = isBot ? 1 : 1 + (state.upgrades.dmg * 0.1);
        const multHp = isBot ? 1 : 1 + (state.upgrades.hp * 0.15);
        const multSpd = isBot ? 1 : 1 + (state.upgrades.spd * 0.05);

        this.maxHp = config.hp * multHp;
        this.hp = this.maxHp;
        this.speed = config.speed * multSpd;
        this.damage = config.damage * multDmg;
        this.radius = config.radius;

        this.cooldowns = [0, 0];
        this.shootTimer = 0;
        this.angle = 0;
        this.walkTimer = 0;
        this.recoil = 0;
        this.vx = 0;
        this.vy = 0;
    }

    useAbility(idx) {
        if (this.cooldowns[idx] > 0) return;
        const ab = this.config.abilities[idx];
        const cdrMult = this.isBot ? 1 : Math.max(0.5, 1 - (state.upgrades.cdr * 0.05));
        this.cooldowns[idx] = ab.cd * 60 * cdrMult;

        for (let i = 0; i < 16; i++) {
            let a = (i / 16) * Math.PI * 2;
            particles.push(new Particle(this.x, this.y, this.config.color, 3, Math.cos(a)*5, Math.sin(a)*5, 15));
        }

        let target = getClosestEnemy(this);
        if (target && dist(this, target) < 320) {
            target.takeDamage(this.damage * 1.6, this);
        }
    }

    takeDamage(amount, attacker) {
        this.hp -= amount;
        floatingTexts.push(new FloatingText(this.x, this.y, `-${Math.round(amount)}`, '#FF3B30'));
        if (this.hp <= 0 && attacker === player) {
            state.kills++;
            state.coins += 25;
            saveState();
            coins.push({ x: this.x, y: this.y, val: 10 });
        }
    }

    update() {
        this.cooldowns[0] = Math.max(0, this.cooldowns[0] - 1);
        this.cooldowns[1] = Math.max(0, this.cooldowns[1] - 1);
        if (this.shootTimer > 0) this.shootTimer--;
        if (this.recoil > 0) this.recoil -= 0.8;

        let moving = false;
        let mx = 0, my = 0;

        if (this.isBot) {
            this.updateSmartAI(mx, my, moving);
        } else {
            if (joystickInput.active) {
                mx = joystickInput.x;
                my = joystickInput.y;
                moving = true;
                this.angle = Math.atan2(my, mx);
            }

            let enemy = getClosestEnemy(this);
            if (enemy && dist(this, enemy) < 350) {
                this.angle = Math.atan2(enemy.y - this.y, enemy.x - this.x);
            }

            if (isAttacking && this.shootTimer <= 0) {
                this.shoot();
            }

            if (moving) {
                this.walkTimer += 0.2;
                this.vx = mx * this.speed;
                this.vy = my * this.speed;
                let nextX = this.x + this.vx;
                let nextY = this.y + this.vy;

                if (!checkObstacleCollision(nextX, this.y, this.radius)) this.x = nextX;
                if (!checkObstacleCollision(this.x, nextY, this.radius)) this.y = nextY;
            } else {
                this.vx = 0; this.vy = 0;
            }
        }

        this.x = Math.max(this.radius, Math.min(WORLD_SIZE - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(WORLD_SIZE - this.radius, this.y));
    }

    updateSmartAI() {
        let enemy = getClosestEnemy(this);
        let mx = 0, my = 0;

        let dangerBullet = null;
        let minBulletDist = 120;
        bullets.forEach(b => {
            if (b.owner !== this && dist(this, b) < minBulletDist) {
                dangerBullet = b;
            }
        });

        if (dangerBullet) {
            let perpAngle = Math.atan2(dangerBullet.vy, dangerBullet.vx) + Math.PI / 2;
            mx = Math.cos(perpAngle);
            my = Math.sin(perpAngle);
        } else if (enemy && dist(this, enemy) < 550) {
            let bSpeed = 11;
            let timeToHit = dist(this, enemy) / bSpeed;
            let predX = enemy.x + enemy.vx * timeToHit;
            let predY = enemy.y + enemy.vy * timeToHit;

            this.angle = Math.atan2(predY - this.y, predX - this.x);

            let d = dist(this, enemy);
            if (this.hp < this.maxHp * 0.35) {
                mx = -Math.cos(this.angle);
                my = -Math.sin(this.angle);
                if (this.cooldowns[1] === 0) this.useAbility(1);
            } else if (d > 180) {
                mx = Math.cos(this.angle);
                my = Math.sin(this.angle);
            } else {
                let strafe = Math.atan2(enemy.y - this.y, enemy.x - this.x) + Math.PI / 2;
                mx = Math.cos(strafe);
                my = Math.sin(strafe);
                if (this.cooldowns[0] === 0 && d < 160) this.useAbility(0);
            }

            if (this.shootTimer <= 0) this.shoot();
        } else {
            let closestCoin = null;
            let minCDist = 400;
            coins.forEach(c => {
                let cd = dist(this, c);
                if (cd < minCDist) { minCDist = cd; closestCoin = c; }
            });

            if (closestCoin) {
                let ca = Math.atan2(closestCoin.y - this.y, closestCoin.x - this.x);
                mx = Math.cos(ca); my = Math.sin(ca);
            } else {
                if (Math.random() < 0.03) this.angle = Math.random() * Math.PI * 2;
                mx = Math.cos(this.angle) * 0.5;
                my = Math.sin(this.angle) * 0.5;
            }
        }

        this.walkTimer += 0.2;
        this.vx = mx * this.speed;
        this.vy = my * this.speed;

        let nextX = this.x + this.vx;
        let nextY = this.y + this.vy;
        if (!checkObstacleCollision(nextX, this.y, this.radius)) this.x = nextX;
        if (!checkObstacleCollision(this.x, nextY, this.radius)) this.y = nextY;
    }

    shoot() {
        this.recoil = 6;
        let speed = 11;
        bullets.push(new Bullet(
            this.x + Math.cos(this.angle)*this.radius,
            this.y + Math.sin(this.angle)*this.radius,
            Math.cos(this.angle)*speed,
            Math.sin(this.angle)*speed,
            this.damage,
            this,
            this.config.color
        ));
        this.shootTimer = this.config.fireRate;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, this.radius * 0.7, this.radius, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        let scaleY = 1 + Math.sin(this.walkTimer) * 0.06;
        let scaleX = 1 - Math.sin(this.walkTimer) * 0.06;
        ctx.scale(scaleX, scaleY);

        ctx.rotate(this.angle);

        ctx.fillStyle = this.config.weaponColor;
        ctx.fillRect(this.radius * 0.4 - this.recoil, -4, 22, 8);
        ctx.fillStyle = '#1C1C1E';
        ctx.fillRect(this.radius * 0.4 - this.recoil + 14, -2, 10, 4);

        ctx.fillStyle = this.config.color;
        ctx.shadowColor = this.config.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.radius * 0.4, -this.radius * 0.25, 3.5, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.4, this.radius * 0.25, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.save();
        let bw = 34, bh = 4;
        let bx = (this.x - camera.x) - bw/2;
        let by = (this.y - camera.y) - this.radius - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = this.isBot ? '#FF3B30' : '#34C759';
        ctx.fillRect(bx, by, bw * Math.max(0, (this.hp / this.maxHp)), bh);
        ctx.restore();
    }
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function getClosestEnemy(entity) {
    let list = [player, ...bots].filter(e => e && e !== entity && e.hp > 0);
    let close = null, minDist = Infinity;
    list.forEach(e => {
        let d = dist(entity, e);
        if (d < minDist) { minDist = d; close = e; }
    });
    return close;
}

function checkObstacleCollision(x, y, r) {
    for (let t of mapObstacles.trees) {
        if (Math.hypot(x - t.x, y - t.y) < r + t.r * 0.5) return true;
    }
    for (let rk of mapObstacles.rocks) {
        if (Math.hypot(x - rk.x, y - rk.y) < r + rk.r) return true;
    }
    return false;
}

function startGame() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('hud-layer').classList.remove('hidden');

    currentMap = MAPS[state.selectedMapIndex];
    mapObstacles = generateMapObstacles(WORLD_SIZE, currentMap);

    ambientParticles = [];
    for (let i = 0; i < 40; i++) {
        ambientParticles.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            r: Math.random() * 2.5 + 1,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        });
    }

    const hData = HEROES[state.selectedHeroIndex];
    player = new Entity(WORLD_SIZE / 2, WORLD_SIZE / 2, hData, false);

    bots = [];
    for (let i = 0; i < 6; i++) {
        let rHero = HEROES[Math.floor(Math.random() * HEROES.length)];
        bots.push(new Entity(Math.random() * (WORLD_SIZE - 200) + 100, Math.random() * (WORLD_SIZE - 200) + 100, rHero, true));
    }

    bullets = [];
    particles = [];
    coins = [];
    floatingTexts = [];
    state.kills = 0;
    state.inGame = true;

    document.getElementById('hud-hero-name').innerText = hData.name;
    requestAnimationFrame(gameLoop);
}

function drawEnvironment() {
    ambientParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = WORLD_SIZE; if (p.x > WORLD_SIZE) p.x = 0;
        if (p.y < 0) p.y = WORLD_SIZE; if (p.y > WORLD_SIZE) p.y = 0;

        ctx.save();
        ctx.fillStyle = currentMap.particleColor;
        ctx.beginPath();
        ctx.arc(p.x - camera.x, p.y - camera.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    mapObstacles.rocks.forEach(rk => {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.arc(rk.x - camera.x + 5, rk.y - camera.y + 5, rk.r, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = currentMap.rockColor;
        ctx.beginPath();
        ctx.arc(rk.x - camera.x, rk.y - camera.y, rk.r, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(rk.x - camera.x - rk.r*0.3, rk.y - camera.y - rk.r*0.3, rk.r*0.4, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });

    mapObstacles.trees.forEach(t => {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(t.x - camera.x + 10, t.y - camera.y + 10, t.r, t.r * 0.6, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = currentMap.treeColor;
        ctx.beginPath();
        ctx.arc(t.x - camera.x, t.y - camera.y, t.r * 0.35, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = currentMap.treeFoliage;
        ctx.beginPath();
        ctx.arc(t.x - camera.x, t.y - camera.y, t.r, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = currentMap.foliageHighlight;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(t.x - camera.x - t.r*0.25, t.y - camera.y - t.r*0.25, t.r * 0.55, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });
}

function gameLoop() {
    if (!state.inGame) return;

    ctx.fillStyle = currentMap.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    camera.x += (player.x - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (player.y - canvas.height / 2 - camera.y) * 0.1;

    ctx.strokeStyle = currentMap.gridColor;
    ctx.lineWidth = 1;
    let step = 70;
    for (let x = -camera.x % step; x < canvas.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = -camera.y % step; y < canvas.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    drawEnvironment();

    if (player.hp > 0) {
        player.update();
        player.draw();
    } else {
        state.inGame = false;
        alert('Поражение! Убито ботов: ' + state.kills);
        document.getElementById('hud-layer').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        renderHeroPreview();
        return;
    }

    bots.forEach(b => {
        if (b.hp > 0) {
            b.update();
            b.draw();
        }
    });

    bullets.forEach((b, i) => {
        b.update();
        b.draw();
        [player, ...bots].forEach(e => {
            if (e && e !== b.owner && e.hp > 0 && dist(b, e) < e.radius) {
                e.takeDamage(b.damage, b.owner);
                b.life = 0;
            }
        });
        if (b.life <= 0) bullets.splice(i, 1);
    });

    coins.forEach((c, i) => {
        ctx.save();
        ctx.fillStyle = '#FFD60A';
        ctx.shadowColor = '#FFD60A';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(c.x - camera.x, c.y - camera.y, 6, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        if (dist(player, c) < player.radius + 10) {
            state.coins += c.val;
            saveState();
            coins.splice(i, 1);
        }
    });

    particles.forEach((p, i) => { p.update(); p.draw(); if (p.life <= 0) particles.splice(i, 1); });
    floatingTexts.forEach((ft, i) => { ft.update(); ft.draw(); if (ft.life <= 0) floatingTexts.splice(i, 1); });

    document.getElementById('hud-hp-text').innerText = `${Math.max(0, Math.round(player.hp))}/${Math.round(player.maxHp)}`;
    document.getElementById('hud-hp-fill').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    document.getElementById('hud-kills').innerText = state.kills;
    document.getElementById('hud-alive').innerText = bots.filter(b => b.hp > 0).length + 1;

    player.config.abilities.forEach((ab, idx) => {
        const overlay = document.getElementById(`cd-overlay-${idx}`);
        if (overlay) {
            let total = ab.cd * 60;
            overlay.style.height = `${(player.cooldowns[idx] / total) * 100}%`;
        }
    });

    requestAnimationFrame(gameLoop);
}

initMenu();
