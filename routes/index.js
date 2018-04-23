'use strict';

module.exports = function (app) {
  var deApp = 'OIP';
  var deTitle = deApp+' |  Dashboarding';
  var deBrought = ' - brought to you by OIP';

  var express = require('express');
  var request = require("request");
  var fs = require('fs');
  var moment = require("./moment.min");

  var authorized = "Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkZW1vQG1tdWRjLmNvbSIsInNjb3BlcyI6WyJDVVNUT01FUl9VU0VSIl0sInVzZXJJZCI6IjMzZDhjMmIwLTE2YjctMTFlOC1hY2UxLWU5MWY4ZjRkN2JhZiIsImVuYWJsZWQiOnRydWUsImlzUHVibGljIjpmYWxzZSwidGVuYW50SWQiOiJlY2QxYzgyMC1mYmY1LTExZTctYWUyZS1lOTFmOGY0ZDdiYWYiLCJjdXN0b21lcklkIjoiMzNiMDUzMjAtMTZiNy0xMWU4LWFjZTEtZTkxZjhmNGQ3YmFmIiwiaXNzIjoib2lwLnRtLmNvbS5teSIsImlhdCI6MTUyMzM3NDUxMCwiZXhwIjoxNTMyMzc0NTEwfQ.DI-X8dOr9ViIPA7zR2fQ7YAkfIESRCgUKU_3FpROnZZw-QPjzb61pf7dR_1GbTniagxCeKN1ybATEbldTYGXHw";
  var _header = {
    "Content-Type":"application/json",
    "Accept":"application/json",
    "Authorization":"Bearer a7c2b5d6-f9ca-380b-aacf-d590f05aecc3"
  };
  // configure
  const get_path = 'config/get.json';
  var getConfig = readJsonFileSync(get_path);
  const post_path = 'config/post.json';
  var postConfig = readJsonFileSync(post_path);

  /* primitive work for cache system */
  var timeDiff = 5; /* 10minutes */
  var cac_users = {updated_at:'',cache:[],hasPagination:true,lim:10};

  ////////////////////////////////////////////////////////////////////////////
  // Renders Page
  ////////////////////////////////////////////////////////////////////////////
  app.get('/', callbackGetPage);

  /* error handling*/
  app.use(logErrors);
  app.use(clientErrorHandler);
  app.use(errorHandler);

  ////////////////////////////////////////////////////////////////////////////
  // API
  ////////////////////////////////////////////////////////////////////////////
  app.get('/api/:type/:path?', callbackGetGenericApi);
  app.post('/api/:type/:path?', callbackGetGenericApi);

  ////////////////////////////////////////////////////////////////////////////
  // Call back functions
  ////////////////////////////////////////////////////////////////////////////
  var renders = {
    title: deTitle+deBrought,
    events: {},
    curr_host: ''
  };

  /* GET home page. */
  function callbackGetPage(req, res, next) {
    var r2 = clone(renders);
    r2.title = deTitle+deBrought;
    r2.curr_host = req.hostname;
    r2.logged_user=req.user;
    r2.lpath="./";
    res.render('index', r2);
  }

  /* GET login page. */
  function callbackGetLoginPage(req, res, next) {
    var path = req.path.split('/');
    path.shift();
    if(req.isAuthenticated()) {
      // Prepare some profile information
      // The reason we pick another object structure is to enable consistence
      // structure to pass to render files.
      req.user.myProfile = {};
      req.user.myProfile.id = req.user.id;
      req.user.myProfile.firstname = req.user.firstname;
      req.user.myProfile.lastname = req.user.lastname;
      req.user.myProfile.name = req.user.firstname+" "+req.user.lastname;
      req.user.myProfile.phone = req.user.phone;
      req.user.myProfile.username = req.user.myProfile.email = req.user.email;
      req.user.myProfile.dp = req.user.image_url;

      // Move to the next middleware
      res.redirect('/');
    }
    else {
      // Keep a record in Attempt Log?

      var msg = req.flash('loginMessage');
      // Redirect to login page
      res.render('login', {
        title: deApp+" | Log in"+deBrought,
        app: deApp,
        brought: deBrought,
        message: msg,
        level:(path.length>2)?'_L3':(path.length>1)?'_L2':'',
        lpath:(path.length>2)?'./../../../':(path.length>1)?'./../../':"./",
        prec:(path.length>2)?'../../../':(path.length>1)?'../../':''
      });
    }
  }
  function callbackGetLoginOtherPage(req, res, next) {
    var path = req.path.split('/');
    path.shift();
    if(req.isAuthenticated()) {
      // Prepare some profile information
      // The reason we pick another object structure is to enable consistence
      // structure to pass to render files.
      req.user.myProfile = {};
      req.user.myProfile.id = req.user.id;
      req.user.myProfile.firstname = req.user.firstname;
      req.user.myProfile.lastname = req.user.lastname;
      req.user.myProfile.name = req.user.firstname+" "+req.user.lastname;
      req.user.myProfile.phone = req.user.phone;
      req.user.myProfile.username = req.user.myProfile.email = req.user.email;
      req.user.myProfile.dp = req.user.image_url;

      // Move to the next middleware
      next();
    }
    else {
      req.flash('loginMessage', 'Your session has expired!');
      // Redirect to login page
      res.redirect('/login');
    }
  }
  /* get logout page */
  function callbackGetLogoutPage(req, res) {
    req.logout();
    req.session.destroy(function (err) {
      res.redirect('/login');
    });
  }
  /* POST login page. */
  function callbackPostLoginPage(req, res) {
    if (req.body.remember) {
      req.session.cookie.maxAge = 7* 24 * 60 * 60 * 1000; // Cookie expires after 7 days
    } else {
      req.session.cookie.expires = false;
    }
    res.redirect('/');
  }

  function compareStartTime(a,b) {
    if(a.start_time > b.start_time) return -1;
    if(a.start_time < b.start_time) return 1;
    return 0;
  }
  function compareEndTime(a,b) {
    if(a.end_time > b.end_time) return -1;
    if(a.end_time < b.end_time) return 1;
    return 0;
  }

  ////////////////////////////////////////////////////////////////////////////
  // API call
  ////////////////////////////////////////////////////////////////////////////
  /* get generic api */
  function callbackGetGenericApi(req, res) {
    var apiConfig=
        (req.method=="GET")?getConfig
            :(req.method=="POST")?postConfig:[];
    /* check first if services is not loaded */
    if (apiConfig.length==0)
      return res.json({statusCode: 404, message: "Missing API configuration", Data: []});

    ///api/:type/:path?
    /* decouple request api */
    var request = {
      type:req.params.type,
      t_type:req.params.type+"."+req.method,
      header:req.headers||{},
      body:req.body,
      path:req.params.path||"",
      query:req.query||{}
    };

    requestApi(apiConfig,request,function(d) {
      return res.json(d);
    })
  }

  function requestApi(apiConfig,req,callback) {
    var msg = "API Not Found";
    /* get all params */
    var t_proto=apiConfig.serverProtocol;
    var t_server = apiConfig.serverUrl;
    var t_type = req.t_type;
    var t_path = "";
    var t_id = req.path;
    var t_method = "";
    var typ_url = req.type.split('-');

    var header = {};
    var content = {};
    var withPathId=t_id.length>0;

    // https://stackoverflow.com/a/6700
    var querySize=Object.keys(req.query).length;

    /* primitive cache.. */
    var cache_ptr=
        (req.type=="users"||req.type=="cr.user")?cac_users:
                    {};
    var pageLim=('lim' in cache_ptr)?cache_ptr.lim||10:0;
    var hasPagination=('hasPagination' in cache_ptr)?cache_ptr.hasPagination||false:false;
    var needUpdates=false;
    var hasCacheFile="updated_at" in cache_ptr||false;  // just check any key inside object
    if (hasCacheFile) {
      var d = cache_ptr.updated_at;
      needUpdates=(!d)?true:
          (cache_ptr.cache.length==0)?true:
              (!moment(d).isValid())?true:
                  (moment(d).add(timeDiff, 'minutes').isBefore(/* now */))?true:!!(hasPagination);
    }
    /* primitive cache.. */

    /* here, we need to find the appropriate api */
    apiConfig.api.some(function(val) {
      // path, find val type
      if (t_type==val.type) {
        t_method = val.method;
        var ntarget=val.target;
        // for id only..
        if (val.expect_path&&withPathId) {
          ntarget=ntarget.replace(":id",t_id);
        }
        t_path = t_proto+"://"+t_server+"/"+ntarget;
        if (val.expect_param&&(querySize>0)) {
          var params = "?", i=0;
          for (var key in req.query) {
            if (i>0) params+="&";
            params+=key+"="+req.query[key];
            i++;
          }
          t_path+=params;
        }
        // headers
        //header = ("header" in val)?val.header:req.header;
        // body
        if ("POST"==t_method) {
          for (var i in req.body) {
            if (req.body[i] instanceof Object) req.body[i]=JSON.stringify(req.body[i]);
          }
          content=req.body;
        }
        return true;
      }
    });

    header = _header;
    header["X-Authorization"]=authorized;
    if (t_path.length > 0) {
      //console.log("path \n%s\nheader: %s",t_path,JSON.stringify(header));
      if ("POST"==t_method) {
        postRequestApi(t_path,header,content,function(d) {
          return callback(d);
        });
      } else
      if ("GET"==t_method) {
        getRequestApi(t_path,header, function(d) {
          return callback(d);
        });
      }
    } else {
      return callback({statusCode: 404, message: msg, Data: []});
    }
  }

  /* Error Handling */
  /* refer: https://expressjs.com/en/guide/error-handling.html */
  function logErrors (err, req, res, next) {
    //console.error('Error: \nStart\n',err.stack,'\nEnd');
    next(err)
  }
  function clientErrorHandler (err, req, res, next) {
    if (req.xhr) {
      console.log('Client Error Handler');
      res.status(500).send({ error: 'Something failed!' })
    } else {
      next(err)
    }
  }
  function errorHandler (err, req, res, next) {
    res.status(500);
    console.log('err 500', err);

    var r2 = clone(renders);
    r2.title = "Error";
    r2.message = "";
    r2.error = err;
    r2.evt_path = "";
    res.render('error', r2)
  }

  ////////////////////////////////////////////////////////////////////////////
  // request functions a.k.a api
  ////////////////////////////////////////////////////////////////////////////
  /**
   * To get data from api
   */
  function getRequestApi(path, header, callback) {
    // timeout at 50 seconds
    var timeout = 30*10000;
    var options = {
      url: path,
      timeout: timeout
    };
    if (Object.keys(header).length>0) {
      options.headers=header;
    }

    return request.get(options, function (error, response, body) {
      if (error) {
        console.log("error",error, new Date());
        var statusCode = 408;
        var errorMsg = error.toString();
        var errObj = {
          statusCode: error.bytesParsed || statusCode,
          message: error.code || "Timeout!",
          Data: []
        };
        if (typeof response == 'undefined') {
          return callback(errObj);
        }
        console.log(response);
        if (typeof response != 'undefined' && response.hasOwnProperty("statusCode")) statusCode=response.statusCode;
        if (typeof body != 'undefined' && body.hasOwnProperty("error")) errorMsg=body.error.toString();
        return callback({
          statusCode: statusCode || 400,
          message: errorMsg,
          Data: []
        });
      }
      body = IsJsonString(body)?JSON.parse(body):body;
      var status=!(body instanceof Object)?200:
          !("status" in body)?200:body.status;
      var b=(typeof body == 'undefined')?[]:
          !(body instanceof Object)?body.match(/>[A-Za-z0-9\- ]+</g):
              !("status" in body)||!("errorCode" in body)?body:[];
      var m=!(body instanceof Object)?"Timeout!!":
          !("message" in body)?"OK":body.message;

      return callback({
        statusCode: response.statusCode,
        status: status,
        message: m,
        Data: b
      });
    });
  }

  /* post data */
  function postRequestApi(path, header, body, callback) {
    var timeout = 30*10000;

    var options = {
      uri:path,
      headers: header
    };
    for (var i in body) {
      if (IsJsonString(body[i])) body[i]=JSON.parse(body[i]);
    }
    if (~header["Content-Type"].indexOf('application/x-www-form-urlencoded')) {
      options.form=body;
    } else {
      options.json=body;
    }

    var r=request.post(options, function(error, response, body) {
      if (error) {
        console.log("error",error, new Date());
        var statusCode = 408;
        var errorMsg = error.toString();
        var errObj = {
          statusCode: error.bytesParsed || statusCode,
          message: error.code || "Timeout!",
          Data: []
        };
        if (typeof response == 'undefined') {
          return callback(errObj);
        }
        console.log('resp: ',response);
        if (typeof response != 'undefined' && response.hasOwnProperty("statusCode")) statusCode=response.statusCode;
        if (typeof body != 'undefined' && body.hasOwnProperty("error")) errorMsg=body.error.toString();
        return callback({
          statusCode: statusCode || 400,
          message: errorMsg,
          Data: []
        });
      }

      body = IsJsonString(body)?JSON.parse(body):body;
      var status=!(body instanceof Object)?200:
          !("status" in body)?200:body.status;
      var b=(typeof body == 'undefined')?[]:
          !(body instanceof Object)?body.match(/>[A-Za-z0-9\- ]+</g):
              !("status" in body)||!("errorCode" in body)?body:[];
      var m=!(body instanceof Object)?"Timeout!!":
          !("message" in body)?"OK":body.message;

      return callback({
        statusCode: response.statusCode,
        status: status,
        message: m,
        Data: b
      });
    });
    return r;
  }

  ////////////////////////////////////////////////////////////////////////////
  // useful functions
  ////////////////////////////////////////////////////////////////////////////
  function readJsonFileSync(filepath, encoding){
    if (typeof (encoding) == 'undefined'){
      encoding = 'utf8';
    }
    var file = fs.readFileSync(filepath, encoding);
    return JSON.parse(file);
  }

  function isEmpty(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop))
        return false;
    }

    return true;
  }

  function spaceToUnderscore(str) {
    return str.split(' ').join('_');
  }

  function ArrObjNoDupe(a, id) {
    var temp = {};
    for (var i = 0; i < a.length; i++)
      temp[a[i][id]] = a[i];
    var r = [];
    for (var k in temp)
      r.push(temp[k]);
    return r;
  }

  /* clone object, not return as address pointer */
  function clone(obj) {
    var copy;
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;
    // Handle moment
    if (moment.isMoment(obj)) {
      copy = moment(obj);
      return copy;
    }
    // Handle Date
    if (obj instanceof Date) {
      copy = new Date();
      copy.setTime(obj.getTime());
      return copy;
    }
    // Handle Array
    if (Array.isArray(obj)) {
      copy = [];
      for (var i = 0, len = obj.length; i < len; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;
    }
    // Handle Object
    if (obj instanceof Object) {
      copy = {};
      for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
      }
      return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
  }

  function IsJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  String.prototype.replaceAll=function(search,replacement){
    var target=this;
    return target.split(search).join(replacement);
  }
};