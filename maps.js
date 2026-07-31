const MAPS = [
    {
        id: 'forest',
        name: 'Изумрудный Лес',
        bgColor: '#060F09',
        gridColor: 'rgba(52, 199, 89, 0.08)',
        accentColor: '#34C759',
        treeColor: '#173D21',
        treeFoliage: '#246B34',
        foliageHighlight: '#34C759',
        rockColor: '#3D4856',
        particleColor: 'rgba(52, 199, 89, 0.3)'
    },
    {
        id: 'cyber',
        name: 'Кибер Сити',
        bgColor: '#04060E',
        gridColor: 'rgba(0, 122, 255, 0.12)',
        accentColor: '#007AFF',
        treeColor: '#07182C',
        treeFoliage: '#0A4A8A',
        foliageHighlight: '#64D2FF',
        rockColor: '#151D2A',
        particleColor: 'rgba(100, 210, 255, 0.35)'
    },
    {
        id: 'lava',
        name: 'Вулканический Пик',
        bgColor: '#120404',
        gridColor: 'rgba(255, 59, 48, 0.08)',
        accentColor: '#FF3B30',
        treeColor: '#300808',
        treeFoliage: '#991B1B',
        foliageHighlight: '#FF9500',
        rockColor: '#241C1C',
        particleColor: 'rgba(255, 149, 0, 0.4)'
    }
];

function generateMapObstacles(worldSize, mapConfig) {
    const trees = [];
    const rocks = [];

    for (let i = 0; i < 32; i++) {
        trees.push({
            x: Math.random() * (worldSize - 300) + 150,
            y: Math.random() * (worldSize - 300) + 150,
            r: Math.random() * 22 + 38
        });
    }

    for (let i = 0; i < 22; i++) {
        rocks.push({
            x: Math.random() * (worldSize - 300) + 150,
            y: Math.random() * (worldSize - 300) + 150,
            r: Math.random() * 16 + 22
        });
    }

    return { trees, rocks };
}
