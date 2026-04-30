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
