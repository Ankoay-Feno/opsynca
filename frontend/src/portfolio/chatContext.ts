import type { ContextChunkInput } from "../types";
import {
  blogPosts,
  certifications,
  education,
  experiences,
  languages,
  profile,
  projects,
  skillGroups,
  socials,
  stats,
} from "./data";

function joinLines(lines: Array<string | null | undefined>): string {
  return lines.filter(Boolean).join("\n");
}

export function buildPortfolioContext(): ContextChunkInput[] {
  const chunks: ContextChunkInput[] = [];

  // ============================================================
  // 0. PERSONA — instructions impératives pour la voix du LLM
  // ============================================================
  chunks.push({
    filename: "00-persona.md",
    chunk_index: 0,
    text: joinLines([
      `# RÔLE ET PERSONA — À LIRE EN PRIORITÉ ABSOLUE`,
      "",
      `TU ES **${profile.name}** (alias "${profile.shortName}"), ${profile.title}.`,
      `Tu n'es PAS un assistant. Tu es Anjara Feno qui répond personnellement.`,
      "",
      `## Règles absolues de réponse`,
      `1. Parle TOUJOURS à la première personne du singulier : "je", "j'", "mon", "ma", "mes", "moi".`,
      `2. N'utilise JAMAIS "il", "elle", "lui", "son", "sa", "ses" pour parler de toi (Anjara).`,
      `3. Ne te présente JAMAIS comme un "assistant", "chatbot", "IA", ou "clone". Tu es la personne elle-même.`,
      `4. Tutoie le visiteur ("tu", "ton", "tes") — c'est plus chaleureux et naturel.`,
      `5. Sois concis : 1 à 3 phrases courtes par défaut. Détaille seulement si on te demande.`,
      `6. Réponds dans la même langue que la question (français OU anglais).`,
      `7. Reste pro mais authentique — ton ouvert d'ingénieur passionné par le cloud et le DevOps.`,
      `8. Si l'info n'est pas dans le contexte ci-dessous : dis "Je n'ai pas cette info dans mon portfolio. Tu peux m'écrire directement à ${profile.email}."`,
      `9. Ne hallucine PAS — ne mentionne que ce qui est explicitement dans le contexte.`,
      "",
      `## Exemples de bonnes réponses`,
      `- ❌ "Anjara a travaillé chez The Next Mind…" (interdit)`,
      `- ✅ "J'ai travaillé chez The Next Mind depuis mai 2025…"`,
      `- ❌ "Il maîtrise Terraform et Ansible."`,
      `- ✅ "Je maîtrise Terraform et Ansible."`,
      `- ❌ "Je suis l'assistant d'Anjara."`,
      `- ✅ "Salut, c'est Anjara !"`,
    ]),
  });

  // ============================================================
  // 1. Mon identité
  // ============================================================
  chunks.push({
    filename: "01-mon-identite.md",
    chunk_index: 0,
    text: joinLines([
      `# Mon identité`,
      "",
      `- Mon nom complet : ${profile.name}`,
      `- On m'appelle : ${profile.shortName}`,
      `- Mon poste : ${profile.title}`,
      `- Mes domaines : ${profile.tagline}`,
      `- Je vis à : ${profile.location}`,
      `- Mon email : ${profile.email}`,
      `- Mon téléphone : ${profile.phone}`,
      "",
      `## Mon mini-bio (utilise-le comme inspiration, pas mot pour mot)`,
      profile.bio,
      "",
      `## Mes chiffres clés`,
      ...stats.map((s) => `- ${s.value} ${s.label}`),
      "",
      `## Où me trouver en ligne`,
      ...socials.map((s) => `- ${s.label} : ${s.href} (mon handle : ${s.handle})`),
      "",
      `## Ce portfolio (méta)`,
      `Ce portfolio est lui-même déployé sur **Azure** :`,
      `- Backend FastAPI → **Azure Container Apps** (auto-scaling)`,
      `- Frontend React/Vite → **Azure Static Web Apps**`,
      `- Secrets → **Azure Key Vault**`,
      `- IaC → **Terraform** avec backend distant`,
      `- CI/CD → **GitHub Actions** + OIDC Federation vers Azure (sans clés statiques)`,
      `- Chatbot IA (celui-ci) : RAG client-side, embeddings via mon backend, vecteurs stockés dans IndexedDB du visiteur, retrieval avec voy-search WASM.`,
    ]),
  });

  // ============================================================
  // 2. Mon expérience pro
  // ============================================================
  chunks.push({
    filename: "02-mon-experience.md",
    chunk_index: 0,
    text: joinLines([
      `# Mon expérience professionnelle`,
      ...experiences.flatMap((exp) => [
        "",
        `## ${exp.role} chez ${exp.company}`,
        `Période : ${exp.startDate} → ${exp.endDate}${exp.current ? " (poste actuel)" : ""}`,
        "",
        `### Ce que j'y ai accompli (impact pour l'entreprise)`,
        ...exp.highlights.map((h) => `- ${h}`),
      ]),
    ]),
  });

  // ============================================================
  // 3. Mes projets (un chunk par projet pour les retrouver facilement)
  // ============================================================
  projects.forEach((project, idx) => {
    chunks.push({
      filename: `03-mon-projet-${idx + 1}.md`,
      chunk_index: idx,
      text: joinLines([
        `# Mon projet : ${project.title}`,
        "",
        `## Ce que c'est`,
        project.description,
        "",
        `## Ma stack technique`,
        ...project.stack.map((t) => `- ${t}`),
        "",
        `## Points forts du projet`,
        ...project.highlights.map((h) => `- ${h}`),
      ]),
    });
  });

  // ============================================================
  // 4. Mes compétences (skill tree)
  // ============================================================
  chunks.push({
    filename: "04-mes-competences.md",
    chunk_index: 0,
    text: joinLines([
      `# Mes compétences techniques`,
      ...skillGroups.flatMap((g) => [
        "",
        `## ${g.category}`,
        ...g.items.map((i) => `- ${i}`),
      ]),
      "",
      `## Kubernetes (orchestration)`,
      `- Kubernetes`,
      `- Helm Charts`,
      `- ArgoCD`,
      `- Kubectl`,
      `- Manifests YAML`,
      `- Lens`,
      "",
      `## Ce que j'apprends actuellement`,
      `- Interopérabilité X-Road (cible Q3 2026) : X-Road Security Server, Central Server, SOAP/REST adapters, X-Road Catalog, Certificats & PKI, MISP2 / Trembita`,
    ]),
  });

  // ============================================================
  // 5. Mes certifications
  // ============================================================
  chunks.push({
    filename: "05-mes-certifications.md",
    chunk_index: 0,
    text: joinLines([
      `# Mes certifications (${certifications.length} obtenues)`,
      "",
      ...certifications.map((c) =>
        `- **${c.name}** — ${c.issuer}${c.date ? ` (${c.date})` : ""}`,
      ),
      "",
      `## Certifications que je prépare en ce moment`,
      `- AWS Certified Cloud Practitioner — AWS, ETA Q3 2026`,
      `- HashiCorp Certified : Terraform Associate — HashiCorp, ETA Q4 2026`,
      `- Certified Kubernetes Administrator (CKA) — CNCF, ETA Q1 2027`,
    ]),
  });

  // ============================================================
  // 6. Ma formation + langues
  // ============================================================
  chunks.push({
    filename: "06-ma-formation.md",
    chunk_index: 0,
    text: joinLines([
      `# Ma formation`,
      "",
      ...education.map((e) => `- **${e.degree}** — ${e.school} (${e.period})`),
      "",
      `# Mes langues`,
      ...languages.map((l) => `- ${l.name} : ${l.level}`),
    ]),
  });

  // ============================================================
  // 7. Mes articles de blog (un chunk par article)
  // ============================================================
  blogPosts.forEach((post, idx) => {
    chunks.push({
      filename: `07-mon-article-${idx + 1}.md`,
      chunk_index: idx,
      text: joinLines([
        `# Mon article : ${post.title}`,
        `Publié le ${post.publishedAt}${post.readMinutes ? ` (${post.readMinutes} min de lecture)` : ""}`,
        `URL : ${post.url}`,
        "",
        `## De quoi ça parle`,
        post.brief,
      ]),
    });
  });

  return chunks;
}
