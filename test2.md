# TASK I: Kubernetes Deployment (k3s on EC2) — Step-by-Step Guide

## Overview

In this task, you deploy the HealthPulse Portal to a **real Kubernetes cluster** running on AWS EC2 instances. You'll use **k3s** — a lightweight, certified Kubernetes distribution — instead of the managed EKS service.

**What is k3s?**
- Full Kubernetes, certified conformant — same API, same `kubectl`, same manifests
- Single binary (~70MB), installs in 30 seconds
- Runs on small VMs (512MB RAM minimum)
- Built-in: load balancer (ServiceLB), ingress (Traefik), metrics-server, DNS (CoreDNS)
- Used in production for edge computing, IoT, CI/CD, and small clusters

**What you'll do:**
1. Provision 3 EC2 instances with Terraform (1 master + 2 workers)
2. Verify k3s installed and cluster is healthy
3. Copy kubeconfig to your local machine
4. Create Kubernetes namespaces
5. Create Artifactory pull secret
6. Deploy the application
7. Expose via Service
8. Configure auto-scaling (HPA)
9. Demonstrate rollback
10. Document: Docker vs Kubernetes comparison

---

## Prerequisites

Before starting Task I, ensure you have completed:

- [x] **Task H** — Docker image built and pushed to Artifactory
- [ ] AWS CLI configured with `healthpulse` profile
- [ ] SSH key pair exists (`~/.ssh/healthpulse-key` or your key)
- [ ] `kubectl` installed on your local machine (optional — you can use `k3s kubectl` on the master)
- [ ] Docker image in Artifactory: `<ARTIFACTORY_URL>/healthpulse-portal:<VERSION>`

> **Note:** The same IAM policy from Task G works for Task I — both create EC2 instances.

---

## Step 1: Provision the k3s Cluster with Terraform

### 1.1 — Understand the Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              AWS VPC (10.20.0.0/16)      │
                    │         Public Subnet (10.20.1.0/24)     │
                    │                                          │
YOU ──SSH/kubectl──→│  ┌──────────────────────────────────┐   │
                    │  │     Master (t3.small)             │   │
                    │  │     Elastic IP: x.x.x.x          │   │
                    │  │                                    │   │
                    │  │  k3s server:                       │   │
                    │  │  ├── API Server (:6443)            │   │
                    │  │  ├── Scheduler                     │   │
                    │  │  ├── Controller Manager            │   │
                    │  │  ├── etcd (embedded SQLite)        │   │
                    │  │  ├── CoreDNS                       │   │
                    │  │  ├── Traefik (ingress)             │   │
                    │  │  ├── ServiceLB (load balancer)     │   │
                    │  │  └── Metrics Server                │   │
                    │  └──────────────┬───────────────────┘   │
                    │                 │ k3s token              │
                    │          ┌──────┴──────┐                 │
                    │          ▼              ▼                 │
                    │  ┌──────────────┐ ┌──────────────┐      │
                    │  │ Worker 1     │ │ Worker 2     │      │
                    │  │ (t3.small)   │ │ (t3.small)   │      │
                    │  │              │ │              │      │
                    │  │ k3s agent:   │ │ k3s agent:   │      │
                    │  │ └─ kubelet   │ │ └─ kubelet   │      │
                    │  │ └─ kube-proxy│ │ └─ kube-proxy│      │
                    │  │ └─ containerd│ │ └─ containerd│      │
                    │  │              │ │              │      │
                    │  │ YOUR PODS    │ │ YOUR PODS    │      │
                    │  │ RUN HERE     │ │ RUN HERE     │      │
                    │  └──────────────┘ └──────────────┘      │
                    │                                          │
                    │  Security Group:                         │
                    │  ✅ 22   (SSH)       — your IP only      │
                    │  ✅ 80   (HTTP)      — open              │
                    │  ✅ 443  (HTTPS)     — open              │
                    │  ✅ 6443 (K8s API)   — your IP only      │
                    │  ✅ 30000-32767 (NodePort) — open        │
                    │  ✅ all (intra-cluster)    — self        │
                    └─────────────────────────────────────────┘
