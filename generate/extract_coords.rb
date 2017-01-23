#!/usr/bin/env ruby

require 'json'

users = {}

ROUND_VALUE_KNOWN = 0.005
ROUND_VALUE_ANON  = 0.5

KNOWN = ['sztupy','papageorgeisback','hammertc']

def get_round_value(username)
  KNOWN.include?(username) ? ROUND_VALUE_KNOWN : ROUND_VALUE_ANON
end

File.open("debug.log") do |f|
  f.each_line do |line|
    if line.strip=~ /FOUND ([^ ]*) ({.*}) ({.*})/
      username = $1
      userData = JSON.parse($2)
      exifData = JSON.parse($3)

      lat = exifData['GPSLatitude'][0].to_f + exifData['GPSLatitude'][1].to_f/60 + exifData['GPSLatitude'][2].to_f/3600;
      if (exifData['GPSLatitudeRef'] == 'S') then
        lat = -lat;
      end

      lon = exifData['GPSLongitude'][0].to_f + exifData['GPSLongitude'][1].to_f/60 + exifData['GPSLongitude'][2].to_f/3600;
      if (exifData['GPSLongitudeRef'] == 'W') then
        lon = -lon;
      end

      date = ""
      if exifData['GPSDateStamp'] =~ /(\d{4}):(\d{2}):(\d{2})/
        date = "#{$1}-#{$2}-#{$3}"
        if exifData['GPSTimeStamp'] && exifData['GPSTimeStamp'].compact.length==3
          date += "T%02d-%02d-%02dZ" % exifData['GPSTimeStamp']
        else
          date += "T00:00:00Z"
        end
      end

      if lat != 0 && lon != 0
        users[username] ||= {
          name: username,
          points: []
        }
        users[username][:points] << {
          lat:'%0.3f' % [(lat/get_round_value(username)).round*get_round_value(username)],
          lon:'%0.3f' % [(lon/get_round_value(username)).round*get_round_value(username)],
          date: date,
          post_id: userData['id'],
          photo_url: userData['url'],
          other_images: [],
          amount: 0
        }
      end

    end
  end
end

puts 'var addressPoints = {'

KNOWN.each do |u|
  v = users[u]
  puts "\"#{u}\":["
  color = rand(8)
  data = {}
  v[:points].each do |p|
    key = "#{p[:lat]} #{p[:lon]}"
    if data[key]
      data[key][:other_images] << [p[:post_id],p[:photo_url],p[:date]]
    else
      data[key] = p
    end
    data[key][:amount] += 1
  end
  data.each_pair do |k,p|
    lat = p[:lat].to_f
    lon = p[:lon].to_f
    lat = lat + rand*get_round_value(u)/2 - get_round_value(u)/4
    lon = lon + rand*get_round_value(u)/2 - get_round_value(u)/4
    puts '[%0.5f,%0.5f,"%s","%s","%s",%d,%s,%d],' % [lat, lon, p[:post_id], p[:photo_url], p[:date], color, JSON.generate(p[:other_images]), p[:amount]]
  end
  puts "],"
end

data = {}

users.each_pair do |u,v|
  next if KNOWN.include?(u)
  color = rand(7)+1
  v[:points].each do |p|
    key = "#{p[:lat]} #{p[:lon]}"
    data[key] ||= p
    data[key][:amount] += 1
  end
end

color = 0
puts "\"anon\":["
round_value = get_round_value('anon')
data.each_pair do |k,p|
  1.upto(p[:amount]) do
    lat = p[:lat].to_f
    lon = p[:lon].to_f
    lat = lat + rand*round_value - round_value/2
    lon = lon + rand*round_value - round_value/2
    puts '[%0.5f,%0.5f,"%s","%s","%s",%d,%s,%d],' % [lat, lon, 0, 0, '', color, '[]', 1]
  end
end
puts "]"
puts '};'
