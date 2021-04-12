(function (express, fs) {
  'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var express__default = /*#__PURE__*/_interopDefaultLegacy(express);
  var fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

  var app = express__default['default']();


  app.all("/*", function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
    next();
  });

  app.get("/", function(req, res, next) {
    console.log("index");
    fs__default['default'].readFile('./public/index.html', null, function(error,data){
      if(error){
        res.writeHead(404);
        res.write('File not found!');
      } else {
        res.writeHead(200,{'Content-Type':'text/html'});
        res.write(data);
        res.end();
      }
    });
  });

  app.listen(3000, function () {
    console.log('Listening on port 3000');
  });

}(express, fs));
