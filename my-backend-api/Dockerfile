# Use official Node.js image
FROM node:16

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files (including JSON)
COPY . .

# Expose the port that the app will run on
EXPOSE 8080

# Command to run the app
CMD ["node", "index.js"]