# UI Walkthrough & Pipeline Visualizations

This document illustrates the user experience, interface states, and Jenkins CI/CD pipeline stage execution.

---

## 1. Web Application UI: Active Gameplay (9x9 Easy)

```text
+-------------------------------------------------------------------------+
| [K3s v1.28]  Minesweeper Clone                           [🔊]  [ℹ️]     |
| Cloud-Native CI/CD • Jenkins • Docker • Terraform • Ansible • K8s       |
+-------------------------------------------------------------------------+
|  [ Easy (9x9) ]*   [ Medium (16x16) ]   [ Hard (30x16) ]   [⛏️ Dig Mode] |
+-------------------------------------------------------------------------+
|                                                                         |
|        +---------------+     +----------+     +---------------+         |
|        |  MINES : 008  |     |   ( 🙂 ) |     |  TIME : 042   |         |
|        +---------------+     +----------+     +---------------+         |
|                                                                         |
|        Ready to play! Click any cell to begin.                          |
|                                                                         |
|        +---+---+---+---+---+---+---+---+---+                            |
|        |   | 1 | 🚩| 1 |   |   |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 1 | 2 | 2 | 2 | 1 |   |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 🚩| 1 |   | 1 | 🚩| 1 |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 1 | 1 |   | 1 | 1 | 1 |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        |   |   |   |   |   |   |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        |   |   |   | 1 | 1 | 1 |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        |   |   |   | 1 | 🚩| 1 |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        |   |   |   | 1 | 1 | 1 |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        |   |   |   |   |   |   |   |   |   |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|                                                                         |
|        [Left Click: Reveal]  [Right Click: Flag]  [Mobile: Dig/Flag]     |
+-------------------------------------------------------------------------+
```

---

## 2. Game Over State (Mine Exploded)

```text
+-------------------------------------------------------------------------+
|        +---------------+     +----------+     +---------------+         |
|        |  MINES : 004  |     |   ( 😵 ) |     |  TIME : 087   |         |
|        +---------------+     +----------+     +---------------+         |
|                                                                         |
|        💥 Game Over! You hit a mine.                                    |
|                                                                         |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 1 | 💣| 2 | 1 | 0 | 0 | 1 | 💣| 1 |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 1 | 2 | 💣| 2 | 1 | 1 | 2 | 2 | 2 |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 0 | 1 | 2 | 💣| 1 | 1 | 💣| 1 | 0 |                            |
|        +---+---+---+---+---+---+---+---+---+                            |
|        | 0 | 0 | 1 | 💥| 1 | 1 | 1 | 1 | 0 |  <-- Clicked exploded mine |
|        +---+---+---+---+---+---+---+---+---+                            |
+-------------------------------------------------------------------------+
```

---

## 3. Victory Modal Overlay

```text
+---------------------------------------------------------------+
|                      🏆 VICTORY!                              |
|       Congratulations! You cleared all safe cells!            |
|                                                               |
|        Time Taken: 58s       |       Difficulty: Easy         |
|                                                               |
|                   [  Play Again  ]                            |
+---------------------------------------------------------------+
```

---

## 4. Jenkins CI/CD Pipeline Stage View

```text
+--------------------------------------------------------------------------------------------------------------------+
|  Pipeline Overview: minesweeper-pipeline #42 (main branch)                                                         |
+--------------------------------------------------------------------------------------------------------------------+
| [Stage 1]  Checkout Source Code                 | 3s   | SUCCESS | Git Commit: a8f9c2d                             |
| [Stage 2]  Install Dependencies                 | 12s  | SUCCESS | npm ci in /app                                  |
| [Stage 3]  Static & Lint Analysis               | 4s   | SUCCESS | Code quality passed                             |
| [Stage 4]  Execute Unit Tests                   | 6s   | SUCCESS | 100% tests passed (Jest)                        |
| [Stage 5]  Docker Build                         | 25s  | SUCCESS | Built multi-stage image                         |
| [Stage 6]  Docker Smoke Test                    | 5s   | SUCCESS | HTTP 200 on /healthz                            |
| [Stage 7]  Push Docker Images                   | 18s  | SUCCESS | Published latest, SHA & build tags              |
| [Stage 8]  Terraform Provisioning               | 45s  | SUCCESS | AWS VPC, Subnets & EC2 provisioned              |
| [Stage 9]  Ansible K3s Cluster Setup            | 1m20s| SUCCESS | K3s master & 2 workers Ready                    |
| [Stage 10] Kubernetes Deployment                | 15s  | SUCCESS | Zero-downtime rolling update                    |
| [Stage 11] Post-Deploy Health Check             | 8s   | SUCCESS | All 5 health probes verified                    |
+--------------------------------------------------------------------------------------------------------------------+
| Total Duration: 3m 41s                                                                       STATUS: SUCCESS        |
+--------------------------------------------------------------------------------------------------------------------+
```