```

**How the cluster forms automatically:**

1. Terraform creates the master EC2 first
2. Master's bootstrap script (`scripts/master-deploy.sh`) installs k3s server with a random join token
3. Terraform then creates workers (they depend on master)
4. Each worker's bootstrap script (`scripts/worker-deploy.sh`) waits for master's API to be reachable (port 6443)
5. Workers install k3s agent using the same token → auto-join the cluster
6. Within ~3 minutes, all 3 nodes are Ready

### 1.2 — Understand the Bootstrap Scripts

The EC2 instances bootstrap themselves using two bash scripts in `terraform/k3s/scripts/`. Terraform reads these files and injects variables at plan/apply time using `templatefile()`.

**`scripts/master-deploy.sh`** — runs on the master node:
```bash
#!/bin/bash
set -e

apt-get update -y && apt-get upgrade -y

# Install k3s in server (master) mode
# ${k3s_token} is injected by Terraform — becomes the actual 32-char token
curl -sfL https://get.k3s.io | K3S_TOKEN="${k3s_token}" sh -s - server \
  --write-kubeconfig-mode 644 \
  --tls-san $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4) \
  --node-name k3s-master
```

| Flag | Purpose |
|------|---------|
| `K3S_TOKEN` | Shared secret — workers use this same token to join the cluster |
| `--write-kubeconfig-mode 644` | Makes kubeconfig readable without sudo |
| `--tls-san <public-ip>` | Adds the public IP to the API server's TLS certificate so you can run `kubectl` from your local machine |
| `--node-name k3s-master` | Human-readable name in `kubectl get nodes` |

**`scripts/worker-deploy.sh`** — runs on each worker node:
```bash
#!/bin/bash
set -e

apt-get update -y && apt-get upgrade -y

# Wait for master API to be ready before trying to join
MASTER_IP="${master_ip}"        # ← injected by Terraform (master's private IP)
until curl -sk https://$MASTER_IP:6443 > /dev/null 2>&1; do
  echo "Waiting for k3s master at $MASTER_IP..."
  sleep 10
done

# Install k3s in agent (worker) mode — auto-joins the master
curl -sfL https://get.k3s.io | K3S_URL="https://$MASTER_IP:6443" K3S_TOKEN="${k3s_token}" sh -s - agent \
  --node-name k3s-worker-${worker_index}   # ← 1 or 2, injected by Terraform
```

| Flag | Purpose |
|------|---------|
| `K3S_URL` | Tells the agent where the master's API server is |
| `K3S_TOKEN` | Same token as the master — proves this worker is authorized to join |
| `--node-name` | `k3s-worker-1` or `k3s-worker-2` |

**How `templatefile()` works in `main.tf`:**
```hcl
# Terraform reads the .sh file and replaces ${...} variables with real values
user_data = templatefile("${path.module}/scripts/master-deploy.sh", {
  k3s_token = random_password.k3s_token.result    # 32-char random string
})

user_data = templatefile("${path.module}/scripts/worker-deploy.sh", {
  k3s_token    = random_password.k3s_token.result  # same token as master
  master_ip    = aws_instance.master.private_ip    # e.g. "10.20.1.45"
  worker_index = count.index + 1                   # 1 or 2
})
```

> **Why external scripts instead of inline?** Inline heredocs inside Terraform are hard to read, hard to test, and prone to indentation bugs (we hit this in Task G). External `.sh` files are clean, editable, and can be reviewed independently.

**File structure:**
```
terraform/k3s/
├── main.tf                  ← references scripts via templatefile()
├── variables.tf
├── outputs.tf
├── dev.tfvars
└── scripts/
    ├── master-deploy.sh     ← k3s server install
    └── worker-deploy.sh     ← k3s agent join
```

### 1.3 — Initialize and Plan

```bash
cd terraform/k3s

terraform init
```

```bash
terraform plan \
  -var-file=dev.tfvars \
  -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)" \
  -var="ssh_allowed_cidr=$(curl -s ifconfig.me)/32"
```

Review the plan. You should see **11 resources**:
1. `random_password.k3s_token` — cluster join secret
2. `aws_vpc.k3s` — isolated network
3. `aws_internet_gateway.k3s` — internet access
4. `aws_subnet.public` — where instances live
5. `aws_route_table.public` + `aws_route_table_association.public` — routing
6. `aws_key_pair.k3s` — SSH key
7. `aws_security_group.k3s` — firewall rules
8. `aws_instance.master` — k3s server
9. `aws_instance.worker[0]` — k3s agent (worker 1)
10. `aws_instance.worker[1]` — k3s agent (worker 2)
11. `aws_eip.master` — static IP for master

### 1.4 — Apply

```bash
terraform apply \
  -var-file=dev.tfvars \
  -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)" \
  -var="ssh_allowed_cidr=$(curl -s ifconfig.me)/32"
