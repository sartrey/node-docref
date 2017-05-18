'use strict'

const path = require('path')
const cheerio = require('cheerio')

const mimes = require('./_mimes.json')

const REGEX_CSS_URL = /url\s*\(\s*(['"]?)([^"'\)]*)\1\s*\)/gi

// do NOT contains <a> which means non-resource
const HTML_REF_RULES = [
  { tag: 'link[rel="stylesheet"]', attr: 'href' },
  { tag: 'link[rel="shortcut icon"]', attr: 'href' },
  { tag: 'img', attr: 'src' },
  { tag: 'script', attr: 'src' },
  { tag: 'iframe', attr: 'src' }
]

module.exports = {
  isAbsolute,
  infectRefs,
  getFileMIME,
  getSameBaseUri,

  getCSSRefs,
  setCSSRefs,
  getHTMLRefs,
  setHTMLRefs,

  getHTMLLinks,
  setHTMLLinks
}

/**
 * test if url is absolute
 *
 * @param  {String} url
 * @return {Boolean}
 */
function isAbsolute(url) {
  return !url || /^(([a-z0-9]+:)|(\/\/)|#)/i.test(url)
}

/**
 * infect file refs
 *
 * @param  {Object} maps - { file: refs }
 * @return {Object} maps - { file: refs }
 */
function infectRefs(maps) {
  var files = Object.keys(maps)
  files.forEach(function (file) {
    var refs = maps[file]
    refs.forEach(function (ref) {
      if (maps.hasOwnProperty(ref)) {
        maps[file] = maps[file].concat(maps[ref])
      }
    })
  })
  return maps
}

/**
 * get MIME by file name
 *
 * @param  {String} file - file name
 * @return {String} MIME
 */
function getFileMIME(file) {
  if (!file) return 'text/plain'
  var ext = path.extname(file)
  if (ext) ext = ext.toLowerCase().substring(1)
  return mimes[ext] || mimes.txt
}

/**
 * resolve uri as file
 *
 * @param  {String} file - not dir
 * @param  {String} uri - relative uri
 * @return {String} uri - resolved uri
 */
function getSameBaseUri(file, uri) {
  if (!uri) return ''
  var base = path.dirname(file)
  return uri.startsWith('/') ? uri : path.join(base, uri)
}

/**
 * get CSS refs
 *
 * @param  {String} text
 * @param  {String} file
 * @return {String[]} urls
 */
function getCSSRefs(text, file) {
  var matches = text.match(REGEX_CSS_URL) || []
  return matches.map(match => {
    var url = match
      // remove spaces & url(''|"") to get url
      .replace(/\s*/g, '').slice(4, -1).replace(/"|'/g, '')
      // replace \ to /
      .replace(/\\/g, '/')
    if (file && !isAbsolute(url)) {
      url = getSameBaseUri(file, url)
    }
    return url
  }).filter(Boolean)
}

/**
 * set CSS refs
 *
 * @param  {String} text
 * @param  {String} file
 * @param  {Function} edit - fn(url, mime, abs)
 * @return {String} fixed content
 */
function setCSSRefs(text, file, edit) {
  return text.replace(REGEX_CSS_URL, match => {
    var url = match
      // remove spaces & url(''|"") to get url
      .replace(/\s*/g, '').slice(4, -1).replace(/"|'/g, '')
      // replace \ to /
      .replace(/\\/g, '/')

    var absolute = isAbsolute(url)
    if (file && !absolute) {
      url = getSameBaseUri(file, url)
    }
    url = edit(url, getFileMIME(url), absolute)
    return url ? `url(${url})` : match
  })
}

/**
 * get HTML refs
 *
 * @param  {String} text
 * @param  {String} file
 * @return {String[]} url[]
 */
function getHTMLRefs(text, file) {
  var refs = []
  var $ = cheerio.load(text)
  // never use arrow function here
  HTML_REF_RULES.forEach(function (rule) {
    $(rule.tag).each(function () {
      var elem = $(this)
      var url = elem.attr(rule.attr)
      if (file && !isAbsolute(url)) {
        url = getSameBaseUri(file, url)
      }
      if (url) refs.push(url)
    })
  })
  return refs
}

/**
 * set HTML refs
 *
 * @param  {String} text
 * @param  {String} file
 * @param  {Function} edit - fn(url, mime, abs)
 * @return {String} fixed content
 */
function setHTMLRefs(text, file, edit) {
  var $ = cheerio.load(text)
  // never use arrow function here
  HTML_REF_RULES.forEach(function (rule) {
    $(rule.tag).each(function () {
      var elem = $(this)
      var url = elem.attr(rule.attr)
      var absolute = isAbsolute(url)
      if (file && !absolute) {
        url = getSameBaseUri(file, url)
      }
      url = edit(url, getFileMIME(url), absolute)
      if (url) elem.attr(rule.attr, url)
    })
  })
  return $.html()
}

/**
 * get HTML links
 *
 * @param  {String} text
 * @param  {String} file
 * @return {String[]} url[]
 */
function getHTMLLinks(text, file) {
  var refs = []
  var $ = cheerio.load(text)
  $('a').each(function () {
    var elem = $(this)
    var url = elem.attr('href')
    if (file && !isAbsolute(url)) {
      url = getSameBaseUri(file, url)
    }
    if (url) refs.push(url)
  })
  return refs
}

/**
 * set HTML links
 *
 * @param  {String} text
 * @param  {String} file
 * @param  {Function} edit - fn(url, mime, abs)
 * @return {String} fixed content
 */
function setHTMLLinks(text, file, edit) {
  var $ = cheerio.load(text)
  $('a').each(function () {
    var elem = $(this)
    var url = elem.attr('href')
    var absolute = isAbsolute(url)
    if (file && !absolute) {
      url = getSameBaseUri(file, url)
    }
    url = edit(url, getFileMIME(url), absolute)
    if (url) elem.attr('href', url)
  })
  return $.html()
}
