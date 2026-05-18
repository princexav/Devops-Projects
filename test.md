# HealthPulse Portal — DevOps Capstone Project

## Scenario

**HealthPulse Inc.** is a healthcare technology startup that has built a patient portal as a **React/TypeScript single-page application**. The application allows patients to view appointments, lab results, medications, and communicate with their care team.

Currently, the development team **manually builds and deploys** the application by:
1. Running `npm run build` on a developer's laptop
2. SCP-ing the `dist/` folder to a single Nginx server
3. SSHing into the server and restarting Nginx

This process takes **45 minutes per deployment**, is error-prone, and has caused **3 production outages** in the last quarter from misconfigurations. There is **no testing in the pipeline**, **no code quality checks**, **no security scanning**, and **no monitoring**.

**HealthPulse Inc. has hired your DevOps team** to design and implement a complete CI/CD pipeline, multi-environment infrastructure, container orchestration, and observability platform on **AWS**.

---

## Application Details

| Item | Detail |
|------|--------|
| **App Name** | HealthPulse Portal |
| **Tech Stack** | React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Build Output** | Static files (`dist/`) served by Nginx |
| **Container** | Multi-stage Dockerfile (Node build → Nginx serve) |
| **Health Endpoint** | `GET /health` → `{"status":"healthy"}` |

---

## Repository Structure

```
healthpulse-capstone/
├── src/                        # Application source code
│   ├── components/ui/          # shadcn/ui components
│   ├── components/layout/      # Layout (Sidebar, Header)
│   ├── pages/                  # Login, Dashboard, Appointments, LabResults, etc.
│   ├── data/                   # Mock data
│   ├── types/                  # TypeScript types
│   ├── lib/                    # Utilities
│   └── test/                   # Unit tests
├── tests/e2e/                  # Playwright e2e tests
├── docs/                       # MkDocs documentation (docs-as-code)
│   ├── mkdocs.yml              # MkDocs configuration
│   ├── Dockerfile              # Multi-stage build (mkdocs → nginx)
│   ├── docker-compose.yml      # Prod (port 84) + dev (port 8084)
│   └── docs/                   # Markdown documentation pages
│       ├── index.md            # Home page
│       ├── architecture.md     # Architecture Decision Records
│       ├── environments.md     # Environment matrix
│       ├── runbooks.md         # Operational runbooks
│       └── pipeline.md         # CI/CD pipeline docs
├── docker/                     # Dockerfile + Nginx config
├── terraform/                  # AWS infrastructure as code
│   └── environments/           # dev.tfvars, uat.tfvars, prod.tfvars
├── ansible/                    # Deployment & Datadog playbooks
├── kubernetes/                 # K8s manifests (Deployment, Service, HPA)
├── monitoring/datadog/         # Datadog agent setup
├── pipelines/                  # Jenkins, GitLab CI, Azure DevOps pipelines
├── scripts/                    # Automation bash scripts
├── sonar-project.properties    # SonarQube config
└── PROJECT-BRIEF.md            # This document
```

---

## Tools & Technologies

| Category | Tool | Purpose |
|----------|------|---------|
| **CI/CD** | Jenkins OR GitLab CI OR Azure DevOps | Pipeline automation (student chooses one) |
| **Cloud** | AWS (EC2, VPC, Route 53) | Infrastructure hosting |
| **IaC** | Terraform | Infrastructure provisioning |
| **Config Mgmt** | Ansible Tower | Application deployment & rollback |
| **Containers** | Docker | Application containerization |
| **Orchestration** | Kubernetes (k3s on EC2) | Container orchestration |
| **Artifact Repo** | JFrog Artifactory | Docker images + build artifacts |
| **Code Quality** | SonarQube | Static analysis + code coverage |
| **Security** | Snyk | Dependency vulnerability scanning |
| **Monitoring** | Datadog | Infrastructure + application monitoring |
| **Version Control** | Git (Bitbucket/GitHub/GitLab) | Source code management |

---

## Tasks

### TASK A: Documentation Platform (Docs-as-Code)