```

Type `yes`. This takes **3–5 minutes** (3 EC2 instances + bootstrap scripts).

### 1.5 — Capture the Outputs

```bash
terraform output
```

```
master_public_ip  = "54.210.XX.XX"
master_private_ip = "10.20.1.XX"
worker_public_ips = ["54.211.XX.XX", "54.212.XX.XX"]
ssh_master        = "ssh -i ~/.ssh/healthpulse-key ubuntu@54.210.XX.XX"
kubectl_test      = "ssh -i ~/.ssh/healthpulse-key ubuntu@54.210.XX.XX 'sudo k3s kubectl get nodes'"
kubeconfig_command = "ssh -i ... 'sudo cat /etc/rancher/k3s/k3s.yaml' | sed ... > ~/.kube/healthpulse-config"
```

**Save the master IP — you'll use it for everything.**

---

## Step 2: Verify the Cluster

### 2.1 — SSH into the Master

```bash
ssh -i ~/.ssh/healthpulse-key ubuntu@<MASTER_IP>
```

### 2.2 — Check Node Status

```bash
# k3s includes kubectl — use it via k3s
sudo k3s kubectl get nodes
```

Expected output (wait 2–3 minutes after apply for workers to join):
```
NAME           STATUS   ROLES                  AGE   VERSION
k3s-master     Ready    control-plane,master   5m    v1.28.x+k3s1
k3s-worker-1   Ready    <none>                 3m    v1.28.x+k3s1
k3s-worker-2   Ready    <none>                 3m    v1.28.x+k3s1
```

> **If a worker shows NotReady:** Wait another minute — it may still be bootstrapping. If it stays NotReady for 5+ minutes, check its `user_data` log: `ssh ubuntu@<WORKER_IP>` then `sudo cat /var/log/cloud-init-output.log`

### 2.3 — Check System Pods

```bash
sudo k3s kubectl get pods -n kube-system
```

You should see:
```
NAME                                     READY   STATUS    RESTARTS   AGE
coredns-xxx                              1/1     Running   0          5m    ← DNS
local-path-provisioner-xxx               1/1     Running   0          5m    ← Storage
metrics-server-xxx                       1/1     Running   0          5m    ← For HPA
svclb-traefik-xxx                        2/2     Running   0          5m    ← Load balancer
traefik-xxx                              1/1     Running   0          5m    ← Ingress
```

> **Key insight:** k3s ships with all of these pre-installed. With EKS, you'd need to install metrics-server, ingress controller, and load balancer separately.

### 2.4 — Quick Cluster Test

```bash
# Run a test pod
sudo k3s kubectl run test --image=nginx --port=80

# Check it's running
sudo k3s kubectl get pods

# Delete the test pod
sudo k3s kubectl delete pod test
```

**Checkpoint:** You have a working 3-node Kubernetes cluster. Exit the SSH session for now.

```bash
exit
```

---

## Step 3: Copy Kubeconfig to Your Local Machine

This lets you run `kubectl` commands from your local machine instead of SSH-ing into the master every time.

### 3.1 — Fetch the Kubeconfig

```bash
# From your LOCAL machine (not the server)
ssh -i ~/.ssh/healthpulse-key ubuntu@<MASTER_IP> \
  "sudo cat /etc/rancher/k3s/k3s.yaml" | \
  sed "s/127.0.0.1/<MASTER_IP>/g" > ~/.kube/healthpulse-config
```

> **What this does:**
> - Reads the k3s kubeconfig from the master
> - Replaces `127.0.0.1` (localhost on the server) with the master's public IP
> - Saves it to your local `.kube/` directory

### 3.2 — Use the Kubeconfig

```bash
# Set the KUBECONFIG environment variable
export KUBECONFIG=~/.kube/healthpulse-config

# Test it — this runs kubectl from YOUR machine against the remote cluster
kubectl get nodes
```

You should see the same 3 nodes as before, but now from your local terminal.

> **Windows (Git Bash/PowerShell):**
> ```bash
> # Git Bash
> export KUBECONFIG=~/.kube/healthpulse-config
>
> # PowerShell
> $env:KUBECONFIG = "$HOME\.kube\healthpulse-config"
> ```

### 3.3 — Verify API Connectivity

```bash
kubectl cluster-info
# → Kubernetes control plane is running at https://<MASTER_IP>:6443
# → CoreDNS is running at ...

