# Entrée CV - Développement IA & DevOps Cloud

## Version prête pour le CV

**Assistant IA documentaire RAG & Portfolio Cloud**  
**Rôle : Développeur IA & DevOps Cloud**

- Conception et développement d'une application RAG full-stack permettant d'interroger des documents et de générer des réponses sourcées.
- Implémentation du pipeline IA : extraction multi-format (PDF, images avec OCR, Office, texte), nettoyage, chunking, embeddings Gemini via LiteLLM et recherche sémantique.
- Développement d'une API FastAPI stateless exposant les routes d'extraction, d'embeddings, de génération de réponse et de titrage de conversations.
- Création d'une interface React/TypeScript avec stockage local-first des documents, chunks, vecteurs et conversations dans IndexedDB.
- Mise en place d'une recherche vectorielle côté navigateur avec voy-search WASM afin de limiter l'exposition des données utilisateur.
- Déploiement cloud sur Azure avec Terraform : backend sur Azure Container Apps, frontend sur Azure Static Web Apps et configuration orientée low-cost.
- Industrialisation DevOps avec Docker, variables d'environnement, CI/CD GitHub Actions et authentification GitHub vers Azure via OIDC Federation.

**Stack :** Python, FastAPI, React, TypeScript, LiteLLM, Gemini, IndexedDB, voy-search, Docker, Terraform, Azure Container Apps, Azure Static Web Apps, GitHub Actions.

## Version courte

**Assistant IA RAG & DevOps Cloud** - Projet full-stack combinant développement IA et déploiement cloud : API FastAPI, frontend React/TypeScript, embeddings Gemini via LiteLLM, recherche vectorielle local-first avec IndexedDB + voy-search, infrastructure Azure provisionnée par Terraform et CI/CD GitHub Actions avec OIDC Federation.

## Version orientée Développement IA

- Développement d'un assistant IA documentaire basé sur une architecture RAG pour répondre à des questions à partir de documents indexés.
- Construction du pipeline d'ingestion : extraction de contenu multi-format, OCR, découpage en chunks, embeddings et sélection des passages pertinents.
- Intégration de LiteLLM et Gemini pour centraliser les appels LLM, générer les embeddings et produire des réponses avec sources.
- Conception d'un stockage local-first dans IndexedDB et d'une recherche vectorielle avec voy-search WASM pour garder les données côté navigateur.

## Version orientée DevOps Cloud

- Conteneurisation et préparation au déploiement d'une application IA full-stack avec Docker.
- Provisionnement d'une infrastructure Azure low-cost avec Terraform : Container Apps pour l'API FastAPI et Static Web Apps pour le frontend React.
- Mise en place d'un pipeline CI/CD GitHub Actions avec authentification OIDC Federation vers Azure, sans credentials statiques.
- Gestion de la configuration par variables d'environnement pour les modèles LLM, embeddings, secrets et paramètres de déploiement.

## Version LinkedIn / Portfolio

Conception et développement d'un assistant IA documentaire RAG full-stack, combinant développement IA et DevOps Cloud. Le projet s'appuie sur une API FastAPI, un frontend React/TypeScript, LiteLLM avec Gemini pour les embeddings et la génération, ainsi qu'une recherche vectorielle local-first via IndexedDB et voy-search WASM. La partie cloud est automatisée avec Terraform et déployée sur Azure Container Apps + Azure Static Web Apps, avec CI/CD GitHub Actions et OIDC Federation.

## Version très courte

**Assistant IA RAG sur Azure** - Projet IA + DevOps Cloud avec FastAPI, React, LiteLLM/Gemini, IndexedDB, voy-search, Docker, Terraform, Azure Container Apps, Static Web Apps et GitHub Actions.
