module.exports = [
    {
        namespace: 'b1',
        api: {
            '/list': {
                'total|50-100': 80,
                'list|20': [{
                    'id|+1': 200,
                    'name': 'xxx',
                }],
            },
        },
    },
    {
        namespace: 'b2',
        api: {
            '/list': {
                'total|50-100': 80,
                'list|20': [{
                    'id|+1': 200,
                    'name': 'xxx',
                }],
            },
        },
    },
]