const HEROES = [
    {
        id: 'guardian',
        name: 'Страж',
        role: 'Сбалансированный',
        price: 0,
        color: '#007AFF',
        weaponColor: '#004999',
        weaponType: 'rifle',
        radius: 20,
        hp: 175,
        speed: 3.6,
        damage: 22,
        fireRate: 22,
        abilities: [
            { name: 'Тройной Выстрел', cd: 4 },
            { name: 'Лечение', cd: 8 }
        ]
    },
    {
        id: 'sprinter',
        name: 'Спринтер',
        role: 'Быстрый Ассасин',
        price: 0,
        color: '#30D158',
        weaponColor: '#1B8A35',
        weaponType: 'pistol',
        radius: 15,
        hp: 95,
        speed: 5.3,
        damage: 14,
        fireRate: 14,
        abilities: [
            { name: 'Рывок', cd: 3 },
            { name: 'Ловушка', cd: 7 }
        ]
    },
    {
        id: 'pyro',
        name: 'Пиромант',
        role: 'Урон по Области',
        price: 0,
        color: '#FF9F0A',
        weaponColor: '#B86B00',
        weaponType: 'flamer',
        radius: 21,
        hp: 155,
        speed: 3.4,
        damage: 17,
        fireRate: 9,
        abilities: [
            { name: 'Огнемет', cd: 4 },
            { name: 'Огненный След', cd: 8 }
        ]
    },
    {
        id: 'engineer',
        name: 'Инженер',
        role: 'Тактик',
        price: 0,
        color: '#5E5CE6',
        weaponColor: '#312F9E',
        weaponType: 'rifle',
        radius: 22,
        hp: 165,
        speed: 3.2,
        damage: 18,
        fireRate: 23,
        abilities: [
            { name: 'Турель', cd: 9 },
            { name: 'Импульс', cd: 6 }
        ]
    },
    {
        id: 'vampire',
        name: 'Вампир',
        role: 'Жнец Жизней',
        price: 0,
        color: '#FF453A',
        weaponColor: '#A8130B',
        weaponType: 'dark_orb',
        radius: 19,
        hp: 145,
        speed: 3.7,
        damage: 20,
        fireRate: 24,
        abilities: [
            { name: 'Высасывание', cd: 5 },
            { name: 'Всплеск Крови', cd: 9 }
        ]
    },
    {
        id: 'titan',
        name: 'Титан Прайм',
        role: 'Премиум Танк',
        price: 600,
        color: '#FF9500',
        weaponColor: '#C76A00',
        weaponType: 'shotgun',
        radius: 28,
        hp: 420,
        speed: 2.5,
        damage: 42,
        fireRate: 38,
        abilities: [
            { name: 'Ударная Волна', cd: 5 },
            { name: 'Железный Щит', cd: 9 }
        ]
    },
    {
        id: 'sniper',
        name: 'Призрак',
        role: 'Премиум Снайпер',
        price: 800,
        color: '#64D2FF',
        weaponColor: '#1CA3DC',
        weaponType: 'sniper',
        radius: 17,
        hp: 125,
        speed: 4.1,
        damage: 72,
        fireRate: 50,
        abilities: [
            { name: 'Лазерный Снайп', cd: 6 },
            { name: 'Невидимость', cd: 10 }
        ]
    },
    {
        id: 'teleport',
        name: 'Странник Бездны',
        role: 'Премиум Маг',
        price: 1000,
        color: '#BF5AF2',
        weaponColor: '#7A22A5',
        weaponType: 'staff',
        radius: 18,
        hp: 150,
        speed: 4.3,
        damage: 28,
        fireRate: 22,
        abilities: [
            { name: 'Скачок', cd: 3 },
            { name: 'Замедление', cd: 9 }
        ]
    },
    {
        id: 'berserk',
        name: 'Лорд Берсерк',
        role: 'Премиум Воин',
        price: 1200,
        color: '#FF2D55',
        weaponColor: '#9E0B28',
        weaponType: 'blade',
        radius: 25,
        hp: 280,
        speed: 3.4,
        damage: 38,
        fireRate: 28,
        abilities: [
            { name: 'Ярость', cd: 7 },
            { name: 'Вихрь', cd: 4 }
        ]
    },
    {
        id: 'necro',
        name: 'Повелитель Смерти',
        role: 'Премиум Неромант',
        price: 1500,
        color: '#98989D',
        weaponColor: '#48484A',
        weaponType: 'staff',
        radius: 20,
        hp: 170,
        speed: 3.7,
        damage: 26,
        fireRate: 24,
        abilities: [
            { name: 'Призыв Слуги', cd: 6 },
            { name: 'Проклятие', cd: 9 }
        ]
    }
];
