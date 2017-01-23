# Tumblr exif map

EXIF is a way to store metadata inside your image files. This includes things like what camera you used to take the pictures, what creative settings you applied on it, and nowadays it might also contain the location where the image was taken.

As this information might be considered sensitive data (especially if you have taken the picture at home or at work), most social sites, like Facebook, Twitter or Instagram remove these metadata from the uploaded images, so other people who check them will not find them. Tumblr however does no such thing.

## What does this mean?

This means we can potentially scrape and visualize blog posts and where they are taken in the world.

## How can I run this?

The application runs under node.JS. You need to create a `blogs.dat` file, containing the name of the blogs you are interested in, each on it's own line. Put this file into the `generate` directory then run `scrape.js`. This will download the mentioned blogs in a file called `debug.log`. After this run the `extract_coords.rb` ruby script to generate the marker information.

Note that the tool will by default cluster nearby images for each user, and also randomize the location by around ~200 meters in the output. The link to the original image will however still contain the proper location.

If you are only interested in figuring out if your posts contain leaking data, you can also check https://github.com/sztupy/tumblr-exif-check which is a more user friendly application.

## My picture is included and I don't want it to be there

Unfortunately due to the nature of Tumblr, neither deleting the posts, nor deleting your blog will make sure that your pictures are gone, as any reblog of your pictures will still contain the original image, with your location in them. The best thing you can do is to send a message to Tumblr's abuse staff telling them that you accidentally exposed confidential information, and ask them to remove all traces of the offending pictures from their site.

Also make sure that you disable location tracking inside your camera, or photo application you are using, so future photos you post will not end up exposing your location. Also always upload the image directly from Tumblr's site and not through a 3rd party site or application, as they can still inject geolocation based on their own metadata into the picture.

If possible try to also spread the word, so maybe Tumblr will eventually fix the problem by either automatically removing the GPS data from uploaded pictures, or at least add more visibility to the fact that an uploaded picture might contain geolocation data.

# License

Copyright (c) Zsolt Sz. Sztupák <mail@sztupy.hu>

The application is licensed under the AGPL 3.0.
