# Secure Deployment Setup

## 1. Create GitHub Secrets
Go to your repository's secrets page:  
`https://github.com/[your-username]/gurugammon-antigravity/settings/secrets/actions`

Add these secrets:
- `RENDER_API_KEY`: Your Render API key (from https://dashboard.render.com/account/api-keys)
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token (from https://app.netlify.com/user/applications/personal)

## 2. Configure Token Permissions
### Render API Key
- Create with only "services" permission
- Limit to production environment

### Netlify Token
- Create with only "deploy" permission
- Do not grant admin access

## 3. First Deployment
Push to main branch to trigger automated deployment:
```bash
git push origin main
```