Set up a **MkDocs Material** documentation site using the docs-as-code approach. Documentation lives in the Git repository as Markdown files and is built/served via Docker.

#### Why Docs-as-Code?
This is how top DevOps teams (k3s, Kubernetes, Terraform) manage documentation — Markdown files in Git, built by CI, deployed as a static site. You'll use the same multi-stage Docker pattern as the main application.

| Requirement | Detail |
|-------------|--------|
| Tool | MkDocs with Material theme |
| Container Port | `84` |
| Build | Multi-stage Docker (mkdocs build → nginx serve) |
| Dev Mode | `mkdocs serve` with live reload on port `8084` |
| Location | `docs/` directory in the deployment repo |

#### Required Documentation Pages

| Page | Content |
|------|---------|
| Home (`index.md`) | Project overview, team roster, quick links |
| Architecture Decisions (`architecture.md`) | ADR-001: CI/CD Platform choice, ADR-002: Container orchestration choice |
| Environment Matrix (`environments.md`) | Dev/UAT/QA/Prod table with IPs, URLs, instance sizes |
| Runbooks (`runbooks.md`) | Deploy, rollback, scale, incident response procedures |
| CI/CD Pipeline (`pipeline.md`) | Pipeline stages, tools, configuration notes |

#### Commands
```bash
# Build and serve docs (production)
cd docs && docker-compose up docs-prod
# → Docs at http://localhost:84

# Live reload dev mode
cd docs && docker-compose up docs-dev
# → Docs at http://localhost:8084 (auto-refreshes on file save)
```

**Acceptance Criteria:**
- [ ] MkDocs site builds via multi-stage Dockerfile
- [ ] Docs served on port 84 via docker-compose
- [ ] Live reload dev mode working on port 8084
- [ ] All 5 documentation pages created with real content
- [ ] `mkdocs.yml` and all Markdown files committed to Git
- [ ] Docs auto-build in CI pipeline on changes to `docs/` folder

---

### TASK B: Version Control & Code Security

#### B.1 — Repository Setup

Create **two repositories**:

| Repository | Purpose | Access |
|------------|---------|--------|
| `HealthPulse_App` | Application source code | Developers |
| `HealthPulse_Deployment` | IaC, Ansible, pipelines, scripts | DevOps team |

#### B.2 — Branching Strategy

Implement **GitFlow** in the App repository:

```
main ─────────────────────────────────────────►
  └── develop ─────────────────────────────────►
        ├── feature/login-page ──► (merge to develop)
        ├── feature/dashboard ───► (merge to develop)
        └── release/1.0.0 ───────► (merge to main + develop)
```

#### B.3 — Repository Security (Layer 1 & Layer 3)

Repository security follows a **defense-in-depth** approach with 3 layers. In this task you set up Layer 1 (local hooks) and Layer 3 (branch protection). Layer 2 (gitleaks in the CI pipeline) comes later in **Task F** once the pipeline exists.

```
Layer 1 (this task):  Local hooks      → fast feedback for developers
Layer 2 (Task F):     CI pipeline scan  → server-side safety net
Layer 3 (this task):  Branch protection → platform-enforced rules
```

**Layer 1: Local Git Hooks (pre-commit + pre-push)**

Install pre-commit and pre-push hooks so developers get early feedback when they accidentally commit secrets. Understand that developers *can* bypass these with `--no-verify` — that's why Layer 3 exists.

| Hook | Tool | Purpose |
|------|------|---------|
| pre-commit | `detect-secrets` | Scans staged changes for secrets using entropy + pattern analysis |
| pre-push | custom script | Warns on direct push to `main`/`develop` |

Use the provided `.pre-commit-config.yaml` and `scripts/setup-git-hooks.sh`.

```bash
# Step 1: Install the pre-commit framework
pip install pre-commit

# Step 2: Install hooks into the repo
pre-commit install

# Step 3: Test it — this should be BLOCKED
echo "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" >> test.txt
git add test.txt && git commit -m "test secret"
# Expected: detect-secrets blocks the commit

# Step 4: Clean up
git checkout -- test.txt

# Step 5: Test the pre-push hook
git checkout main
git push origin main
# Expected: Warning message about direct push to protected branch
```

