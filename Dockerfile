# Use NodeJS LTS (As of writing, 2024-11-25, v22.11.0)
FROM node:lts

WORKDIR /services/engraph-worker

# Copy package files for next step
COPY tsconfig.json /services/engraph-worker/

COPY package.json /services/engraph-worker/

# Need schema.prisma file for postinstall client generation
COPY prisma /services/engraph-worker/prisma

# Todo: Run ci instead of install
# ci requires package files to exist previously
RUN ["npm", "install"]

# Copy source files
COPY src /services/engraph-worker/src

# Build the server files, output will be stored in dist
RUN ["npm", "run", "build"]

COPY dist/ /services/engraph-worker/dist/

CMD ["npm", "start"]
