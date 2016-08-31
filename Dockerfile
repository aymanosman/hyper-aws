from mhart/alpine-node
run mkdir /app
add package.json /app/package.json
workdir /app
run npm install

add index.js /app/index.js

ENTRYPOINT ["node", "/app/index.js"]

