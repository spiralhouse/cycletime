# Multi-stage Dockerfile for CycleTime development environment
# Base: Node.js 20 with JVM 21 support for Kotlin/JVM development
# Optimized for layer caching and minimal image size

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm

ARG JAVA_VERSION=21
ARG TIMEZONE=UTC
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=1000

# Set timezone
ENV TZ=${TIMEZONE}
RUN ln -snf /usr/share/zoneinfo/${TZ} /etc/localtime && echo ${TZ} > /etc/timezone

# Add Eclipse Temurin repository for OpenJDK 21
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && rm -rf /var/lib/apt/lists/*

# Install system dependencies
# Layer optimization: Group installations to reduce layer count
RUN apt-get update && apt-get install -y --no-install-recommends \
    # JVM runtime (Eclipse Temurin OpenJDK 21)
    temurin-21-jdk \
    # Build tools
    build-essential \
    # Development tools
    git \
    curl \
    wget \
    unzip \
    vim \
    nano \
    less \
    jq \
    # Process management
    procps \
    # Network tools (for debugging)
    dnsutils \
    iputils-ping \
    net-tools \
    # Shell
    bash-completion \
    && rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME environment variable (detect architecture)
RUN JAVA_HOME_PATH=$(dirname $(dirname $(readlink -f $(which java)))) && \
    echo "export JAVA_HOME=${JAVA_HOME_PATH}" >> /etc/profile && \
    echo "export PATH=\${JAVA_HOME}/bin:\${PATH}" >> /etc/profile

ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-$(dpkg --print-architecture)
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Verify Java installation
RUN java -version && javac -version

# Create non-root user (vscode) with sudo access
# This user matches VS Code Remote Containers conventions
RUN groupadd --gid ${USER_GID} ${USERNAME} \
    && useradd --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME} -s /bin/bash \
    && apt-get update \
    && apt-get install -y sudo \
    && echo "${USERNAME} ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} \
    && chmod 0440 /etc/sudoers.d/${USERNAME} \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory with proper ownership
RUN mkdir -p /workspace \
    && chown -R ${USERNAME}:${USERNAME} /workspace

# Set up home directory structure
RUN mkdir -p /home/${USERNAME}/.gradle \
    && mkdir -p /home/${USERNAME}/.m2 \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}

# Configure git safe directory (prevents "dubious ownership" errors)
RUN git config --system --add safe.directory /workspace

# Install Gradle wrapper dependencies
# This ensures the project's Gradle wrapper can run without issues
RUN mkdir -p /opt/gradle && chown -R ${USERNAME}:${USERNAME} /opt/gradle

# Set container environment variables
ENV DEVCONTAINER=true
ENV EDITOR=vim

# Switch to non-root user
USER ${USERNAME}
WORKDIR /workspace

# Install Claude Code CLI globally with specific version pinning
# Version pinning ensures reproducibility across container rebuilds
ARG CLAUDE_CODE_VERSION=2.0.32
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    && claude --version

# Configure npm cache for faster rebuilds
ENV NPM_CONFIG_CACHE=/home/${USERNAME}/.npm
RUN mkdir -p /home/${USERNAME}/.npm \
    && chown -R ${USERNAME}:${USERNAME} /home/${USERNAME}/.npm

# Verify installations as non-root user
RUN node --version \
    && npm --version \
    && java --version \
    && claude --version

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version && java --version && claude --version || exit 1

# Default command (overridden by VS Code)
CMD ["/bin/bash"]
