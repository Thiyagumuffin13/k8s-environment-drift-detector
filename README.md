# Environment Drift Detector

A full-stack Kubernetes environment drift detection platform built with **.NET Web API** + **Angular 17** + **PostgreSQL**.

---

## Project Structure

```
k8s-environment-drift-detector/
├── backend/                        ← .NET Web API (ASP.NET Core 9)
│   ├── Controllers/                ← DriftController (CRUD API)
│   ├── Services/                   ← Business logic layer
│   ├── Repositories/               ← Data access layer
│   ├── Models/                     ← DriftDetail entity
│   ├── Data/                       ← AppDbContext (EF Core)
│   ├── Migrations/                 ← EF Core database migrations
│   ├── Properties/                 ← launchSettings.json
│   ├── Program.cs                  ← App startup + CORS + DB migration
│   ├── appsettings.json
│   ├── Dockerfile
│   └── EnvironmentDriftDetector.http  ← REST client test file
├── frontend/                       ← Angular 17 SPA
│   ├── src/app/
│   │   ├── pages/dashboard/        ← Dashboard with stat cards
│   │   ├── pages/drift-list/       ← CRUD table (Material)
│   │   └── shared/drift-form-dialog/ ← Create/Edit form dialog
│   ├── Dockerfile                  ← Multi-stage: Node + Nginx
│   └── nginx.conf
├── docker-compose.yml              ← Orchestrates all 3 services
├── EnvironmentDriftDetector.sln
└── .gitignore
```

Architecture:

```
Angular UI → .NET API → Repository → EF Core → PostgreSQL
```

---

## API Endpoints

| Method | Endpoint            | Description         |
|--------|---------------------|---------------------|
| GET    | `/api/drift`        | Get all drifts      |
| GET    | `/api/drift/{id}`   | Get drift by ID     |
| POST   | `/api/drift`        | Create new drift    |
| PUT    | `/api/drift/{id}`   | Update a drift      |
| DELETE | `/api/drift/{id}`   | Delete a drift      |

---

## Running the Application

### Option 1: Docker Compose (All Services)

```bash
docker compose up -d --build
```

| Service    | URL                              |
|------------|----------------------------------|
| Angular UI | http://localhost:4200             |
| .NET API   | http://localhost:5138             |
| Swagger    | http://localhost:5138/swagger     |
| PostgreSQL | localhost:5432                   |

### Option 2: Local Development

**Backend:**
```bash
cd backend
dotnet run
# API → http://localhost:5138
# Swagger → http://localhost:5138/swagger
```

**Frontend:**
```bash
cd frontend
npm install
npm start
# → http://localhost:4200
```

---

## Stopping

```bash
docker compose down
```

---

## Roadmap

- [x] .NET REST API with CRUD
- [x] PostgreSQL + EF Core with auto-migrations
- [x] Angular 17 Dashboard UI
- [x] Drift CRUD frontend with Material table
- [x] Docker Compose (3-service stack)
- [ ] Kubernetes cluster integration
- [ ] Real-time drift detection engine
- [ ] Alerting system

---

## Stack

- **.NET 9** — ASP.NET Core Web API
- **Angular 17** — Standalone components + Angular Material
- **PostgreSQL 15** — via EF Core + Npgsql
- **Docker** — Multi-container setup


## minikube setup with docker images 
minikube start
- **Use Minikube Docker** - eval $(minikube docker-env)
- **Build Docker backend Image** - docker build -t drift-backend:1.0 ./backend
- **Build Docker frontend Image** - docker build -t drift-frontend:1.0 ./frontend
- **Check Images** - minikube image ls/ docker images
- **Apply Kubernetes Backend YAML** - kubectl apply -f k8s/backend.yaml
- **Apply Kubernetes Frontend YAML** - kubectl apply -f k8s/frontend.yaml
- **Apply Kubernetes Database YAML** - kubectl apply -f k8s/postgresql.yaml
- **Open frontend in browser** - minikube service frontend
- **Check Pods with ip** - kubectl get pods -o wide 
- **Delete a pod** - kubectl delete pod <pod-name>
- **Access backend pod** -kubectl exec -it <backend-pod> -- sh
       - **Ping postgres** - `ping postgres` (you will get something like -PING postgres.default.svc.cluster.local (10.104.2.53). This demonstrates K8s built-in CoreDNS. It automatically resolves the service name `postgres` to its internal IP via `postgres.default.svc.cluster.local`, so you never need to hardcode IPs).


- **Port Forward** - kubectl port-forward drift-frontend-pod 4200:80
- **Port Forward** - kubectl port-forward backend-pod 5138:80
- **Watch Pods for replica(live removing and creation of pods)** - kubectl get pods --watch
- **Access postgres pod** -kubectl exec -it postgres-pod -- sh
- **Access postgres database**  psql -U postgres -d DriftDb
- **List tables** - \dt
- **Query table** - SELECT * FROM "DriftDetails";