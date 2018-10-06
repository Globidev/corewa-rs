FROM node
RUN npm install -g parcel-bundler
RUN npm install -g typescript
RUN mkdir -p /app
WORKDIR /app
CMD parcel --no-autoinstall ./public/index.html
