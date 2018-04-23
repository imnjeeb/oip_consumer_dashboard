/**
 * Created by R10253 on 2/8/2018.
 */
$(function () {
    var clock = $('.clockcenter digiclock');
    //clock.fitText(1.3);

    function update() {
        clock.html(moment().format('H:mm:ss'));
    }

    setInterval(update, 1000);
});
var lastRequestedUrl='';
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
function isDomElem(obj) {
    if(obj instanceof HTMLCollection && obj.length) {
        for(var a = 0, len = obj.length; a < len; a++) {
            if(!checkInstance(obj[a])) {
                console.log(a);
                return false;
            }
        }
        return true;
    } else {
        return checkInstance(obj);
    }

    function checkInstance(elem) {
        if((elem instanceof jQuery && elem.length) || elem instanceof HTMLElement) {
            return true;
        }
        return false;
    }
}
function retrieveLastUrl() {
    return lastRequestedUrl;
}
function getApi(url, callback) {
    $.ajax({
        url: url,
        type: 'GET',
        beforeSend: function () {
        },
        complete: function () {
        },
        error: function(err) {
            console.log("request error",err);
            return callback(null,err);
        },
        success: function(d) {
        }
    }).done(function (d) {
        if (d.statusCode == 200) {
            lastRequestedUrl=url;
            callback({
                "Data":d
            },null);
        }
    });
}
function postApi(url, obj, callback) {
    $.ajax({
        url: url,
        type: 'POST',
        data: JSON.stringify(obj),
        contentType: 'application/json',
        dataType: 'json',
        beforeSend: function () {
        },
        complete: function () {
        },
        error: function(d) {
            console.log("request error",d);
        },
        success: function(d) {

        }
    }).done(function (d) {
        if (d.statusCode == 200) {
            callback({
                "Data":d
            });
        }
    });
}
function triggerLoader(trig) {
    var trigger=trig||false;
    var classLoader='.loading-corner';
    if (trigger) {
        if ($(classLoader).length) $(classLoader).addClass('lo-animate');
    } else {
        if ($(classLoader).length && $(classLoader).hasClass('lo-animate'))
            $(classLoader).removeClass('lo-animate');
    }
}
function randomString(length) {
    var chars = '0123456789abcdefghiklmnopqrstuvwxyz'.split('');

    if (! length) {
        length = Math.floor(Math.random() * chars.length);
    }
    var str = '';
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}
/**  avoid duplicates in array **/
function ArrObjNoDupe(a, id) {
    var temp = {};
    for (var i = 0; i < a.length; i++)
        temp[a[i][id]] = a[i];
    var r = [];
    for (var k in temp)
        r.push(temp[k]);
    return r;
}
function ArrNoDupe(a) {
    var temp = {};
    for (var i = 0; i < a.length; i++)
        temp[a[i]] = true;
    var r = [];
    for (var k in temp)
        r.push(k);
    return r;
}
function ArrObjRemoveDupe(a, b, id) {
    if ((typeof b=='undefined'||b.length==0)||
        (typeof a=='undefined'||a.length==0))
        return [];
    for (var i=0;i<a.length; i++) {
        var aObj=a[i];
        b=b.filter(function(el){
            return el[id]!==aObj[id];
        });
    }
    return b;
}
/* show duplicate */
/* src:https://stackoverflow.com/questions/36635822/comparing-two-arrays-of-objects-for-duplicate-objects-and-push-it-when-its-not*/
function ArrObjShowDupe(a, b, id) {
    if ((typeof b=='undefined'||b.length==0)||
        (typeof a=='undefined'||a.length==0))
        return [];
    for (var i=0;i<a.length; i++) {
        var aObj=a[i];
        var bObj;
        for (var j=0;j< b.length;j++) {
            var temp=b[j];
            if (aObj[id]==temp[id]) {
                bObj=temp;
                break;
            }
        }
        if (!bObj) {
            b.push(aObj);
            break;
        }
    }
    return b;
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return JSON.stringify(obj) === JSON.stringify({});
}

function compareStr(str1, str2) {
    var regex = new RegExp('^' + str1 + '$', 'i');
    return (regex.test(str2));
}
///////////////////////////////////////////////////////
// Function Update Record
//////////////////////////////////////////////////////
function deleteRecord(arr, key, cb) {
    if (arr.length==0||key.length==0) return;
    arr.some(function(val,i) {
        if (key==val.id) {
            arr.splice(i,1);
            cb(val);
            return true;
        }
    })
}
// key: id
function updateRecord(arr, key, new_obj, cb) {
    if (arr.length==0||key.length==0) return;
    var updated_obj = {};
    for (var i in arr) {
        if (key==arr[i].id) {
            for (var k in new_obj) {
                arr[i][k]=new_obj[k];
            }
            updated_obj=arr[i];
            cb(updated_obj);
            break;
        }
    }
}

function removeArrRecord(arr, id, cb) {
    if (arr.length==0||id.length==0) return;
    for (var i in arr) {
        if (id==arr[i]) {
            arr.splice(i,1);
            cb();
        }
    }
}
String.prototype.replaceAll=function(search,replacement){
    var target=this;
    return target.split(search).join(replacement);
};