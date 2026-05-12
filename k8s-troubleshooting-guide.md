# Kubernetes Troubleshooting & Learning Scenarios

## 1) Kubectl get all
Running `kubectl get all` shows Services, Pods, ReplicaSets, Deployments, and more.

## Testing Scenarios

### Scenario 1: Deleting a Pod vs. Deleting a Service (The 502 Error)
1. **Setup:** Deploy all pods and services for the backend, frontend, and postgres.
2. **Action 1 (Delete Pod):** Run `kubectl delete pod <backend-pod-name>`.
   - **Observation:** If you check the frontend pod logs or network calls from your browser, you may temporarily see a `502 Bad Gateway` or `Connection Refused` error.
   - **Fix:** Running `kubectl apply -f backend.yaml` (or simply waiting if it's managed by a ReplicaSet) will recreate the pod and return a `200 OK`. You either need to check pod status or wait for the crashed pod to be recreated.
3. **Action 2 (Delete Service):** Run `kubectl delete service backend`.
   - **Observation:** You will start getting the same `502` issue.
   - **The Gotcha:** You run `kubectl apply -f service.yaml` to recreate the service, but the `502` issue persists!
   - **Why?** The frontend (Nginx) still tries to reach the *old* ClusterIP of the deleted backend service. Nginx resolves the backend service name to an IP during startup and caches it in memory forever. When the service was recreated, it received a new ClusterIP, but Nginx doesn't know about it.
   - **Fix:** You must delete the frontend pod (`kubectl delete pod <frontend-pod-name>`) so it gets recreated and Nginx fetches the *new* backend ClusterIP on startup.

### Scenario 2: Fake Image Name (ImagePullBackOff)
1. **Action:** Update the image name in your ReplicaSet or Deployment to a fake/incorrect name, then apply the file.
2. **Observation:** You will get an `ErrImagePull` or `ImagePullBackOff` error.
3. **Verify:** Use `kubectl get pods` or `kubectl describe pod <pod-name>` to see the exact error.
4. **Fix:** Rename the image to the correct name in your YAML file. Then reapply the YAML and delete the failing pod so Kubernetes recreates it with the fixed configuration.

### Scenario 3: Port Change Crash (Connection Refused)
1. **Action:** Update the `targetPort` in `service.yaml` for your backend or frontend to a wrong port and apply.
2. **Observation:** Network calls in the browser dev tools will fail with a `502`.
3. **Verify:**
   - Exec into the frontend pod: `kubectl exec -it <pod-name> -- sh`
   - Run: `curl -v http://backend/api/drift`
   - You will get "could not connect to server" & failure detected.
4. **Fix:** Correct the port in the YAML file and reapply `service.yaml`.

## Phase 2 Learning: Deployments & Scaling

### 1. Pod Crash Simulation
1. **Action:** Exec into the backend pod and simulate a crash.
   ```bash
   kubectl exec -it <backend-pod-name> -- sh 
   kill 1
   ```
2. **Observation:** In another terminal, watch the pods live using `kubectl get pods -w`.
3. **Result:** 👉 The Pod will restart automatically.

### 2. Delete Pod (Replica Recovery)
1. **Action:** Delete a running pod.
   ```bash
   kubectl delete pod <pod-name>
   ```
2. **Result:** A new pod is created automatically. The ReplicaSet (managed by the Deployment) ensures the desired number of replicas is always running.

### 3. Scale Up / Down
1. **Action:** Scale the backend deployment to 3 replicas.
   ```bash
   kubectl scale deployment backend-deployment --replicas=3
   ```
2. **Verify:** Check the running pods using `kubectl get pods`.
3. **Learn:** This demonstrates **Horizontal Scaling** and **Load Distribution** across multiple instances of your application.

### 4. Rolling Update (VERY IMPORTANT)
1. **Action:** Update the image to a non-existent version to simulate a bad deployment.
   ```bash
   kubectl set image deployment/backend-deployment backend=wrong-image
   ```
2. **Observation (Status Check):** Watch the pods with `kubectl get pods`, and check the official rollout status:
   ```bash
   kubectl rollout status deployment backend-deployment
   ```
   *The command will show the rollout is stuck because the new pod will fail with `ErrImagePull` or `ImagePullBackOff`.*
3. **Observation (History):** Check the deployment history to see previous and current revisions.
   ```bash
   kubectl rollout history deployment backend-deployment
   ```
4. **Fix (Rollback):** Undo the bad deployment to revert to the previous working revision.
   ```bash
   kubectl rollout undo deployment backend-deployment
   ```
5. **Deployment Strategy (Recreate vs. RollingUpdate):**
   - By default, deployments use the **RollingUpdate** strategy. This means it spins up the new version (new ReplicaSet and Pod) *before* destroying the old one. If the new image fails to pull (like our `wrong-image` test), the new pod crashes, but the **old pod stays running**. This ensures zero downtime.
   - If the strategy was set to **Recreate** (`strategy: type: Recreate`), it would destroy the existing pod *before* creating the new one, resulting in application downtime during the update (or complete outage if the new image is bad).
6. **Learn:** Zero downtime deployments, rollout status tracking, and the rollback mechanism.

### 5. Postgres Failure (IMPORTANT)
1. **Action:** Break the database by deleting its pod.
   ```bash
   kubectl delete pod postgres-pod
   ```
2. **Observation:** Data may be lost (if no volume is attached) and frontend network calls will start returning a `500 Internal Server Error`.
3. **Learn:** 👉 This is exactly WHY you need a **StatefulSet + PVC (PersistentVolumeClaim)** for databases instead of just a Pod. 
4. **Fix:** For a temporary fix, you can run `kubectl apply -f k8s/postgres.yaml` again. *However*, because the backend maintains a connection pool, it will still try to use the broken connection and fail. You must also restart the backend so it creates a fresh connection to the new database:
   ```bash
   kubectl rollout restart deployment backend-deployment
   ```

### 6. Network Debugging
1. **Action:** Execute into the frontend pod to test internal cluster connectivity.
   ```bash
   kubectl exec -it <frontend-pod-name> -- curl backend
   ```
2. **Observation:** If it fails, it usually indicates either a DNS issue or a Service issue.
3. **Failure Scenario A (Service Missing / DNS Issue):**
   - *Action:* Delete the backend service (`kubectl delete service backend`) and run the curl command again.
   - *Error output:* `curl: (6) Could not resolve host: backend (Timeout while contacting DNS servers) command terminated with exit code 6`
   - *Why:* CoreDNS cannot find any IP address registered for the name "backend" because the service doesn't exist.
4. **Failure Scenario B (Pods Missing / Connection Refused):**
   - *Action:* Recreate the service, then delete the backend deployment (`kubectl delete deployment backend-deployment`) and run the curl command.
   - *Error output:* `curl: (7) Failed to connect to backend port 80 after 1 ms: Could not connect to server command terminated with exit code 7`
   - *Why:* DNS successfully resolves "backend" to a Service ClusterIP, but there are no backend pods running behind that service to accept the traffic, so the connection is refused.

### 7. Node Failure Simulation (Advanced)
If using minikube, you can simulate a complete node failure and recovery:
1. **Action:** Stop and start the minikube cluster.
   ```bash
   minikube stop
   minikube start
   ```
2. **Observation:** Watch the pods using `kubectl get pods -w`. After the restart, you will see the frontend and backend pods go through various states:
   `Running` ➡️ `Error` ➡️ `CrashLoopBackOff` ➡️ finally `Running`.
3. **Learn:** This demonstrates **Cluster restart behavior** and **Pod rescheduling** as the cluster recovers from a full node outage.

## 8. Minikube Docker Environment Error
If you try to run `docker build -t drift-frontend:1.0 ./frontend` inside a Minikube environment without setting the docker-env, you will likely get an error:
> `ERROR: error during connect: Get "https://127.0.0.1:49918/_ping": ... actively refused it.`
**Why:** Your local terminal is trying to talk to Docker Desktop (which might not be running). You must point your terminal's Docker commands to the Minikube virtual machine's Docker engine by running `eval $(minikube docker-env)` first!

## 9. Kubernetes Probes (Readiness vs Liveness)
Do we need the same endpoint for both probes? **No! In fact, best practice is to split them:**
- **Readiness Probe (`/api/health/readiness`):** Checks if the app is fully ready for traffic (e.g., checks database connectivity). If it fails, Kubernetes **stops sending traffic** to the pod, but it **does not** restart it.
- **Liveness Probe (`/api/health/liveness`):** Checks if the app process is frozen or deadlock. (Usually just returns a 200 OK without checking the database). If it fails, Kubernetes **kills and restarts** the pod.
- **Frontend Probes (Nginx/Angular):** For a frontend application, the web server (Nginx) is generally simple and has no complex boot sequence or downstream dependencies (like a database) to wait for. If Nginx is running, it is both "Alive" and "Ready" instantly. Therefore, frontends typically share the exact same endpoint (e.g., `/health`) for both Liveness and Readiness probes in the real world. (If needed for testing, you can explicitly update the `nginx.conf` and deployment YAML to use separate paths like adding 
# Liveness endpoint for Kubernetes
  location /health/liveness {
    access_log off;
    add_header Content-Type text/plain;
    return 200 'OK';
  }

  # Readiness endpoint for Kubernetes
  location /health/readiness {
    access_log off;
    add_header Content-Type text/plain;
    return 200 'OK';
  }
 and then add them in `yaml file` to test it.)
- **Testing Gotcha (Nginx):** Single Page Applications (SPAs) like Angular use Nginx to catch all unknown paths (like `/wrong-path`) and return `index.html` with a `200 OK` in this part   # Serve Angular app - redirect all routes to index.html
  location / {
    try_files $uri $uri/ /index.html;
  }. This tricks Kubernetes into thinking the probe passed! To properly test an HTTP probe failure on a frontend, you must add an explicit Nginx location block (like `/force-500`) that returns a real error.

## Minikube Service & NodePort Access
Sometimes you need to access your services manually without `minikube service`:

1. Find the Minikube IP: `minikube ip`
2. Get the Service NodePorts: `kubectl get svc`
   - Example output: Backend port `[80:31138]`, Frontend port `[80:31200]`.
   - Here, `80` is the Cluster port (internal), and `31138`/`31200` are the NodePorts randomly assigned by Minikube (between 30000 - 32767).
3. Access manually in the browser:
   - Frontend: `http://<minikube-ip>:31200`
   - Backend API: `http://<minikube-ip>:31138/api/drift`
4. **Note for Docker Driver:** Because Docker creates a virtual network for Minikube, accessing the IP directly might not work on some operating systems (like Mac/Windows).
   - If it doesn't work, run: `minikube tunnel`
   - Or simply use the command: `minikube service frontend --url`
5. **Testing from Host:** You can also run `curl -v http://<minikube-ip>:31138/api/drift` from your local terminal.

---

## Q&A

**1) How does Kubernetes handle Pod Deletion?**
Kubernetes is a **Desired State Engine**. If it thinks:
`Desired state = 1 pod` but `Actual state = 0 pods` → It will automatically fix it by creating a new pod (if managed by a controller like a ReplicaSet).