kubectl version
# → Client Version: v1.28.x
# → Server Version: v1.28.x+k3s1
```

> **If this fails:** Check that port 6443 is open in your security group to your IP. The Terraform config restricts 6443 to `ssh_allowed_cidr`.

---

## Step 4: Create Namespaces

```bash
kubectl apply -f kubernetes/namespace.yml
```

```bash
kubectl get namespaces
```

```
NAME                STATUS   AGE
default             Active   10m
kube-system         Active   10m
kube-public         Active   10m
kube-node-lease     Active   10m
healthpulse-dev     Active   5s    ← new
healthpulse-qa      Active   5s    ← new
healthpulse-prod    Active   5s    ← new
```

---

## Step 5: Create the Artifactory Pull Secret

Kubernetes needs credentials to pull your Docker image from Artifactory. Create a secret in each namespace:

```bash
# Create the secret in dev namespace
kubectl create secret docker-registry artifactory-pull-secret \
  --namespace=healthpulse-dev \
  --docker-server=<ARTIFACTORY_URL> \
  --docker-username=<YOUR_USERNAME> \
  --docker-password=<YOUR_PASSWORD_OR_TOKEN>

# Repeat for qa and prod
kubectl create secret docker-registry artifactory-pull-secret \
  --namespace=healthpulse-qa \
  --docker-server=<ARTIFACTORY_URL> \
  --docker-username=<YOUR_USERNAME> \
  --docker-password=<YOUR_PASSWORD_OR_TOKEN>

kubectl create secret docker-registry artifactory-pull-secret \
  --namespace=healthpulse-prod \
  --docker-server=<ARTIFACTORY_URL> \
  --docker-username=<YOUR_USERNAME> \
  --docker-password=<YOUR_PASSWORD_OR_TOKEN>
```

Verify:
```bash
kubectl get secrets -n healthpulse-dev
# → artifactory-pull-secret   kubernetes.io/dockerconfigjson   1
```

> **Why is this needed?** The `deployment.yml` references `imagePullSecrets: [name: artifactory-pull-secret]`. Without this, Kubernetes can't authenticate to Artifactory to pull your image.

---

## Step 6: Deploy the Application

### 6.1 — Review What Gets Created

The `kubernetes/deployment.yml` creates:
- A **Deployment** with 2 replicas (pods)
- Each pod runs your Docker image (Nginx + dist/)
- **Health probes:** liveness (is the app alive?) and readiness (can it serve traffic?)
- **Rolling update strategy:** zero-downtime deploys
- **Resource limits:** CPU and memory boundaries

The `kubernetes/service.yml` creates:
- A **LoadBalancer Service** that exposes port 80
- k3s's built-in ServiceLB assigns an external IP

### 6.2 — Deploy to Dev

Using the management script:
```bash
MASTER_IP=<MASTER_IP> \
NAMESPACE=healthpulse-dev \
VERSION=1.0.0 \
DOCKER_REGISTRY=<ARTIFACTORY_URL> \
./scripts/k8s-manage.sh deploy
```

Or manually with kubectl:
```bash
# Replace the image placeholder and apply
sed "s|ARTIFACTORY_REGISTRY/healthpulse-portal:VERSION_TAG|<ARTIFACTORY_URL>/healthpulse-portal:1.0.0|g; s|namespace: healthpulse-prod|namespace: healthpulse-dev|g" \
  kubernetes/deployment.yml | kubectl apply -f -

sed "s|namespace: healthpulse-prod|namespace: healthpulse-dev|g" \
  kubernetes/service.yml | kubectl apply -f -
```

### 6.3 — Watch the Rollout

```bash
# Watch pods come up in real-time
kubectl get pods -n healthpulse-dev -w

# Wait for the rollout to complete
kubectl rollout status deployment/healthpulse-portal -n healthpulse-dev --timeout=120s
```

Expected:
```
NAME                                  READY   STATUS    RESTARTS   AGE
healthpulse-portal-7f8c9d6b4-abc12   1/1     Running   0          30s
healthpulse-portal-7f8c9d6b4-def34   1/1     Running   0          30s
```

> **If pods show ImagePullBackOff:** The Artifactory secret is wrong or the image doesn't exist. Check:
> ```bash
> kubectl describe pod <POD_NAME> -n healthpulse-dev
> # Look at the Events section at the bottom
> ```

### 6.4 — Check the Service

```bash
kubectl get svc -n healthpulse-dev
```

```
NAME                  TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)        AGE
healthpulse-service   LoadBalancer   10.43.x.x     <NODE_IP>     80:3XXXX/TCP   1m
```

k3s's ServiceLB exposes the service on every node's IP. Access the app:

```bash
# From the master (or any node)
curl http://localhost/health

