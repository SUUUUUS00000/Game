const HEROES = [
    {
        id: 'titan',
        name: 'Титан',
        role: 'Тяжелый Танк',
        color: '#FF9500',
        weaponColor: '#C76A00',
        weaponType: 'shotgun',
        radius: 26,
        hp: 360,
        speed: 2.3,
        damage: 34,
        fireRate: 40,
        abilities: [
            { name: 'Ударная Волна', cd: 6 },
            { name: 'Щит', cd: 10 }
        ]
    },
    {
        id: 'sprinter',
        name: 'Спринтер',
        role: 'Легкий Ассасин',
        color: '#30D158',
        weaponColor: '#1B8A35',
        weaponType: 'pistol',
        radius: 15,
        hp: 95,
        speed: 5.2,
        damage: 13,
        fireRate: 14,
        abilities: [
            { name: 'Рывок', cd: 3 },
            { name: 'Мина', cd: 7 }
        ]
    },
    {
        id: 'guardian',
        name: 'Страж',
        role: 'Штурмовик',
        color: '#007AFF',
        weaponColor: '#004999',
        weaponType: 'rifle',
        radius: 20,
        hp: 175,
        speed: 3.6,
        damage: 21,
        fireRate: 22,
        abilities: [
            { name: 'Тройной Выстрел', cd: 4 },
            { name: 'Лечение', cd: 8 }
        ]
    },
    {
        id: 'sniper',
        name: 'Призрак',
        role: 'Снайпер',
        color: '#64D2FF',
        weaponColor: '#1CA3DC',
        weaponType: 'sniper',
        radius: 17,
        hp: 110,
        speed: 3.9,
        damage: 58,
        fireRate: 55,
        abilities: [
            { name: 'Лазерный Снайп', cd: 7 },
            { name: 'Стелс', cd: 11 }
        ]
    },
    {
        id: 'vampire',
        name: 'Вампир',
        role: 'Жнец',
        color: '#FF453A',
        weaponColor: '#A8130B',
        weaponType: 'dark_orb',
        radius: 19,
        hp: 145,
        speed: 3.7,
        damage: 19,
        fireRate: 24,
        abilities: [
            { name: 'Высасывание', cd: 5 },
            { name: 'Всплеск Крови', cd: 9 }
        ]
    },
    {
        id: 'pyro',
        name: 'Пиромант',
        role: 'Урон по Области',
        color: '#FF9F0A',
        weaponColor: '#B86B00',
        weaponType: 'flamer',
        radius: 21,
        hp: 155,
        speed: 3.4,
        damage: 16,
        fireRate: 9,
        abilities: [
            { name: 'Огнемет', cd: 4 },
            { name: 'Огненный След', cd: 8 }
        ]
    },
    {
        id: 'teleport',
        name: 'Странник',
        role: 'Маг Космоса',
        color: '#BF5AF2',
        weaponColor: '#7A22A5',
        weaponType: 'staff',
        radius: 18,
        hp: 130,
        speed: 4.1,
        damage: 23,
        fireRate: 26,
        abilities: [
            { name: 'Телепорт', cd: 3.5 },
            { name: 'Замедление', cd: 11 }
        ]
    },
    {
        id: 'engineer',
        name: 'Инженер',
        role: 'Тактик',
        color: '#5E5CE6',
        weaponColor: '#312F9E',
        weaponType: 'rifle',
        radius: 22,
        hp: 165,
        speed: 3.2,
        damage: 17,
        fireRate: 23,
        abilities: [
            { name: 'Турель', cd: 9 },
            { name: 'Импульс', cd: 6 }
        ]
    },
    {
        id: 'berserk',
        name: 'Берсерк',
        role: 'Гладиатор',
        color: '#FF2D55',
        weaponColor: '#9E0B28',
        weaponType: 'blade',
        radius: 24,
        hp: 230,
        speed: 3.1,
        damage: 30,
        fireRate: 32,
        abilities: [
            { name: 'Ярость', cd: 8 },
            { name: 'Вихрь', cd: 5 }
        ]
    },
    {
        id: 'necro',
        name: 'Некромант',
        role: 'Призыватель',
        color: '#98989D',
        weaponColor: '#48484A',
        weaponType: 'staff',
        radius: 19,
        hp: 135,
        speed: 3.5,
        damage: 20,
        fireRate: 28,
        abilities: [
            { name: 'Призыв', cd: 7 },
            { name: 'Проклятие', cd: 10 }
        ]
    }
];