**2) What is the hierarchy of Deletion?**
| Action | Result |
| :--- | :--- |
| Delete Pod | ReplicaSet recreates it |
| Delete ReplicaSet | Deployment recreates it |
| Delete Deployment | EVERYTHING is gone |

*Note: Deployment deletion is destructive to the entire hierarchy below it.*

**3) How do you call PostgreSQL from the backend container?**
The backend calls PostgreSQL using the hostname equal to the service name (e.g., `postgres`). This works via internal cluster DNS (Service-based networking).

**4) What is the best practice for Service Types?**
| Component | Service Type |
| :--- | :--- |
| Frontend | NodePort / Ingress |
| Backend | ClusterIP (internal only) |
| Database | ClusterIP (internal only) |

**5) How do you debug a CrashLoopBackOff?**
1. `kubectl describe pod <pod-name>` ← **FIRST** (Crash reasons are listed in the 'Events' section at the bottom).
2. `kubectl logs <pod-name>` ← **SECOND** (Application errors will be here, but logs may not exist if the container failed to start).

**6) How do you verify an Image Pull Error?**
Use `kubectl describe pod <pod-name>`. In the events, you will clearly see `ErrImagePull` and `ImagePullBackOff`.

**7) Logs vs. Describe: When to use which?**
| Command | Purpose |
| :--- | :--- |
| `logs` | Container stdout/stderr (Application code output) |
| `describe` | Events + Scheduling + Kubernetes lifecycle errors |