# From your local machine — use any node's public IP + the NodePort
curl http://<MASTER_IP>:<NODEPORT>
```

You can also check the exact port:
```bash
kubectl get svc healthpulse-service -n healthpulse-dev -o jsonpath='{.spec.ports[0].nodePort}'
```

Then open in your browser: `http://<MASTER_IP>:<NODEPORT>`

---

## Step 7: Deploy to Additional Namespaces

```bash
# Deploy to QA
MASTER_IP=<MASTER_IP> \
NAMESPACE=healthpulse-qa \
VERSION=1.0.0 \
DOCKER_REGISTRY=<ARTIFACTORY_URL> \
./scripts/k8s-manage.sh deploy

# Deploy to Prod
MASTER_IP=<MASTER_IP> \
NAMESPACE=healthpulse-prod \
VERSION=1.0.0 \
DOCKER_REGISTRY=<ARTIFACTORY_URL> \
./scripts/k8s-manage.sh deploy
```

Verify all environments:
```bash
kubectl get pods -A | grep healthpulse
```

```
healthpulse-dev    healthpulse-portal-xxx   1/1   Running   0   5m
healthpulse-dev    healthpulse-portal-xxx   1/1   Running   0   5m
healthpulse-qa     healthpulse-portal-xxx   1/1   Running   0   2m
healthpulse-qa     healthpulse-portal-xxx   1/1   Running   0   2m
healthpulse-prod   healthpulse-portal-xxx   1/1   Running   0   1m
healthpulse-prod   healthpulse-portal-xxx   1/1   Running   0   1m
```

> **Key insight:** 3 isolated environments running on the same 3-node cluster. With bare-metal (Task G), you'd need 3 separate servers configured identically. With Docker (Task H), you'd need 3 separate hosts running Docker. With Kubernetes, you use **namespaces** — one cluster, multiple environments, fully isolated.

---

## Step 8: Configure Auto-Scaling (HPA)

### 8.1 — What is HPA?

**HPA (Horizontal Pod Autoscaler)** automatically increases or decreases the number of pods (container copies) based on how busy they are.

**Simple analogy — a restaurant:**
- **Without HPA:** You always have 2 waiters, whether it's Monday lunch (empty) or Saturday night (packed). Customers wait, or you're overpaying idle staff.
- **With HPA:** You start with 2 waiters. When the restaurant fills up (CPU goes above 70%), a 3rd waiter automatically clocks in. When it's quiet again, the extra waiter goes home.

**What it looks like in your cluster:**

```
Normal load (2 pods):
┌─────────┐  ┌─────────┐
│  Pod 1  │  │  Pod 2  │   CPU: 30%  <- comfortably serving traffic
│  Nginx  │  │  Nginx  │
└─────────┘  └─────────┘

Traffic spike hits (HPA scales to 4 pods):
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Pod 1  │  │  Pod 2  │  │  Pod 3  │  │  Pod 4  │   CPU: 65% <- handling it
│  Nginx  │  │  Nginx  │  │  Nginx  │  │  Nginx  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
                                         ^ auto-created by HPA

Traffic drops (HPA scales back to 2 pods):
┌─────────┐  ┌─────────┐
│  Pod 1  │  │  Pod 2  │   CPU: 20%  <- extra pods removed
└─────────┘  └─────────┘
```

### 8.2 — Your HPA Configuration (`kubernetes/hpa.yml`)

```yaml
minReplicas: 2          # Never go below 2 pods (high availability)
maxReplicas: 6          # Never go above 6 pods (cost control)
metrics:
  - cpu: 70%            # Scale up when average CPU exceeds 70%
  - memory: 80%         # Scale up when average memory exceeds 80%
```

**The decision loop (runs every 15 seconds):**

