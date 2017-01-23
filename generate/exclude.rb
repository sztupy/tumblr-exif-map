#!/usr/bin/env ruby

excl = {}

File.open("done.txt") do |done|
  done.each_line do |line|
    if line.strip =~ /DONE (.*)/
      excl[$1] = true
    end
  end
end

File.open("blogs_old.dat") do |inp|
  File.open("blogs.dat","wb+") do |out|
    inp.each_line do |input|
      out.print input unless excl[input.strip]
    end
  end
end