*Crucial Tip: If a pod completely fails to start, the logs may be EMPTY. You MUST use `kubectl describe pod` to find out why.*

---

## 10. Database Modernization (Secrets, ConfigMaps, Storage, StatefulSets)

### 1. Secrets (Secure Passwords)
- **What:** Stores sensitive data in Base64 format instead of plain text.
- **Why:** Prevents passwords from being exposed in YAML files or source control.
- **Verify:** `kubectl get secret` or `kubectl describe secret db-secret` (Note: Kubernetes intentionally hides the actual password on screen).
- **Backend Change:** Used `secretKeyRef` to inject `POSTGRES_PASSWORD` and `POSTGRES_USER` dynamically into the connection string.

### 2. ConfigMaps (Non-Sensitive Configs)
- **What:** Stores plain-text settings (like database names, hostnames).
- **Why:** Allows configuration changes in one central place without rewriting multiple deployment YAMLs.
- **Verify:** `kubectl get cm` or `kubectl describe cm backend-config`.
- **Backend Change:** Used `configMapKeyRef` to inject `DB_HOST`, `DB_NAME`, etc.

### 3. Storage: Persistent Volumes (PV/PVC)
- **What is the exact difference?**
  - **PV (Persistent Volume):** The actual physical piece of storage hardware provisioned by an Administrator (e.g., a 1GB slice of the Minikube hard drive).
  - **PVC (Persistent Volume Claim):** A request or "claim ticket" created by a Developer saying "My app needs a 1GB hard drive". Kubernetes automatically finds a matching available PV and "Binds" them together.
