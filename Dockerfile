FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend.cpp ./backend.cpp
COPY public ./public

RUN g++ -std=c++17 -O2 -Wall backend.cpp -o smarttask_server

ENV PORT=10000
EXPOSE 10000

CMD ["./smarttask_server"]
