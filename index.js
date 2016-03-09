var url = require('url')
var http = require('http')
var https = require('https')
var querystring = require('querystring')

var HTTP = {}
var METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']

METHODS.forEach(function (method) {
  // https://nodejs.org/api/http.html#http_http_request_options_callback
  HTTP[method.toLowerCase()] = function (options, data) {
    var promise = new Promise(function (resolve, reject) {
      if (typeof options === 'string') {
        options = url.parse(options)
      } else {
        var query = options.query
        if (options.form) {
          data = querystring.stringify(options.form)
        }
        if (options.uri) {
          merge(options, url.parse(options.uri))
        }
        if (query && Object.keys(query).length !== 0) {
          options.path += '?' + querystring.stringify(query)
        }
      }
      if (data) {
        var isFormData = typeof data === 'string'
        var headers = options.headers || (options.headers = {})
        if (!headers['content-type']) {
          headers['content-type'] = isFormData ? 'application/x-www-form-urlencoded' : 'application/json'
        }
        if (options.json && !headers['accept']) {
          headers['accept'] = 'application/json'
        }
        if (!isFormData) {
          data = JSON.stringify(data)
        }
        headers['content-length'] = data.length
      }
      options.method = method
      var module = options.protocol.indexOf('https') === 0 ? https : http
      var req = module.request(options, function (response) {
        var data = ''
        response.setEncoding('utf8')
        response.on('data', function (chunk) {
          data += chunk
        })
        response.on('end', function () {
          resolve({
            data: data,
            response: response
          })
        })
      }).on('error', function (err) {
        reject(err)
      })
      if (data) {
        req.write(data)
      }
      req.end()
    })
    if (options.json) {
      promise = parseJSON(promise)
    }
    return promise
  }
})

HTTP.json = function (options) {
  return parseJSON(this.get(options)).then(function (result) {
    return result.data
  })
}

function merge (dest, src) {
  for (var k in src) {
    dest[k] = src[k]
  }
}

function parseJSON (promise) {
  return promise.then(function (result) {
    try {
      result.data = JSON.parse(result.data)
      return result
    } catch (e) {
      return Promise.reject(e)
    }
  })
}

module.exports = HTTP