- **Why:** Pods are ephemeral (temporary). Without a PVC attached, if a database pod restarts, all tables and data are permanently destroyed. A PVC ensures data survives.
- **Verify:** Run `kubectl get pv` and `kubectl get pvc`. Look for the `STATUS` column to say `Bound` (which means the claim ticket successfully matched with the hard drive).
- **Testing Scenario (Verify Data Persistence in CMD):**
  1. *Save Data:* Inject test data directly into the DB: `kubectl exec -it postgres-0 -- psql -U postgres -d DriftDb -c "CREATE TABLE storage_test (id int); INSERT INTO storage_test VALUES (99);"`
  2. *Break:* Forcefully delete the database pod: `kubectl delete pod postgres-0`
  3. *Fix:* Because we are using a StatefulSet, Kubernetes instantly spins up a new `postgres-0` pod and re-attaches the exact same PVC to it.
  4. *Verify:* Wait for the pod to say `Running`, then check if your data survived the destruction: `kubectl exec -it postgres-0 -- psql -U postgres -d DriftDb -c "SELECT * FROM storage_test;"`
- **Testing Scenario 2 (Deep Dive into PV & PVC Binding):**
  1. *Clean Slate:* Delete both existing resources: `kubectl delete pvc postgres-pvc` and `kubectl delete pv postgres-pv`.
  2. *Break (The Unfulfilled Claim):* Open `k8s/storage.yaml` and temporarily comment out or delete the entire `PersistentVolume` section at the top, leaving ONLY the `PersistentVolumeClaim`. Apply it: `kubectl apply -f k8s/storage.yaml`
  3. *Observe the Pending State:* Run `kubectl get pvc`. The status will say **Pending**. Why? Because the Developer (PVC) asked for a 1Gi hard drive, but the Administrator (PV) hasn't plugged one into the cluster yet!
  4. *Fix (Provision the Drive):* Open `k8s/storage.yaml` and put the `PersistentVolume` section back in. Apply it: `kubectl apply -f k8s/storage.yaml`.
  5. *Observe the Magic:* Run `kubectl get pvc` and `kubectl get pv`. The status instantly changes to **Bound**! Kubernetes detected a new physical hard drive (PV) that matched the claim ticket (PVC) and permanently linked them together.

  **Note if unable to delete the pvc or pv then check for finalizers with the kubectl describe command and if Finalizers: `[kubernetes.io/pv-protection]` then remove the finalizer by editing the pvc or pv using this comment `kubectl patch pvc <pvc-name> -p '{"metadata":{"finalizers":null}}'` or `kubectl patch pv <pv-name> -p '{"metadata":{"finalizers":null}}'`**