> **Key lesson:** Run `git commit --no-verify -m "test"` and notice the hook is skipped entirely. This is why local hooks alone are NOT enough — you need Layer 3.

**Layer 3: Branch Protection Rules (platform-level — cannot be bypassed)**

Configure these in your Git hosting platform (GitHub / GitLab / Bitbucket). Unlike hooks, these are enforced by the server — no developer can skip them.

| Rule | Setting |
|------|---------|
| Require pull request before merging | `main` and `develop` |
| Require at least 1 approval | `main` and `develop` |
| Do not allow bypassing the above | Even admins must follow the rules |

> **Note:** The rule "Require CI status checks to pass" will be added in **Task F** once your pipeline is built. For now, configure the PR and approval requirements.

```bash
# Test it — this should be REJECTED by the platform
git checkout main
git commit --allow-empty -m "testing direct push"
git push origin main
# Expected: Rejected — branch protection requires a pull request
```

**Acceptance Criteria:**
- [ ] Both repos created with proper access controls
- [ ] GitFlow branching strategy demonstrated (main, develop, feature/*, release/*)
- [ ] SSH key authentication configured for repo access
- [ ] `pre-commit install` runs successfully and hooks are active
- [ ] Demonstrate: committing a fake AWS key is blocked by `detect-secrets`
- [ ] Demonstrate: `--no-verify` bypasses the hook (explain why this matters)
- [ ] Demonstrate: pre-push hook warns on direct push to `main`
- [ ] Branch protection rules configured on `main` and `develop` (screenshot required)
- [ ] PR requires at least 1 approval before merge
- [ ] Direct push to `main` is rejected by the platform (not just the hook)
- [ ] Document the security setup in your MkDocs wiki

---

### TASK C: Infrastructure Provisioning (Terraform)

Provision the following AWS infrastructure using the provided Terraform code. See `guides/AWS-CREDENTIALS-GUIDE.md` for IAM setup.

#### Infrastructure Overview

| Infrastructure | Terraform Directory | Purpose |
|---------------|-------------------|---------|
| Bare-Metal Server | `terraform/baremetal/` | EC2 + Nginx for Task G |
| k3s Cluster | `terraform/k3s/` | 1 master + 2 workers for Task I |

Each Terraform config creates its own VPC, subnets, and networking — no shared infrastructure required.

#### Bare-Metal Server (Task G)

```bash
cd terraform/baremetal
terraform init
terraform plan -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
terraform apply -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
```

Creates: VPC, public subnet, EC2 (t2.micro), Nginx, Elastic IP, security group.

#### k3s Kubernetes Cluster (Task I)

```bash
cd terraform/k3s
terraform init
terraform plan -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
terraform apply -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
```

Creates: VPC, public subnet, 1 master EC2 (t3.small), 2 worker EC2s (t3.small), k3s installed and joined.

#### DevOps Tools (provision separately or use existing)

| Tool | Instance Type | Purpose |
|------|---------------|---------|
| Jenkins | t2.xlarge | CI/CD server |
| SonarQube | t2.small | Code analysis |
| Ansible Tower | t2.2xlarge | Configuration management |
| JFrog Artifactory | t2.2xlarge | Artifact repository |

**Acceptance Criteria:**
- [ ] Bare-metal EC2 provisioned with Nginx running
- [ ] k3s cluster provisioned with 3 nodes (1 master + 2 workers)
- [ ] `kubectl get nodes` shows all nodes Ready
- [ ] Infrastructure tagged properly
- [ ] Can `terraform destroy` and re-create cleanly

---

### TASK D: Monitoring & Observability (Datadog)

Install and configure Datadog agents on **all servers**.

Use the provided `monitoring/datadog/datadog-agent-setup.yml` Ansible playbook.

| Requirement | Detail |
|-------------|--------|
| Infrastructure metrics | CPU, memory, disk, network |
| Container monitoring | Docker container metrics |
| Process monitoring | Running process visibility |
| Server tagging | `app:healthpulse`, `env:<environment>`, `team:<team-name>` |

**Acceptance Criteria:**
- [ ] Datadog agent running on all servers
- [ ] Infrastructure metrics visible in Datadog dashboard
- [ ] Containers monitored with docker integration
- [ ] Process-level monitoring enabled
- [ ] All servers tagged and filterable by environment

---

### TASK E: DNS & Domain

Register a team domain and configure DNS.

| Requirement | Detail |
|-------------|--------|
| Domain | e.g., `team-healthpulse.com` |
| DNS Provider | Route 53 (preferred), GoDaddy, etc. |
| Records | A/CNAME pointing to ALB |
| Environments | `dev.team-healthpulse.com`, `uat.team-healthpulse.com`, `team-healthpulse.com` |

**Acceptance Criteria:**
- [ ] Domain registered
- [ ] DNS records pointing to load balancers
- [ ] Application accessible via domain name

---

### TASK F: Continuous Integration Pipeline

Build a CI pipeline using your chosen tool (Jenkins, GitLab CI, or Azure DevOps). Reference pipeline files are provided in `pipelines/`.

#### Pipeline: `HealthPulse_Build`

```
Checkout → Install → Lint → Unit Tests → Secret Scan → SonarQube → Snyk → Build → Docker Push → Artifactory Upload
```

| Stage | Tool | Detail |
|-------|------|--------|
| Lint | ESLint | `npm run lint` |
| Unit Tests | Vitest | `npm run test:coverage` — produces coverage + JUnit XML |
| **Secret Scan** | **gitleaks** | **Layer 2 from Task B — scans git history for leaked secrets** |
| Code Analysis | SonarQube | Quality gate must pass |
| Security Scan | Snyk | Severity threshold: HIGH |
| Build | Vite | `npm run build` — produces `dist/` |
| Docker | Docker | Multi-stage build → push to Artifactory |
| Artifact | Artifactory | Versioned build upload |

> **Completing the security chain from Task B:** In Task B you set up Layer 1 (local hooks) and Layer 3 (branch protection). Now add Layer 2 — **gitleaks** runs in the pipeline so that even if a developer bypasses local hooks with `--no-verify`, the secret is caught here and the PR cannot merge. Also go back and update your Layer 3 branch protection rules to **require this CI pipeline to pass** before merging.

The gitleaks stage is already included in the provided pipeline files. Use the provided `.gitleaks.toml` for configuration.

| Notification | Channel |
|-------------|---------|
| Slack | `#healthpulse-builds` (success + failure) |
| Email | Team distribution list (failure only) |

| Trigger | Method |
|---------|--------|
| Automatic | Webhook on push to any branch |
| Versioning | `<build-number>-<git-short-hash>` |

**Acceptance Criteria:**
- [ ] Pipeline triggers automatically on code push
- [ ] All stages execute successfully
- [ ] **gitleaks stage catches a test secret and fails the build (Layer 2 complete)**
- [ ] **Branch protection updated to require CI status checks to pass (Layer 3 complete)**
- [ ] SonarQube quality gate enforced
- [ ] Snyk scan results archived
- [ ] Docker image pushed to Artifactory with unique version tag
- [ ] Build artifacts uploaded to Artifactory
- [ ] Slack + email notifications working
- [ ] Code coverage report published

---

### TASK G: Bare-Metal Deployment (Nginx on EC2)

Before containers, deploy the application the **traditional way** — built files served directly by Nginx on an EC2 instance. This teaches what containers replace and why they exist.

#### G.1 — Provision the Server (Terraform)

Use the provided `terraform/baremetal/` configuration to create a VPC, subnet, and EC2 instance with Nginx pre-installed. See `guides/AWS-CREDENTIALS-GUIDE.md` for IAM setup.

```bash
cd terraform/baremetal
terraform init
terraform plan -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
terraform apply -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
```

What Terraform creates:
| Resource | Detail |
|----------|--------|
| VPC + Subnet | Isolated network with internet gateway and route table |
| EC2 Instance | Ubuntu 22.04, t2.micro |
| Nginx | Installed and configured via user_data bootstrap |
| Security Group | Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| Elastic IP | Static public IP |
| Nginx Config | SPA fallback, gzip, security headers, `/health` endpoint |
| Deploy Path | `/var/www/healthpulse` |

> **Detailed walkthrough:** See `guides/TASK-G-GUIDE.md` for step-by-step instructions.

#### G.2 — Deploy via Ansible

Use the provided `ansible/baremetal-deploy.yml` playbook. The pipeline triggers Ansible Tower, which:

```
1. Backs up current deployment     → /var/www/healthpulse-backups/
2. Downloads dist.tar.gz           → from Artifactory
3. Extracts to /var/www/healthpulse → replaces old files
4. Reloads Nginx                   → zero-downtime reload
5. Runs health check               → GET /health must return 200
6. On failure: auto-rollback       → restores from backup
```

**Manual deploy (for learning):**
```bash
# SSH into the server
ssh -i ~/.ssh/healthpulse-key.pem ubuntu@<ELASTIC_IP>

# On the server — this is what Ansible automates
cd /var/www/healthpulse
# Copy dist/ files here
sudo systemctl reload nginx

# Verify
curl http://localhost/health
# → {"status":"healthy","deploy":"baremetal"}
```

**Automated deploy (via Ansible):**
```bash
ansible-playbook ansible/baremetal-deploy.yml \
  -i ansible/inventory/hosts.yml \
  -e "environment=dev version=42-abc1234"
```

**Rollback:**
```bash
ansible-playbook ansible/baremetal-deploy.yml \
  -i ansible/inventory/hosts.yml \
  -e "environment=dev rollback=true"
```

#### G.3 — Pipeline Integration

The bare-metal deploy stage is already included in the provided pipeline files. It runs **before** the Docker/container deploy stages:

```
CI Pipeline: ... → Build → Upload to Artifactory → Deploy Bare-Metal → Docker Build → Deploy Container
```

This means both deployment methods use the **same build artifact** from the same pipeline.

#### G.4 — Feel the Pain

After deploying bare-metal, answer these questions in your MkDocs wiki:

| Question | Think About |
|----------|-------------|
| What happens if you need Node 20 on one server and Node 18 on another? | Dependency conflicts |
| What if Nginx config differs between dev and prod? | Configuration drift |
| How do you ensure dev, UAT, and prod are identical? | Environment parity |
| What if a deploy fails halfway — Nginx has half old, half new files? | Atomic deployments |
| How long does it take to set up a brand new server from scratch? | Reproducibility |

> **Key insight:** All of these problems are solved by containers (Task H). You'll deploy the same app in Docker next and see the difference firsthand.

**Acceptance Criteria:**
- [ ] EC2 instance provisioned via Terraform with Nginx running
- [ ] Application accessible at `http://<ELASTIC_IP>`
- [ ] Health check returns 200 at `/health`
- [ ] Deploy new version via Ansible playbook
- [ ] Rollback to previous version via Ansible playbook
- [ ] Pipeline triggers bare-metal deployment on push to `develop`
- [ ] Pain points documented in MkDocs wiki
- [ ] SSH into the server and explain what Nginx is serving and from where

---

### TASK H: Containerization (Docker)

Now take the **same application** you deployed as bare files and package it into a Docker container. Run it locally first, then push the image to Artifactory.

#### H.1 — Understand the Dockerfile

Review the provided `docker/Dockerfile`:

```
Stage 1: Node 20 Alpine
  ├── corepack enable (activate pnpm)
  ├── pnpm install --frozen-lockfile
  └── pnpm build → produces dist/

Stage 2: Nginx Alpine
  ├── Copy dist/ from Stage 1
  ├── Copy custom nginx.conf
  └── Expose port 80
```

**Key concept:** The entire build environment (Node, pnpm, dependencies) exists only in Stage 1 and is discarded. The final image is just Nginx + your static files — small, fast, and secure.

#### H.2 — Build and Run Locally

```bash
# Build the Docker image
docker build -t healthpulse-portal:local -f docker/Dockerfile .

# Run it locally
docker run -d --name healthpulse -p 8080:80 healthpulse-portal:local

# Test it
curl http://localhost:8080/health
# → {"status":"healthy"}

# Open in browser
# → http://localhost:8080

# Check the running container
docker ps
docker logs healthpulse

# Stop and remove
docker stop healthpulse && docker rm healthpulse
```

#### H.3 — Use Docker Compose

```bash
# Start with docker-compose (uses docker/docker-compose.yml)
docker compose -f docker/docker-compose.yml up -d

# Check status
docker compose -f docker/docker-compose.yml ps

# View logs
docker compose -f docker/docker-compose.yml logs -f

# Tear down
docker compose -f docker/docker-compose.yml down
```

#### H.4 — Tag and Push to Artifactory

```bash
# Tag for Artifactory
docker tag healthpulse-portal:local <ARTIFACTORY_URL>/healthpulse-portal:1.0.0
docker tag healthpulse-portal:local <ARTIFACTORY_URL>/healthpulse-portal:latest

# Login to Artifactory
docker login <ARTIFACTORY_URL>

# Push
docker push <ARTIFACTORY_URL>/healthpulse-portal:1.0.0
docker push <ARTIFACTORY_URL>/healthpulse-portal:latest
```

> **Note:** The CI pipeline (Task F) does this automatically on every build. Here you're doing it manually to understand the process.

#### H.5 — Compare: Bare-Metal vs Container

After running both ways, document the comparison in your MkDocs wiki:

| Aspect | Bare-Metal (Task G) | Container (Task H) |
|--------|--------------------|--------------------|
| Server setup | Install Node, Nginx, configure manually | `docker run` — everything is inside the image |
| Build output | `dist/` folder copied to server | Docker image with Nginx + dist/ baked in |
| Deploy time | Minutes (download, extract, reload Nginx) | Seconds (pull image, start container) |
| Rollback | Restore from tar backup | `docker run previous-image:tag` |
| Environment parity | Hope configs match across servers | **Guaranteed** — same image everywhere |
| Dependencies | Installed on the OS — can conflict | Isolated inside the container |
| Reproducibility | "Works on my machine" problems | Same image runs everywhere |
| Cleanup | Files scattered across the OS | `docker rm` — clean removal |

**Acceptance Criteria:**
- [ ] Docker image builds successfully with `docker build`
- [ ] Application runs locally via `docker run` and is accessible at `http://localhost:8080`
- [ ] Health check returns 200 at `/health`
- [ ] Navigate through the app — all pages work (SPA routing via Nginx)
- [ ] Image pushed to Artifactory with version tag
- [ ] Bare-metal vs container comparison documented in MkDocs wiki
- [ ] Can explain: what is in the final Docker image? What was discarded?

---

### TASK I: Container Orchestration (Kubernetes with k3s)

Now take the Docker image from Task H and deploy it to a **real Kubernetes cluster**. You'll use **k3s** — a lightweight, production-grade Kubernetes distribution that runs on standard EC2 instances.

> **Why k3s instead of EKS?** EKS costs $73/month just for the control plane (even when idle). k3s runs on regular EC2 instances — same Kubernetes API, same `kubectl`, same manifests — at a fraction of the cost. Many production environments use k3s for edge computing and small clusters.

#### I.1 — Provision the k3s Cluster (Terraform)

Use the provided `terraform/k3s/` configuration:

```bash
cd terraform/k3s
terraform init
terraform plan -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
terraform apply -var-file=dev.tfvars -var="ssh_public_key=$(cat ~/.ssh/healthpulse-key.pub)"
```

What Terraform creates:
| Resource | Detail |
|----------|--------|
| VPC + Subnet | Isolated network with internet access |
| Master Node | t3.small — runs k3s server (API server, scheduler, controller, etcd) |
| Worker Node 1 | t3.small — runs k3s agent (workloads) |
| Worker Node 2 | t3.small — runs k3s agent (workloads) |
| Security Group | Ports 22, 80, 443, 6443 (K8s API), 10250 (kubelet) |

k3s is installed automatically via `user_data` bootstrap scripts. The workers auto-join the master using a shared token.

#### I.2 — Connect to the Cluster

```bash
# SSH into the master node
ssh -i ~/.ssh/healthpulse-key ubuntu@<MASTER_IP>

# k3s includes kubectl — verify the cluster
sudo k3s kubectl get nodes
# NAME           STATUS   ROLES                  AGE   VERSION
# k3s-master     Ready    control-plane,master   5m    v1.28.x+k3s1
# k3s-worker-1   Ready    <none>                 3m    v1.28.x+k3s1
# k3s-worker-2   Ready    <none>                 3m    v1.28.x+k3s1

# Copy kubeconfig to your local machine for remote access
sudo cat /etc/rancher/k3s/k3s.yaml
# Copy this file to your local ~/.kube/config
# Replace 127.0.0.1 with <MASTER_IP>
```

#### I.3 — Create Namespaces

```bash
kubectl apply -f kubernetes/namespace.yml
kubectl get namespaces
# → healthpulse-dev, healthpulse-qa, healthpulse-prod
```

#### I.4 — Deploy the Application

Use the provided `kubernetes/deployment.yml`:

```bash
# Deploy to dev
NAMESPACE=healthpulse-dev VERSION=1.0.0 DOCKER_REGISTRY=<ARTIFACTORY_URL> ./scripts/k8s-manage.sh deploy

# Deploy to prod
NAMESPACE=healthpulse-prod VERSION=1.0.0 DOCKER_REGISTRY=<ARTIFACTORY_URL> ./scripts/k8s-manage.sh deploy

# Check pods are running
kubectl get pods -n healthpulse-dev
kubectl get pods -n healthpulse-prod
```

#### I.5 — Expose the Service

Use `kubernetes/service.yml`. Since k3s includes a built-in load balancer (ServiceLB/Klipper), `LoadBalancer` type services work out of the box:

```bash
kubectl apply -f kubernetes/service.yml -n healthpulse-dev
kubectl get svc -n healthpulse-dev
# → EXTERNAL-IP will show the node IP, accessible on the assigned port
```

Access the app: `http://<NODE_IP>:<PORT>`

#### I.6 — Auto-Scaling (HPA)

Use `kubernetes/hpa.yml` — scales on CPU (70%) and memory (80%):

```bash
kubectl apply -f kubernetes/hpa.yml -n healthpulse-dev
kubectl get hpa -n healthpulse-dev
```

> **Note:** k3s includes the metrics-server by default, so HPA works without extra setup.

#### I.7 — Demonstrate Rollback

```bash
# Deploy a new version
NAMESPACE=healthpulse-dev VERSION=2.0.0 ./scripts/k8s-manage.sh deploy

# Something went wrong — rollback!
kubectl rollout undo deployment/healthpulse-portal -n healthpulse-dev

# Verify the rollback
kubectl rollout status deployment/healthpulse-portal -n healthpulse-dev
kubectl get pods -n healthpulse-dev
```

#### I.8 — The "Why Kubernetes?" Comparison

Document in your MkDocs wiki:

| Aspect | Docker (Task H) | Kubernetes (Task I) |
|--------|-----------------|---------------------|
| Scaling | Manual — `docker run` more containers | Automatic — HPA scales based on load |
| Self-healing | Container dies = manual restart | Pod dies = Kubernetes restarts it |
| Rolling updates | Stop old, start new (downtime) | Zero-downtime rolling update |
| Rollback | Pull old image, restart | `kubectl rollout undo` — instant |
| Load balancing | External (manual setup) | Built-in service load balancing |
| Multi-environment | Separate Docker hosts | Namespaces on same cluster |

**Acceptance Criteria:**
- [ ] 3-node k3s cluster operational (`kubectl get nodes` shows all Ready)
- [ ] Application deployed to all three namespaces
- [ ] Service accessible via browser
- [ ] HPA configured (`kubectl get hpa` shows targets)
- [ ] Rollback demonstrated with `kubectl rollout undo`
- [ ] Can SSH into master and explain the cluster architecture
- [ ] Docker vs Kubernetes comparison documented in MkDocs wiki

---

### TASK J: Automation Scripts

The following scripts are provided in `scripts/`. Students must:
1. Understand each script
2. Execute them successfully
3. Modify as needed for their environment

| Script | Purpose |
|--------|---------|
| `setup-git-hooks.sh` | Install git-secrets + branch protection |
| `docker-manage.sh` | Build, run, stop, restart, logs, status, clean |
| `k8s-manage.sh` | Create/delete cluster, deploy, rollback, scale, status |
| `server-health-check.sh` | Check health of all environments |

**Acceptance Criteria:**
- [ ] All scripts executed and demonstrated
- [ ] Students explain what each script does
- [ ] Scripts modified with team-specific values

---

## Grading Rubric

| Task | Weight | Points |
|------|--------|--------|
| A. Documentation Platform (Docs-as-Code) | 5% | 5 |
| B. Version Control & Security | 10% | 10 |
| C. Infrastructure (Terraform) | 10% | 10 |
| D. Monitoring (Datadog) | 10% | 10 |
| E. DNS & Domain | 5% | 5 |
| F. CI Pipeline | 15% | 15 |
| G. Bare-Metal Deployment (Nginx) | 10% | 10 |
| H. Container Deployment (Docker) | 10% | 10 |
| I. Kubernetes | 10% | 10 |
| J. Automation Scripts | 5% | 5 |
| **Deployment Comparison Doc (G vs H)** | **10%** | **10** |
| **TOTAL** | **100%** | **100** |

### Bonus Points (+10)
- Custom Datadog dashboard with all environments (+3)
- Prometheus + Grafana on K8s cluster (+4)
- Blue/Green or Canary deployment strategy (+3)

---

## Timeline

| Week | Tasks | Milestone |
|------|-------|-----------|
| 1 | A, B | Docs site running, repos created, Git security configured |
| 2 | C | Bare-metal EC2 provisioned, k3s cluster provisioned via Terraform |
| 3 | D, E | Monitoring agents installed, domain configured |
| 4 | F | Full CI pipeline operational |
| 5 | G, H | Bare-metal deploy → Dockerize app → run locally → comparison documented |
| 6 | I, J | k3s cluster → deploy to Kubernetes → scripts + final demo |

---

## Deployment Progression

Students experience three deployment methods in order — each one solves problems from the previous:

```
Task G: Bare-Metal (Nginx on EC2)    → manual, fragile, config drift
    ↓ "why was that painful?"
Task H: Container (Docker)           → portable, repeatable, isolated
    ↓ "what if I need to scale?"
Task I: Orchestrated (k3s Kubernetes) → auto-scaling, self-healing, rolling updates
```

---

## Deliverables

1. MkDocs documentation site built and served via Docker (docs-as-code)
2. Two Git repositories with GitFlow and security hooks
3. AWS infrastructure provisioned via Terraform (bare-metal EC2 + k3s cluster)
4. Datadog monitoring across all servers
5. Team domain with DNS routing to environments
6. Fully automated CI pipeline (build, test, scan, package)
7. Bare-metal deployment to Nginx on EC2 via Ansible
8. Application containerized with Docker, running locally, image pushed to Artifactory
9. Written comparison: bare-metal vs container (in MkDocs wiki)
10. 3-node k3s Kubernetes cluster with deployed application
11. Automation scripts demonstrated and documented

---

## Getting Started

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd healthpulse-capstone

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
# → App runs at http://localhost:3000

# 4. Run unit tests
npm run test

# 5. Run tests with coverage
npm run test:coverage

# 6. Build for production
npm run build

# 7. Build Docker image
./scripts/docker-manage.sh build

# 8. Run Docker container
./scripts/docker-manage.sh run
# → App runs at http://localhost:3000
```

---

*Project created for DevOps Streams Training Program*
