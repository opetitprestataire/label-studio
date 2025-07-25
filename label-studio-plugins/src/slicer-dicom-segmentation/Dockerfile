# Dockerfile for 3D Slicer Server
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    libglu1-mesa \
    libgomp1 \
    libpulse-mainloop-glib0 \
    libnss3 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libxss1 \
    xvfb \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install --no-cache-dir \
    websockets \
    asyncio \
    pydicom \
    numpy

# Download and install 3D Slicer
ENV SLICER_VERSION=5.2.2
RUN wget -q https://download.slicer.org/bitstream/63f9c9d7d7ce1c513514982d \
    -O /tmp/Slicer.tar.gz && \
    tar -xzf /tmp/Slicer.tar.gz -C /opt && \
    rm /tmp/Slicer.tar.gz && \
    mv /opt/Slicer* /opt/Slicer

# Set environment variables
ENV PATH="/opt/Slicer:${PATH}"
ENV DISPLAY=:99

# Copy server script
COPY slicer_server.py /app/slicer_server.py

# Create a startup script
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x24 &\n\
sleep 2\n\
/opt/Slicer/Slicer --no-main-window --python-script /app/slicer_server.py --host 0.0.0.0 --port 8080\n\
' > /app/start.sh && chmod +x /app/start.sh

WORKDIR /app

EXPOSE 8080

CMD ["/app/start.sh"]