```
1. Metrics-server collects CPU/memory from all pods
2. HPA checks: is average CPU > 70% or memory > 80%?
   |-- YES --> add pods (up to max 6)
   |-- NO  --> is average CPU < 70% AND traffic low?
               |-- YES --> remove pods (down to min 2)
               |-- NO  --> do nothing
```

### 8.3 — Use Case for HealthPulse

| Scenario | What Happens |
|----------|-------------|
| **Normal day** | 2 pods handle all patient portal traffic |
| **Monday 9 AM** | Patients check appointments — traffic spikes — HPA scales to 4 pods |
| **Lab results released** | Hundreds of patients check at once — HPA scales to 6 pods |
| **2 AM** | Nobody using the portal — HPA scales back to 2 pods |
| **Pod crashes** | Kubernetes restarts the pod AND HPA ensures minimum 2 are always running |

### 8.4 — Why This Matters (Compare with Task G and H)

| | Bare-Metal (Task G) | Docker (Task H) | Kubernetes + HPA (Task I) |
|--|-----|------|------|
| Traffic spike | Server overloaded, users wait | Manually start more containers | **Auto-scales in seconds** |
| Traffic drops | Server idle, still paying | Manually stop containers | **Auto-scales down, saves cost** |
| Pod/container dies | App is down until you fix it | App is down until you restart | **Auto-heals, no human needed** |

> **Bottom line:** HPA is Kubernetes doing what a human ops engineer would do (add servers when busy, remove when quiet) — but automatically, 24/7, in seconds instead of minutes.

### 8.5 — Apply HPA

```bash
# Apply HPA to dev
sed "s|namespace: healthpulse-prod|namespace: healthpulse-dev|g" \
  kubernetes/hpa.yml | kubectl apply -f -

# Check HPA status
kubectl get hpa -n healthpulse-dev
```

```
NAME              REFERENCE                       TARGETS           MINPODS   MAXPODS   REPLICAS   AGE
healthpulse-hpa   Deployment/healthpulse-portal   5%/70%, 12%/80%   2         6         2          30s
```

> **Note:** k3s ships with metrics-server pre-installed — HPA works out of the box with no extra setup.

### 8.6 — Test Auto-Scaling (Optional)

Generate some load to see HPA in action:

```bash
# In one terminal — watch HPA (it updates every 15 seconds)
kubectl get hpa -n healthpulse-dev -w

# In another terminal — generate load
kubectl run load-test --image=busybox -n healthpulse-dev --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://healthpulse-service/health; done"

# Watch the TARGETS column — CPU will climb, then REPLICAS will increase
# This may take 1-2 minutes

# After watching it scale up, delete the load generator
kubectl delete pod load-test -n healthpulse-dev

# Watch it scale back down (takes ~5 minutes — K8s is cautious about scaling down)
```

---

## Step 9: Demonstrate Rollback

### 9.1 — Deploy a "Bad" Version

Make a small visible change to the app, rebuild, push to Artifactory as version `2.0.0`, then deploy:

```bash
MASTER_IP=<MASTER_IP> \
NAMESPACE=healthpulse-dev \
VERSION=2.0.0 \
DOCKER_REGISTRY=<ARTIFACTORY_URL> \
./scripts/k8s-manage.sh deploy
```

Verify the new version is running:
```bash
kubectl get pods -n healthpulse-dev -o wide
```

### 9.2 — Rollback

```bash
# Undo the last deployment
kubectl rollout undo deployment/healthpulse-portal -n healthpulse-dev

# Watch the rollback
kubectl rollout status deployment/healthpulse-portal -n healthpulse-dev

# Verify we're back to the previous version
kubectl get pods -n healthpulse-dev -o jsonpath='{.items[0].spec.containers[0].image}'
# → should show version 1.0.0
```

### 9.3 — Check Rollout History

```bash
kubectl rollout history deployment/healthpulse-portal -n healthpulse-dev
```

```
REVISION  CHANGE-CAUSE
1         <none>         ← version 1.0.0
2         <none>         ← version 2.0.0
3         <none>         ← rollback to version 1.0.0
```

> **Compare with bare-metal rollback (Task G):** Ansible had to find the latest tar backup, extract it, reload Nginx. Kubernetes rollback is instant — it just switches which ReplicaSet is active.

---

## Step 10: Explore the Cluster

These commands help you understand what's running and why:

### Pods and Deployments

