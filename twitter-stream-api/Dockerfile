FROM node:erbium

# Copy app source
COPY . /src

# Set working directory to /src
WORKDIR /src

# Install app dependencies
RUN npm install

# Expose port to outside world
EXPOSE 3001

# Start command as per package.json
CMD ["npm", "start"]