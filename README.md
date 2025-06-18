# ArgoCD App Version Action

This GitHub Action connects to ArgoCD to retrieve the list of applications and their respective versions running in your cluster. It then updates the README file in your Git repository with this information.

## Getting Started

1. **Install the ArgoCD CLI**  
   Make sure the [ArgoCD CLI](https://argo-cd.readthedocs.io/en/stable/cli_installation/) is available in your GitHub Actions runner.  
   You can add a step in your workflow to install it, for example:
   ```yaml
   - name: Install ArgoCD CLI
     run: |
       curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
       chmod +x /usr/local/bin/argocd
   ```

2. **Create ArgoCD API Token**  
   Generate an API token in ArgoCD and add it as a GitHub secret (e.g., `ARGOCD_TOKEN`).  
   Also add your ArgoCD server URL as a secret (e.g., `ARGOCD_SERVER`).

3. **Reference the Action in Your Workflow**  
   Use the action in your workflow as shown below.

## Usage

To use this action, include it in your GitHub workflow file. Here is an example of how to set it up:

```yaml
name: Update README with ArgoCD App Versions

on:
  push:
    branches:
      - main

jobs:
  update-readme:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd

      - name: Update README with ArgoCD app versions
        uses: ./argocd-app-version-action
        with:
          argocd_server: ${{ secrets.ARGOCD_SERVER }}
          argocd_token: ${{ secrets.ARGOCD_TOKEN }}
```

## Example Output

### prod

| Application | Cluster      | Versions         |
|-------------|--------------|------------------|
| frontend    | cluster-a    | v1.2.3, v1.2.4   |
| backend     | cluster-a    | v4.5.6           |
| frontend    | cluster-b    | v1.2.2           |

### staging

| Application | Cluster      | Versions         |
|-------------|--------------|------------------|
| frontend    | cluster-a    | v1.2.1           |
| backend     | cluster-a    | v4.5.5, v4.5.6   |

### dev

| Application | Cluster      | Versions         |
|-------------|--------------|------------------|
| frontend    | cluster-dev  | v1.1.0           |

## Inputs

- `argocd_server`: The URL of your ArgoCD server.
- `argocd_token`: The token used for authentication with ArgoCD.

## Outputs

This action does not produce any outputs.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.