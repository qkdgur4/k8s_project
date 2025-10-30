# Use a recent Alpine-based image for smaller size and better security
FROM node:20-alpine

WORKDIR /frontend

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy rest of the application source code
COPY . .

# Use CMD instead of ENTRYPOINT
CMD ["node", "--inspect=9229", "app.js"]
