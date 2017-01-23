var Tumblr = require('tumblr.js');
var ExifImage = require('exif').ExifImage;
var request = require('request');
var eachLimit = require('async/eachLimit');
var fs = require('fs');
var util = require('util');

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});

let mainWindow;

function logging() {
  data = util.format.apply({},arguments);
  console.log(data);
  log_file.write(data + '\n');
}

function findRateLimitHeader(headers, name) {
  return Object.keys(headers).filter(header => header.match('ratelimit') && header.match(name)).map(header => headers[header])[0];
}

var fs = require('fs');
var usernames = fs.readFileSync('blogs.dat').toString().split("\n");

var client = Tumblr.createClient({
  consumer_key: 'iXDtDNmr4jNfRDHst8uMLyIHUMgYIvNFeI7xLYUHoQf30bEA8m',
});

var photosInQueue = 0;

var checkPhoto = (username, main, alt) => {
  request({uri:main.url, encoding:null}, function(err,resp,body) {
    var errorHandler = () => {
      if (alt.size>=1) {
        var next = alt.shift();
        checkPhoto(username, next,alt);
      } else {
        logging("Warning, could not download " + main.url + " from post " + main.postUrl + " or any of it's alternatives");
        photosInQueue -= 1;
      }
    };
    if (err) {
      errorHandler();
    } else {
      new ExifImage({ image : body }, function (error, exifData) {
        photosInQueue -= 1;
        if (error) {
          // no exif data found or not a jpg
        } else {
          if (exifData.gps && (exifData.gps.GPSLatitude || exifData.gps.GPSLongitude)) {
            if (exifData.gps.GPSLatitude && exifData.gps.GPSLongitude) {
              var lat = exifData.gps.GPSLatitude[0] + exifData.gps.GPSLatitude[1]/60 + exifData.gps.GPSLatitude[2]/3600;
              if (exifData.gps.GPSLatitudeRef == 'S') {
                lat = -lat;
              }

              var lon = exifData.gps.GPSLongitude[0] + exifData.gps.GPSLongitude[1]/60 + exifData.gps.GPSLongitude[2]/3600;
              if (exifData.gps.GPSLongitudeRef == 'W') {
                lon = -lon;
              }
              logging("FOUND %s %j %j", username, main, exifData.gps);
            }
          }
        }
      });
    }
  });
}

var searchForPosts = (username, options, finishCallback) => {
  client.blogPosts(username, options, function(err, body, resp) {
    if (err) {
      if (!resp) {
        logging("Connection error, waiting 1 minute!");
        setTimeout(() => searchForPosts(username, options, finishCallback), 60000);
      } else if (resp.statusCode == 429) {
        logging(resp.headers);
        // just rate limiting, wait and retry
        const limit = findRateLimitHeader(resp.headers, '-limit');
        const remaining = findRateLimitHeader(resp.headers, '-remaining');
        const reset = findRateLimitHeader(resp.headers, '-reset');

        var timeout = 1000;
        if (remaining == 0) {
          timeout = reset;
        }
        logging("API limit exceeded, waiting " + timeout + "ms");
        setTimeout(() => searchForPosts(username, options, finishCallback), 1000);
      } else {
        // some other issue, return error to display handler
        logging("ERROR %s %j", username, err);
        finishCallback();
      }
    } else {
      // happy path
      if (options.offset===0) {
        logging("BLOG %s %j", username, body.blog);
      }
      logging("PRG %s %s", username, ((options.offset / body.blog.total_posts)*100).toFixed(3) + "%");

      body.posts.forEach(post => {
        if (post.photos && !post.reblogged_root_name && (!post.trail || post.trail.length == 0 || (post.trail.length == 1 && post.trail[0].blog.name == username))) {
          // search in uploaded photographs
          // we only check photos uploaded by the user themselves, which information is not readily available, so we check a few things:
          // if the reblogged_root_name is empty it is highly likely that this is an original post, however it is also sometimes null for hugely popular images
          // in this case we also check the trail to see if the topmost poster is the user or not. This might fail sometimes, in which case we will
          // believe that this photo is also uploaded by the user
          post.photos.forEach(photo => {
            var photoList = [];
            if (photo.alt_sizes) {
              photoList.push.apply(photoList, photo.alt_sizes);
            }
            if (photo.original_size) {
              photoList.push(photo.original_size);
            }
            if (photoList.length>=1) {
              photoList = photoList.sort((a,b) => a.width - b.width).map(a => ({url:a.url, postUrl: post.post_url, id:post.id}));
              var first = photoList.shift();
              photosInQueue += 1;
              checkPhoto(username, first, photoList);
            }
          });
        }
      });

      if (body.posts.length >= options.limit) {
        var newOptions = Object.assign({}, options);
        newOptions.offset += newOptions.limit;
        searchForPosts(username, newOptions,finishCallback);
      } else {
        logging("DONE %s", username);
        finishCallback();
      }
    }
  });
};

eachLimit(usernames, 10, function(u,cb) {
  logging("START %s", u);
  var options = {
    limit: 50,
    offset: 0,
    reblog_info: true,
    type: 'photo'
  }
  searchForPosts(u,options,cb);
}, function(err) {
  logging(err);
  logging("Fully finished!");
});
