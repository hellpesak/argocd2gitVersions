import os
import requests
import re
from collections import defaultdict


def get_input(name):
    # GitHub Actions passes inputs as environment variables in the form INPUT_<NAME>
    return os.environ.get(f'INPUT_{name.upper()}')

def fetch_argocd_apps(argocd_server, argocd_token):
    url = argocd_server.rstrip('/') + '/api/v1/applications'
    headers = {'Authorization': f'Bearer {argocd_token}'}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()['items']

def group_apps(apps):
    grouped = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
    for app in apps:
        # Example: app['metadata']['name'] = "frontend-prod-cluster-a"
        parts = app['metadata']['name'].split('-')
        if len(parts) < 3:
            continue
        application, environment, *cluster_parts = parts
        cluster = '-'.join(cluster_parts)
        version = (
            app.get('spec', {}).get('source', {}).get('targetRevision') or
            app.get('status', {}).get('sync', {}).get('revision') or
            'unknown'
        )
        grouped[environment][application][cluster].add(version)
    return grouped

def generate_markdown(grouped):
    output = ''
    for environment in sorted(grouped.keys()):
        output += f"\n### {environment}\n\n"
        output += '| Application | Cluster      | Versions         |\n'
        output += '|-------------|--------------|------------------|\n'
        for application in sorted(grouped[environment].keys()):
            for cluster in sorted(grouped[environment][application].keys()):
                versions = ', '.join(sorted(grouped[environment][application][cluster]))
                output += f'| {application}    | {cluster}    | {versions}   |\n'
        output += '\n'
    return output

def update_readme(output, readme_path='README.md'):
    with open(readme_path, 'r', encoding='utf-8') as f:
        readme = f.read()
    marker = '## Example Output'
    pattern = re.compile(rf'{marker}[\s\S]*?(?=\n## |\n# |$)', re.M)
    if marker in readme:
        readme = pattern.sub(f'{marker}\n{output}', readme)
    else:
        readme += f'\n{marker}\n{output}'
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme)

def main():
    argocd_server = get_input('argocd_server') or os.environ.get('ARGOCD_SERVER')
    argocd_token = get_input('argocd_token') or os.environ.get('ARGOCD_TOKEN')
    if not argocd_server or not argocd_token:
        print('Missing ArgoCD server or token.')
        exit(1)
    apps = fetch_argocd_apps(argocd_server, argocd_token)
    grouped = group_apps(apps)
    output = generate_markdown(grouped)
    update_readme(output)
    print('README.md updated with ArgoCD app versions.')

if __name__ == '__main__':
    main()