### 4. StatefulSet (The Ultimate Database Controller)
- **What:** A special type of Deployment designed specifically for stateful apps (databases).
- **Why:** Unlike standard Deployments (which treat pods as identically disposable), StatefulSets give pods a strict, sticky identity (e.g., `postgres-0`). This guarantees the pod always reconnects to the exact same PVC when it restarts. It also provides auto-recreation (self-healing) if the database pod is manually deleted.
- **Dependency (Headless Service):** StatefulSets require a "Headless Service" (a service with `clusterIP: None`) in `services.yaml` to directly manage the network identity of the individual pods rather than randomly load balancing traffic.

---

## 11. Namespaces and Network Isolation (FQDN)

### 1. Namespaces (The Virtual Cluster)
- **What:** A way to logically divide a single Kubernetes cluster into multiple "virtual clusters" (e.g., `default`, `drift-detector`, `kube-system`).
- **Why:** Used to organize resources and isolate environments (like separating Development from Production on the same hardware).
- **Verify:** `kubectl get namespaces` and `kubectl get all -n <namespace-name>`.

### 2. Fully Qualified Domain Names (FQDN)
- **What:** The absolute, complete DNS address of a Kubernetes Service. The formula is: `<service-name>.<namespace>.svc.cluster.local`.
- **Why:** If two pods are in the **same namespace**, they can communicate using short names (e.g., `"postgres"`). If they are in **different namespaces**, the short name will fail (DNS lookup failure). They must use the FQDN to cross the namespace boundary.

### 3. Testing Scenario (Cross-Namespace DNS Break/Fix)
This scenario proves that Kubernetes isolates network resolution by namespace.
1. **The Setup:** Deploy the Database (`postgres`) in the `drift-detector` namespace, and the Backend in the `default` namespace.
2. **The Break:** Configure the Backend to connect using `DB_HOST: "postgres"`.
   - *Result:* The Backend Readiness probe fails. `kubectl logs` will show a connection error because it is searching for `"postgres"` inside the `default` namespace and cannot find it.
3. **The Fix:** Edit the Backend's ConfigMap to use the FQDN: `DB_HOST: "postgres.drift-detector.svc.cluster.local"`.
   - *Result:* Restart the Backend pod. It successfully traverses the namespace boundary, finds the database, and the health checks turn green!

---

## 12. Ingress & External Traffic

### 1. The `ingress.yaml` Anatomy
**`apiVersion: networking.k8s.io/v1`**
`apiVersion` tells Kubernetes which version of the API to use for this file. `networking.k8s.io/v1` is the stable version of the Ingress API. Think of it like saying "I am writing in English, version 1.0" so Kubernetes knows how to read it.

**`kind: Ingress`**
`kind` tells Kubernetes what TYPE of object this YAML file is describing. Just like a blueprint can describe a house OR a car, this blueprint describes an Ingress object (a traffic routing rule).

**`metadata:`**
- **`name: drift-detector-ingress`**: The unique identifier for this Ingress rule inside your cluster.
- **`namespace: drift-detector`**: Means this Ingress lives inside your `drift-detector` namespace — it only applies to services in that same namespace.

