# Environment Drift Detector

Environment Drift Detector is a prototype **.NET Web API** designed to detect configuration drift across Kubernetes environments (Dev, QA, Staging, Production).

The long-term goal of this project is to build a platform that can compare Kubernetes clusters and identify configuration differences such as:

- Deployment image versions
- Environment variables
- ConfigMaps
- Secrets
- Resource limits
- Infrastructure configuration

This repository currently contains a **basic .NET API with Docker support** that will serve as the foundation for the platform.

---

# Current Features

- .NET Web API
- Swagger API documentation
- Docker container support
- Docker Compose support
- Sample `/Greeting` API endpoint

Database integration and drift analysis will be added in later stages.

---

# Project Structure

```
controllers/
repositories/
services/
properties/
appsettings.json
appsettings.Development.json
docker-compose.yml
Dockerfile
EnvironmentDriftDetector.csproj
EnvironmentDriftDetector.sln
Program.cs
README.md
```

Architecture follows a simple layered pattern:

```
Controller → Service → Repository
```

---

# Running the Application with Docker

This project can be run locally using either:

- Docker CLI
- Docker Compose

---

# Option 1: Run using Docker CLI

## Build the Docker Image

```
docker build -t environment-drift-detector .
```

This command builds a Docker image using the `Dockerfile` in the current directory.

---

## Run the Container

```
docker run -d -p 5138:80 -e ASPNETCORE_ENVIRONMENT=Development environment-drift-detector
```

Explanation:

| Option                                  | Description                                      |
| --------------------------------------- | ------------------------------------------------ |
| `-d`                                    | Run container in background                      |
| `-p 5138:80`                            | Maps host port **5138** to container port **80** |
| `-e ASPNETCORE_ENVIRONMENT=Development` | Enables Swagger UI                               |
| `environment-drift-detector`            | Docker image name                                |

---

# Option 2: Run using Docker Compose (Recommended)

Run the application using:

```
docker compose up -d --build
```

Explanation:

| Option    | Description                            |
| --------- | -------------------------------------- |
| `up`      | Start the containers                   |
| `-d`      | Run in background                      |
| `--build` | Build the Docker image before starting |

To stop the application:

```
docker compose down
```

---

# Accessing the Application

Once the container is running, access the API at:

Swagger UI

```
http://localhost:5138/swagger/index.html
```

Example endpoint

```
http://localhost:5138/Greeting
```

---

# Docker Port Mapping

The ASP.NET application runs inside the container on port:

```
80
```

Docker maps this to your local machine:

```
Host Port → Container Port
5138      → 80
```

So the API becomes accessible at:

```
http://localhost:5138
```

---

# HTTPS Redirection Warning

You may see this warning in container logs:

```
Failed to determine the https port for redirect
```

This occurs because the application enables HTTPS redirection while the container exposes only HTTP.

For local development this warning is harmless.

---

# Future Roadmap

This project will evolve into a Kubernetes platform capable of:

- Kubernetes cluster integration
- Resource discovery via Kubernetes API
- Environment drift detection
- Cluster comparison
- Infrastructure insights
- Drift visualization dashboard

Planned modules:

```
Kubernetes Integration
Cluster Resource Scanner
Drift Analysis Engine
Drift Dashboard UI
Alerting System
```

---

# Author

Learning project focused on building a **Kubernetes environment drift detection platform** using:

- .NET
- Angular
- PostgreSQL
- Docker
- Kubernetes
