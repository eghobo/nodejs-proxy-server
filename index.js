let http = require('http')
let request = require('request')
let path = require('path')
let fs = require('fs')
let through = require('through')
let argv = require('yargs')
    .default('host', '127.0.0.1')
    .argv
let port = argv.port || (argv.host === '127.0.0.1' ? 8000 : 80)
let scheme = 'http://'
let destinationUrl = argv.url || scheme + argv.host + ':' + port
let logPath = argv.logfile && path.join(__dirname, argv.logfile)
let logStream = logPath ? fs.createWriteStream(logPath) : process.stdout

http.createServer((req, res) => {
	logStream.write('\nEcho request: \n' + JSON.stringify(req.headers))
	for (let header in req.headers) {
		res.setHeader(header, req.headers[header])
  	}
	through(req, logStream, {autoDestroy: false})
	req.pipe(res)
}).listen(8000)

console.log(`Listening at http://127.0.0.1:8000`)
	
http.createServer((req, res) => {
	let url = destinationUrl
	if (req.headers['x-destination-url']) {
		url = req.headers['x-destination-url']
	}
		
	console.log(`Proxying request to: ${url}`)
	let options = {
	    headers: req.headers,
		url: url + req.url 
	}
	options.method = req.method
	
	logStream.write('\nProxy request: \n' +JSON.stringify(req.headers))
	through(req, logStream, {autoDestroy: false})
		
	let downstreamResponse = req.pipe(request(options))
	logStream.write(JSON.stringify(downstreamResponse.headers))
	through(downstreamResponse, logStream, {autoDestroy: false})
	downstreamResponse.pipe(res)	
}).listen(8001)