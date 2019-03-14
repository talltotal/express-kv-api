const path = require('path')

module.exports = {
    '/getList': {
        'total|50-100': 80,
        'list|20': [{
            'id|+1': 200,
            'name': 'xxx',
        }],
    },
    'post /setName': true,
    'post /del/:id' ({ params }) {
        return Number(params[0]) >= 200
    },
    '/download/:path' ({ params }) {
        return (res) => {
            res.sendFile(path.join(__dirname, params[0]))
        }
    },
    '|1000 /delay': true,
    '/error' () {
        console.log(ff)
        return true
    },
    'post|1000 /upload': true
}