var fs = require('fs');
var request = require('request');
var prompt = require('prompt');
var color = require('colorful');
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var ua = process.env.TERM_PROGRAM || process.platform;
var unconfig = function () {
  console.log('You don\' have a valid private key stored'.red);
  console.log('You may try:'.grey);
  console.log('  $ '.cyan + 'sekai key YOUR_PRIVATE_KEY');
  
}
var htmldecode = function (str) {
    str= str.replace(/&lt;/g, "<");
    str= str.replace(/&gt;/g, ">");
    str= str.replace(/&nbsp;/g, " ");
    //str= str.replace(/'/g, "\'");
    str= str.replace(/&quot;/g, "\"");
    str= str.replace(/<br>/g, "\n");
    str= str.replace(/&raquo;/g, "");
    str= str.replace(/&amp;/g, "");

  return str;
}

exports.run = function (command, target, soldiers) {
  if (command == 'login') {
    var schema = {
      properties: {
        email: {
          pattern: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
          message: 'You must enter a valid email address',
          required: true
        },
        password: {
          hidden: true
        }
      }
    };
    prompt.start();
    prompt.get(schema, function (err, result) {
      request.post({
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
            url:     'http://insekai.com/api/login',
            body:    "email=" + result.email + "&password=" + result.password
          }, function(error, response, body){
            var callback = JSON.parse(body);
            if (callback.status == 'good') {
              console.log('Successfully logged into INSEKAI.com, cheers!'.green);
              var json = {
                key: callback.key
              };
              json = JSON.stringify(json);
              fs.writeFile(home + '/.sekaiconfig', json, function (err) {
                if (err) throw err;
                console.log('Your private key is saved!'.green);
              });
            } else {
              console.log(callback.detail.red);
            }
      })
    });
  }


  if(command == 'key') {
    if (target) {

      var json = {
        key: target
      };
      json = JSON.stringify(json);

      fs.writeFile(home + '/.sekaiconfig', json, function (err) {
        if (err) throw err;
        console.log('Your private key is saved!'.green);
      });
    }
  } 

  if(command == 'say') {

      fs.readFile(home + '/.sekaiconfig', function (err, data) {
          if (err) { unconfig(); return; }
          var key = JSON.parse(data).key;  
          if (!target) {
            console.log('Come on, say something please!'.red);
            console.log('  $ '.cyan + 'sekai say word');
            return;
          }
          request.post({
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
            url:     'http://insekai.com/api/status/new',
            body:    "user_private_key=" + key + "&is_private=0&content=" + target + '&ua=' + ua
          }, function(error, response, body){
            if (error) throw error;
            var result = JSON.parse(body);
            if (result.status == 'good') {
              console.log('What you said is so damn right!'.green + ' see https://insekai.com/t/' + result.tokio_id);
            } else {
              console.log('Sorry, I met some issue'.red);
              console.log(body);
            }
          });
      })
      

  }

  if (command == 'get') {
    var page = soldiers || 1;
    if (target == 'public' || !target) {
      request('http://insekai.com/api/latest?limit=5&page=' + page, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var content = JSON.parse(body);
          for (var order in content) {
            console.log(content[order].nickname.yellow + ' ['.grey + content[order].tokio_id.grey + ']'.grey);
            console.log(htmldecode(content[order].content.cyan));
          }
        }
      })
    } else if (target == 'follow') {
      fs.readFile(home + '/.sekaiconfig', function (err, data) {
        if (err) { unconfig(); return; }
        var key = JSON.parse(data).key; 
        request('http://insekai.com/api/follow_timeline?limit=5&key=' + key + '&page=' + page , function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var content = JSON.parse(body);
            for (var order in content) {
              console.log(content[order].nickname.yellow + ' ['.grey + content[order].tokio_id.grey + ']'.grey);
              console.log(htmldecode(content[order].content.cyan));
            }
          }
        })
      })
      
    } else if (target == 'site') {
      request('http://insekai.com/api/site', function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var content = JSON.parse(body);
          console.log('状态数 '.cyan + color.green(content.tokios));
          console.log('会员数 '.cyan + color.green(content.users));
          console.log('在线会员 '.cyan + color.green(content.online));
          console.log('历史最高在线记录 '.cyan + color.green(content.max));
        }
      })
    } else {
      request('http://insekai.com/api/' + target +'/timeline?limit=5&page=' + page, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var content = JSON.parse(body);
          for (var order in content) {
            console.log(content[order].nickname.yellow + ' ['.grey + content[order].tokio_id.grey + ']'.grey);
            console.log(htmldecode(content[order].content.cyan));
          }
        }
      })
    }
  }

  if (command =='mentions' || command == 'm') {

    fs.readFile(home + '/.sekaiconfig', function (err, data) {
        if (err) { unconfig(); return; }
        var key = JSON.parse(data).key;
        request('http://insekai.com/api/get_notie?key=' + key, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              var result = JSON.parse(body);
              if (result.code == 0) {
                console.log(result.detail.green);
              } else if (result.code == 1) {
                var content = result.content;
                console.log('You have %d unread messages', result.count);
                for (var order in content) {
                  console.log(content[order].nickname.yellow + ' ['.grey + content[order].tokio_id.grey + ']'.grey);
                  console.log(htmldecode(content[order].content.cyan));
                }
              }
            }
        })
      })
    
  }

  if (command == 'reply') {

    fs.readFile(home + '/.sekaiconfig', function (err, data) {
        if (err) { unconfig(); return; }
        var key = JSON.parse(data).key;
        if (!target) {
          console.log('You haven\'t pointed out a topic to reply to'.red);
          return;
        } else {
          prompt.start();

          prompt.get(['reply'], function (err, result) {
            var tokio_id = target,
                content = result.reply;

            request.post({
              headers: {'content-type' : 'application/x-www-form-urlencoded'},
              url:     'http://insekai.com/api/add_comment',
              body:    "user_private_key=" + key + "&content=" + content + '&ua=' + ua + '&tokio_id=' + tokio_id
            }, function(error, response, body){
              var result = JSON.parse(body);
              if (result.status == 'good') {
                console.log('Successfully replied to No.%d, see http://insekai.com/t/%d'.green, tokio_id, result.new_tokio_id);
              } else {
                console.log(result.detail.red);
              }
            })
       
        })
        }

    
    })
  }

}