```bash
# Detailed pod info — shows node placement, IP, status
kubectl get pods -n healthpulse-dev -o wide

# Why is this pod on this node? How much CPU/memory is it using?
kubectl describe pod <POD_NAME> -n healthpulse-dev

# Pod logs (like docker logs)
kubectl logs <POD_NAME> -n healthpulse-dev

# Exec into a pod (like docker exec)
kubectl exec -it <POD_NAME> -n healthpulse-dev -- /bin/sh
```

### Services and Networking

```bash
# What services exist?
kubectl get svc -n healthpulse-dev

# What endpoints does the service route to?
kubectl get endpoints healthpulse-service -n healthpulse-dev
```

### Resource Usage

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage
kubectl top pods -n healthpulse-dev
```

### Cluster-Wide View

```bash
# Everything in all healthpulse namespaces
kubectl get all -n healthpulse-dev
kubectl get all -n healthpulse-qa
kubectl get all -n healthpulse-prod

# All pods across all namespaces
kubectl get pods -A
```

---

## Step 11: Document — Docker vs Kubernetes

Add a page to your MkDocs wiki comparing Task H (Docker) and Task I (Kubernetes):

```markdown
# Kubernetes Deployment — Lessons Learned

## Cluster Architecture
Describe the k3s cluster: master, workers, how they communicate.

## Docker vs Kubernetes Comparison

| Aspect | Docker (Task H) | Kubernetes (Task I) |
|--------|-----------------|---------------------|
| Where it runs | Your local machine | 3-node cluster on AWS |
| Scaling | Manual — start more containers | Automatic — HPA adds pods based on load |
| Self-healing | Container dies → stays dead | Pod dies → Kubernetes restarts it |
| Rolling updates | Stop old, start new (downtime) | Zero-downtime rolling update |
| Rollback | Pull old image, restart manually | `kubectl rollout undo` — instant |
| Load balancing | Not built-in | Built-in service load balancing |
| Multi-environment | Run on different ports/hosts | Namespaces on the same cluster |
| Networking | Port mapping (-p 8080:80) | Services, DNS, automatic discovery |
| Config management | Environment variables, files | ConfigMaps, Secrets |
| Storage | Docker volumes | Persistent Volume Claims |

## Key Kubernetes Concepts I Learned
- [ ] Pods, Deployments, ReplicaSets
- [ ] Services (ClusterIP, LoadBalancer, NodePort)
- [ ] Namespaces for environment isolation
- [ ] HPA for auto-scaling
- [ ] Rolling updates and rollback
- [ ] Resource requests and limits
- [ ] Health probes (liveness, readiness)
```

---

## Step 12: Cleanup

When you're done with Task I:

```bash
cd terraform/k3s
terraform destroy \
  -var-file=dev.tfvars \
  -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
```

This removes all 3 EC2 instances, the VPC, and all associated resources. **Cost drops to $0.**

---

## Acceptance Criteria Checklist

- [ ] 3-node k3s cluster operational (`kubectl get nodes` — all Ready)
- [ ] Application deployed to all three namespaces (dev, qa, prod)
- [ ] Service accessible via browser
- [ ] HPA configured (`kubectl get hpa` shows targets)
- [ ] Rollback demonstrated with `kubectl rollout undo`
- [ ] Can SSH into master and explain the cluster architecture
- [ ] Docker vs Kubernetes comparison documented in MkDocs wiki

### Instructor Verification

Be prepared to:
1. **Show `kubectl get nodes`** and explain what each node does (master vs worker)
2. **Show pods running** in all 3 namespaces and explain namespace isolation
3. **Deploy a new version** while the instructor watches — show zero-downtime
4. **Rollback** and prove the app reverted
5. **Explain HPA** — what triggers scaling, what are the thresholds
6. **Show `kubectl describe pod`** and explain what each section means
7. **Explain the difference:** Why Kubernetes over just running Docker?

---

## Troubleshooting

### Workers not joining the cluster

```bash
# SSH into the worker
ssh -i ~/.ssh/healthpulse-key ubuntu@<WORKER_IP>

# Check the bootstrap log
sudo cat /var/log/cloud-init-output.log

# Check if k3s agent is running
sudo systemctl status k3s-agent

# Check k3s agent logs
sudo journalctl -u k3s-agent -f
```

Common causes:
- Master not ready yet (worker tried to join too early) → restart k3s-agent: `sudo systemctl restart k3s-agent`
- Security group blocks port 6443 between nodes → check intra-cluster rule

### Pods stuck in ImagePullBackOff

```bash
kubectl describe pod <POD_NAME> -n healthpulse-dev
# Look at Events section