**`annotations:`**
Annotations are like sticky notes attached to the object. These two notes tell the Nginx controller:
- `nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"`: If Nginx cannot connect to your backend service within 30 seconds, give up and return a timeout error.
- `nginx.ingress.kubernetes.io/proxy-read-timeout: "30"`: If your backend is connected but takes more than 30 seconds to respond, give up. These prevent users from waiting forever if something is broken.

> **Important Annotation Warning:** Be very careful with the annotation `nginx.ingress.kubernetes.io/rewrite-target: /`. This strips the URL path before passing it to your backend. Example: A user visits `/api/health` — Nginx converts it to `/` before sending to your backend. Your backend then gets `/` and returns a `404 Not Found` because it was expecting `/api/health`! Your current `ingress.yaml` does NOT have this annotation, which is correct.

**`spec.ingressClassName: nginx`**
If your cluster has multiple Ingress Controllers installed (nginx, traefik, haproxy etc.), this line tells Kubernetes which one to use for this specific set of rules.

**`spec.rules: - host: drift-detector.local`**
This is the domain name this rule applies to. The Nginx controller will only process requests that come in with the Host header set to `drift-detector.local`. If you try to access the cluster by raw IP, the rule is ignored and you get a 404. This is why you add this line to your Windows hosts file: `C:\Windows\System32\drivers\etc\hosts` (`<minikube-ip> drift-detector.local`).

**`http.paths:`**
This is the heart of the Ingress. Three routes are defined:
- **Path `/` (Prefix)** -> **`frontend` (80)**: All requests go to Angular frontend first.
- **Path `/api` (Prefix)** -> **`backend` (80)**: Any URL starting with `/api` goes to C# backend.
- **Path `/swagger` (Prefix)** -> **`backend` (80)**: Swagger UI also served from backend.

### 2. Ingress Breakable & Fixable Scenarios

**Scenario 1: Wrong Path Type Causes 404**
- **BREAK:** Change `pathType: Prefix` to `pathType: Exact` for `/api` and apply the file.
- **OBSERVE:** Visiting `/api/drift` in your browser gives a 404 from Nginx. Why? Exact type only matches the path `/api` exactly — `/api/drift` does not match!
- **FIX:** Change `pathType` back to `Prefix` and reapply: `kubectl apply -f k8s/ingress.yaml`

**Scenario 2: Wrong Backend Service Name**
- **BREAK:** Change backend service name from "frontend" to "frontned" (typo) and apply.
- **OBSERVE:** Browser shows `503 Service Unavailable`. Nginx cannot find a service named "frontned" in the namespace.
- **FIX:** Fix the typo and reapply the ingress YAML. Use: `kubectl describe ingress drift-detector-ingress` to inspect the current rules.

**Scenario 3: Missing hosts Entry**
- **BREAK:** Remove the `drift-detector.local` line from your Windows hosts file.
- **OBSERVE:** Browser cannot resolve `drift-detector.local` — shows `DNS_PROBE_FINISHED_NXDOMAIN` error.
- **FIX:** Add the line back: `<minikube-ip> drift-detector.local` in `C:\Windows\System32\drivers\etc\hosts` (run Notepad as Administrator to edit).

### 2. `minikube tunnel` vs `minikube service`
- **`minikube service <name>`:**
  - **What it does:** It creates a temporary, direct port-forward to a specific NodePort service.
  - **Use Case:** Quick, dirty testing. It completely bypasses Ingress, DNS, and professional routing. It just gives you a random IP and Port (like `127.0.0.1:55212`).
- **`minikube tunnel`:**
  - **What it does:** It acts as a permanent network bridge between your computer (localhost) and the entire Kubernetes cluster network.
  - **Use Case:** Production-like testing. It allows your local computer's DNS (via the Windows `hosts` file) to hit the cluster's internal Ingress Controller on port 80, exactly how a real user would hit your website via a real domain name.
