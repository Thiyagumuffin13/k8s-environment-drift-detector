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