# Likely causes:
# 1. Image doesn't exist in Artifactory → check the tag
# 2. Pull secret is wrong → recreate it
# 3. Artifactory URL is wrong → check the image reference
```

### Pods stuck in CrashLoopBackOff

```bash
# Check pod logs for the error
kubectl logs <POD_NAME> -n healthpulse-dev

# If the pod keeps restarting, check the previous container's logs
kubectl logs <POD_NAME> -n healthpulse-dev --previous
```

### kubectl connection refused from local machine

```bash
# 1. Is the kubeconfig pointing to the right IP?
cat ~/.kube/healthpulse-config | grep server
# → should show https://<MASTER_IP>:6443

# 2. Is port 6443 open to your IP?
# Check your IP hasn't changed: curl ifconfig.me
# If it changed, re-apply Terraform with the new IP

# 3. Is k3s running on the master?
ssh -i ~/.ssh/healthpulse-key ubuntu@<MASTER_IP>
sudo systemctl status k3s
```

### Service not accessible from browser

```bash
# Check the service
kubectl get svc -n healthpulse-dev

# Check endpoints (are pods connected to the service?)
kubectl get endpoints healthpulse-service -n healthpulse-dev
# Should show pod IPs, not <none>

# Check NodePort
kubectl get svc healthpulse-service -n healthpulse-dev -o jsonpath='{.spec.ports[0].nodePort}'

# Test from inside the cluster (SSH into master)
sudo k3s kubectl run curl-test --image=curlimages/curl --restart=Never -- \
  curl -s http://healthpulse-service.healthpulse-dev.svc.cluster.local/health
sudo k3s kubectl logs curl-test
sudo k3s kubectl delete pod curl-test
```

### HPA shows "unknown" targets

```bash
# Check if metrics-server is running
kubectl get pods -n kube-system | grep metrics

# Check if metrics are available
kubectl top pods -n healthpulse-dev
# If this fails, metrics-server may need a minute to collect data

# Check HPA events
kubectl describe hpa healthpulse-hpa -n healthpulse-dev
```

---

## Key Concepts Reference

| Concept | What It Means |
|---------|---------------|
| **Pod** | Smallest deployable unit in K8s. One or more containers that share networking and storage. |
| **Deployment** | Manages a set of identical pods. Handles rolling updates and rollbacks. |
| **ReplicaSet** | Ensures N pods are running. Created by Deployments. You rarely interact with it directly. |
| **Service** | Stable network endpoint for pods. Pods come and go, but the service IP stays the same. |
| **Namespace** | Virtual cluster within a cluster. Isolates resources (pods, services, secrets) between environments. |
| **HPA** | Horizontal Pod Autoscaler. Watches metrics and adjusts replica count automatically. |
| **k3s** | Lightweight Kubernetes distribution. Single binary, certified conformant, built-in extras. |
| **kubeconfig** | File that tells `kubectl` where the cluster is and how to authenticate. |
| **NodePort** | Exposes a service on every node's IP at a specific port (30000–32767). |
| **ServiceLB (Klipper)** | k3s's built-in load balancer. Makes `LoadBalancer` type services work without cloud provider integration. |
| **Rolling Update** | Gradually replaces old pods with new ones. At no point are zero pods running. |
| **Liveness Probe** | "Is this pod alive?" If it fails, Kubernetes kills and restarts the pod. |
| **Readiness Probe** | "Can this pod serve traffic?" If it fails, the pod is removed from the service until it recovers. |

---

## The Full Journey: Task G → H → I

```
Task G: Bare-Metal
├── Manually SCP files to Nginx server
├── Pain: no versioning, no rollback, config drift
└── Conclusion: "I need a better way to package my app"
         ↓
Task H: Docker
├── Build once, run anywhere (docker build → docker run)
├── Image has everything (Nginx + app baked in)
├── Solved: packaging, environment parity, cleanup
└── Conclusion: "Works great for one container... what about scaling?"
         ↓
Task I: Kubernetes (k3s)
├── Deploy containers across a cluster of machines
├── Auto-scaling, self-healing, rolling updates, rollback
├── Namespaces for multi-environment on one cluster
└── Conclusion: "This is how production works"
```

**You've now experienced the full deployment evolution that the industry went through over 15 years — in 3 tasks.**
