'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const docref = require('../index.js')

describe('absolute url', function () {
  var testCases = [
    { url: 'http://abc.com', judge: true },
    { url: 'https://abc.com', judge: true },
    { url: 'ftp://abc.com', judge: true },
    { url: '//abc.com', judge: true },
    { url: '/abc.jpg', judge: false },
    { url: 'a/abc.jpg', judge: false },
    { url: 'data:image/svg+xml;base64,abc+==', judge: true }
  ]
  testCases.forEach(test => it(test.url, function () {
    assert.equal(docref.isAbsolute(test.url), test.judge)
  }))
})

describe('file mime', function () {
  var testCases = [
    { file: 'abc.jpg', mime: 'image/jpeg' },
    { file: 'abc.', mime: 'text/plain' },
    { file: './', mime: 'text/plain' },
    { file: '', mime: 'text/plain' }
  ]
  testCases.forEach(test => it(test.file || '(null)', function () {
    assert.equal(docref.getFileMIME(test.file), test.mime)
  }))
})

describe('same base uri', function () {
  var testCases = [
    { file: 'abc.jpg', input: '', output: '' },
    { file: 'abc.jpg', input: 'abc.txt', output: 'abc.txt' },
    { file: 'a/abc.jpg', input: 'abc.txt', output: 'a/abc.txt' },
    { file: 'a/abc.jpg', input: '../abc.txt', output: 'abc.txt' }
  ]
  testCases.forEach(test =>
    it(test.file + ',' + (test.input || '(null)'), function () {
      assert.equal(docref.getSameBaseUri(test.file, test.input), test.output)
    })
  )
})

describe('infect refs', function () {
  var input = {
    'a.html': ['a.css', 'ooo.jpg'],
    'a.css': ['a.jpg'],
    'b.css': ['b.jpg']
  }
  var output = {
    'a.html': ['a.css', 'ooo.jpg', 'a.jpg'],
    'a.css': ['a.jpg'],
    'b.css': ['b.jpg']
  }
  it('level 1 infect', function () {
    assert.deepEqual(output, docref.infectRefs(input))
  })
})

describe('get refs', function () {
  var fileCSS = path.join(__dirname, 'fixture/f0.css')
  var fileHTML = path.join(__dirname, 'fixture/f1.html')

  var bodyCSS = fs.readFileSync(fileCSS, 'utf8')
  var bodyHTML = fs.readFileSync(fileHTML, 'utf8')

  it('css refs', function () {
    var refs = docref.getCSSRefs(bodyCSS, 'fixture/f0.css')
    assert.deepEqual(refs, [
      'fixture/image/rwby.png',
      'image/rwby.png',
      '/image/rwby.png',
      '//www.abc.com/image/rwby.png',
      '//www.abc.com/image/rwby.png',
      '//www.abc.com/image/rwby.png',
      '//www.abc.com/image/rwby.png',
      '//www.abc.com/image/rwby.png',
      '/abc'
    ])
  })

  it('html refs', function () {
    var refs = docref.getHTMLRefs(bodyHTML, 'fixture/f1.html')
    assert.deepEqual(refs, [
      'a.css',
      'a.ico',
      'fixture/b/a.jpg',
      'fixture/a.js',
      'https://www.baidu.com/a.html'
    ])
  })

  it('html links', function () {
    var file = path.join(__dirname, 'fixture/f1.html')
    var content = fs.readFileSync(file, 'utf8')
    var links = docref.getHTMLLinks(bodyHTML, 'fixture/f1.html')
    assert.deepEqual(links, [
      '#ccc',
      'fixture/b.html'
    ])
  })
})

describe('set refs', function () {
  var fileCSS = path.join(__dirname, 'fixture/f0.css')
  var fileRefCSS = path.join(__dirname, 'fixture/f0-ref.css')
  var fileHTML = path.join(__dirname, 'fixture/f1.html')
  var fileRefHTML = path.join(__dirname, 'fixture/f1-ref.html')
  var fileLinkHTML = path.join(__dirname, 'fixture/f1-link.html')

  var bodyCSS = fs.readFileSync(fileCSS, 'utf8')
  var bodyRefCSS = fs.readFileSync(fileRefCSS, 'utf8')
  var bodyHTML = fs.readFileSync(fileHTML, 'utf8')
  var bodyRefHTML = fs.readFileSync(fileRefHTML, 'utf8')
  var bodyLinkHTML = fs.readFileSync(fileLinkHTML, 'utf8')

  it('css refs, null setter', function () {
    var newBody = docref.setCSSRefs(bodyCSS, 'fixture/f0.css', function () {})
    assert.equal(newBody, bodyCSS)
  })

  it('css refs', function () {
    var newBody = docref.setCSSRefs(
      bodyCSS, 'fixture/f0.css',
      function (url, mime, absolute) {
        return url += '?m=' + mime
      }
    )
    assert.equal(newBody, bodyRefCSS)
  })

  it('html refs, null setter', function () {
    var newBody = docref.setHTMLRefs(bodyHTML, 'fixture/f1.html', function () {})
    assert.equal(newBody, bodyHTML)
  })

  it('html refs', function () {
    var newBody = docref.setHTMLRefs(
      bodyHTML, 'fixture/f1.html',
      function (url, mime, absolute) {
        return url += '#' + mime
      }
    )
    assert.equal(newBody, bodyRefHTML)
  })

  it('html links, null setter', function () {
    var newBody = docref.setHTMLLinks(bodyHTML, 'abc', function () {})
    assert.equal(newBody, bodyHTML)
  })

  it('html links', function () {
    var newBody = docref.setHTMLLinks(
      bodyHTML, null,
      function (url, mime, absolute) {
        return url += '?hello=world'
      }
    )
    assert.equal(newBody, bodyLinkHTML)
  })
})
