const { app, getServer } = require('../example/app')
const request = require('supertest')

after(() => {
    getServer().close()
})

describe('base', () => {
    it('should match 404 for undefined api', (done) => {
        request(app)
        .post('/not/match')
        .expect(404, done)
    })

    it('should match default method: get', (done) => {
        request(app)
        .get('/a/getList')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, done)
    })

    it('should match method: post', (done) => {
        request(app)
        .post('/a/setName')
        .expect(200, done)
    })

    it('should delay', (done) => {
        request(app)
        .get('/a/delay')
        .expect(200, done)
    })

    it('should catch error in api function', (done) => {
        request(app)
        .get('/a/error')
        .expect(500, 'Api Error: ReferenceError: ff is not defined', done)
    })

    it('should upload success', (done) => {
        request(app)
        .post('/a/upload')
        .field('name', 'my awesome avatar')
        .attach('avatar', 'test/me.png')
        .expect(200, done)
    })
})

describe('params', () => {
    it('should return false', (done) => {
        request(app)
        .post('/a/del/199')
        .expect(200, {
            code: 20000,
            msg: '请求成功',
            data: false,
        }, done)
    })

    it('should return true', (done) => {
        request(app)
        .post('/a/del/200')
        .expect(200, {
            code: 20000,
            msg: '请求成功',
            data: true,
        }, done)
    })

    it('should return file from api function', (done) => {
        request(app)
        .get('/a/download/a.js')
        .expect(200, done)
    })

    it('should return 404 for file not found', (done) => {
        request(app)
        .get('/a/download/c.js')
        .expect(404, done)
    })
})

describe('namespace', () => {
    it('should match path with namespace', (done) => {
        request(app)
        .get('/b/b1/list')
        .expect(200, done)
    })
    it('should match path with namespace', (done) => {
        request(app)
        .get('/b/b2/list')
        .expect(200, done)
    })
    it('should match path with namespace', (done) => {
        request(app)
        .get('/c/a/list')
        .expect(200, done)
    })
})

describe('reqDateWarp', () => {
    it('should match reqDate', (done) => {
        request(app)
        .post('/a/getArg/123?dd=2')
        .send({ name: 'john' })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, {
            code: 20000,
            msg: '请求成功',
            data: {
                tt: 1,
                dd: '2',
                name: 'john',
                params: ['123']
            },
        }, done)
    })
})

describe('defaultMathod', () => {
    it('should match get method', (done) => {
        request(app)
        .get('/b/b1/list')
        .expect(200, done)
    })
    it('should match post method', (done) => {
        request(app)
        .post('/b/b1/list')
        .expect(200, done)
    })
    it('should match put method', (done) => {
        request(app)
        .put('/b/b1/list')
        .expect(200, done)
    })
})
