# Contributing to The Brain

Merci de vouloir contribuer ! 🎉

## 📋 Table des matières

- [Code of Conduct](#code-of-conduct)
- [Comment contribuer](#comment-contribuer)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Code of Conduct

Ce projet respecte un code de conduite. En participant, vous vous engagez à respecter ce code.

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé
2. Ouvrez une issue avec le template "Bug Report"
3. Incluez autant de détails que possible

### Proposer une feature

1. Ouvrez une issue avec le template "Feature Request"
2. Décrivez le besoin et la solution proposée
3. Attendez la validation avant de coder

### Soumettre du code

1. **Fork** le repo
2. **Clone** votre fork
3. **Créez** une branche: `git checkout -b feature/ma-feature`
4. **Codez** votre modification
5. **Testez** localement
6. **Commit**: `git commit -m 'Add: description'`
7. **Push**: `git push origin feature/ma-feature`
8. **Ouvrez** une Pull Request

## Development Setup

```bash
# Clone
git clone https://github.com/misterprompt/the-brain.git
cd the-brain

# Install Python deps
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Install Node deps
npm install

# Setup env
cp configs/.env.example .env

# Run tests
pytest packages/brain-core/tests/
npm test

# Run locally
cd packages/api-server
uvicorn src.main:app --reload
```

## Pull Request Process

1. Mettez à jour la documentation si nécessaire
2. Ajoutez des tests pour les nouvelles fonctionnalités
3. Assurez-vous que tous les tests passent
4. La PR sera mergée après review

## Style Guide

### Python
- **PEP 8** pour le style
- **Type hints** obligatoires
- **Docstrings** pour les fonctions publiques

```python
def process_data(input: str) -> dict:
    """
    Process input data.
    
    Args:
        input: The input string to process
        
    Returns:
        Processed data as dictionary
    """
    pass
```

### TypeScript/JavaScript
- **ESLint** + **Prettier**
- **camelCase** pour les variables
- **PascalCase** pour les composants

```typescript
interface UserData {
  userId: string;
  userName: string;
}

const processUser = (data: UserData): void => {
  // ...
};
```

### Commits

Format: `Type: Description`

Types:
- `Add:` Nouvelle fonctionnalité
- `Fix:` Correction de bug
- `Update:` Mise à jour existante
- `Refactor:` Refactoring
- `Docs:` Documentation
- `Test:` Tests
- `Chore:` Maintenance

Exemple: `Add: user authentication system`

---

**Merci de contribuer ! 🙏**
