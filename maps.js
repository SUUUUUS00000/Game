const MAPS = [
    {
        id: 'forest',
        name: 'Изумрудный Лес',
        bgColor: '#0B140E',
        gridColor: 'rgba(52, 199, 89, 0.08)',
        accentColor: '#34C759',
        treeColor: '#1E4D2B',
        treeFoliage: '#2E7D32',
        rockColor: '#4A5568'
    },
    {
        id: 'cyber',
        name: 'Кибер Сити',
        bgColor: '#070914',
        gridColor: 'rgba(0, 122, 255, 0.1)',
        accentColor: '#007AFF',
        treeColor: '#0A2540',
        treeFoliage: '#007AFF',
        rockColor: '#1A202C'
    },
    {
        id: 'lava',
        name: 'Вулканический Пик',
        bgColor: '#140808',
        gridColor: 'rgba(255, 59, 48, 0.08)',
        accentColor: '#FF3B30',
        treeColor: '#3D0C0C',
        treeFoliage: '#D32F2F',
        rockColor: '#2D3748'
    }
];

function generateMapObstacles(worldSize, mapConfig) {
    const trees = [];
    const rocks = [];
    
    for (let i = 0; i < 28; i++) {
        trees.push({
            x: Math.random() * (worldSize - 300) + 150,
            y: Math.random() * (worldSize - 300) + 150,
            r: Math.random() * 20 + 35
        });
    }

    for (let i = 0; i < 20; i++) {
        rocks.push({
            x: Math.random() * (worldSize - 300) + 150,
            y: Math.random() * (worldSize - 300) + 150,
            r: Math.random() * 15 + 20
        });
    }

    return { trees, rocks };
}
