export type Experience = {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[];
};

export type Project = {
  title: string;
  description: string;
  stack: string[];
  highlights: string[];
  repo?: string;
  demo?: string;
};

export type SkillGroup = {
  category: string;
  items: string[];
};

export type Certification = {
  name: string;
  issuer: string;
  date?: string;
  url?: string;
};

export type BlogPost = {
  title: string;
  brief: string;
  url: string;
  publishedAt: string;
  readMinutes?: number;
  coverImage?: string;
};

export type SocialLink = {
  label: string;
  href: string;
  handle: string;
};

export const profile = {
  name: "RANDRIANIHARISOA Anjara Feno",
  shortName: "Ankoay Feno",
  chatName: "ankoay.dev",
  title: "Cloud & DevOps Engineer",
  tagline: "AWS · Terraform · Ansible · CI/CD · Docker · Observabilité",
  bio: "Cloud & DevOps Engineer spécialisé AWS et automatisation d'infrastructure. Je conçois des architectures cloud fiables et reproductibles — Infrastructure as Code (Terraform, Ansible), pipelines CI/CD et observabilité de bout en bout. Approche pragmatique : tester, automatiser et améliorer en continu la fiabilité des systèmes.",
  location: "Antananarivo, Madagascar",
  email: "ankoayfeno@gmail.com",
  phone: "+261 33 88 833 89",
  photoPath: "/profile.png",
};

export const socials: SocialLink[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/ankoayfeno/", handle: "ankoayfeno" },
  { label: "GitHub", href: "https://github.com/Ankoay-Feno", handle: "Ankoay-Feno" },
  { label: "GitLab", href: "https://gitlab.com/ankoayfeno", handle: "ankoayfeno" },
  { label: "Hashnode", href: "https://hashnode.com/@ankoayfeno", handle: "@ankoayfeno" },
];

export const stats = [
  { value: "70%", label: "Réduction temps de déploiement" },
  { value: "14", label: "Certifications cloud/DevOps" },
  { value: "2 ans", label: "Expérience cloud" },
];

export const experiences: Experience[] = [
  {
    role: "DevOps & Cloud Engineer",
    company: "The Next Mind",
    startDate: "05/2025",
    endDate: "Présent",
    current: true,
    highlights: [
      "Accélération du time-to-market des services IA grâce à une plateforme LLMOps automatisée (Terraform + Ansible) — déploiements reproductibles, scalables et opérables sans intervention manuelle.",
      "Fiabilité accrue des services d'inférence en production via une architecture conteneurisée (FastAPI · LiteLLM · Gemini · Qdrant · Docker Compose), observable de bout en bout.",
      "Réduction de 70% du temps de déploiement grâce à l'optimisation des pipelines CI/CD GitHub Actions — livraisons plus fréquentes et plus fiables en production.",
      "Réduction du MTTR et amélioration de la détection d'incidents grâce à une stack d'observabilité (logs, métriques, alerting) — incidents identifiés et résolus plus vite.",
      "Sécurité renforcée et risques d'accès non autorisés réduits via des politiques IAM AWS en Least Privilege — surface d'attaque minimisée.",
      "Coûts maîtrisés et infrastructures reproductibles via Terraform + Ansible (EC2, VPC, Security Groups) — environnements cohérents, maintenables et sans dérive.",
      "Scalabilité au juste coût via des architectures serverless AWS (Lambda, S3, DynamoDB, SQS, Amplify) provisionnées en IaC — paiement à l'usage et zéro maintenance serveur.",
      "Sécurisation et performance d'une application fullstack JS sur AWS ECS — base RDS en subnets privés, VPN site-to-site et distribution CloudFront pour des temps de réponse optimisés.",
      "Industrialisation du build mobile : pipeline GitHub Actions livrant l'APK Android automatiquement dans GitHub Releases — équipes test débloquées sans dépendance manuelle.",
      "Réactivité opérationnelle améliorée via notifications Slack automatisées — équipes alertées en temps réel sur les incidents.",
    ],
  },
];

export const projects: Project[] = [
  {
    title: "Plateforme LLMOps",
    description:
      "Plateforme de déploiement automatisé de services IA conteneurisés en production, avec provisionnement Terraform et configuration Ansible.",
    stack: ["Terraform", "Ansible", "Docker"],
    highlights: [
      "Déploiement scalable de services IA",
      "Provisionnement reproductible end-to-end",
      "Stack observabilité intégrée",
    ],
  },
  {
    title: "Fullstack JS sur AWS ECS",
    description:
      "Application fullstack déployée sur ECS avec RDS en subnets privés, sécurisée via VPN site-to-site et distribuée par CloudFront.",
    stack: ["AWS ECS", "RDS", "CloudFront", "VPN", "Terraform"],
    highlights: [
      "Subnets privés pour la base de données",
      "VPN site-to-site pour l'admin sécurisé",
      "Distribution CDN globale",
    ],
  },
  {
    title: "Architecture Serverless AWS",
    description:
      "Conception et automatisation d'architectures serverless via Terraform pour des déploiements reproductibles et scalables.",
    stack: ["AWS Lambda", "S3", "DynamoDB", "SQS", "Amplify", "Terraform"],
    highlights: [
      "Infrastructure 100% serverless",
      "Coûts optimisés par usage",
      "Scaling automatique géré",
    ],
  },
  {
    title: "Mobile CI/CD — APK React Native",
    description:
      "Pipeline GitHub Actions automatisant le build Android d'une application React Native, avec publication APK dans GitHub Releases.",
    stack: ["GitHub Actions", "Expo Prebuild", "Android Gradle", "React Native"],
    highlights: [
      "Build Android automatisé",
      "Notes de version générées",
      "Artefact téléchargeable par release",
    ],
  },
  {
    title: "Assistant IA RAG & DevOps Cloud sur Azure",
    description:
      "Application RAG full-stack combinant développement IA et DevOps Cloud : extraction documentaire, embeddings via LiteLLM/Gemini, recherche vectorielle locale et déploiement Azure automatisé par Terraform.",
    stack: ["FastAPI", "React", "TypeScript", "LiteLLM", "Gemini", "Azure", "Terraform", "GitHub Actions"],
    highlights: [
      "API FastAPI stateless sécurisant les appels LLM",
      "RAG local-first : IndexedDB + voy-search WASM",
      "Déploiement Azure : Container Apps + Static Web Apps",
      "CI/CD GitHub Actions avec OIDC Federation",
    ],
    repo: "https://github.com/Ankoay-Feno/opsynca",
  },
  {
    title: "Moteur de recherche d'opportunités",
    description:
      "Module intégré au portfolio pour explorer les offres par mot-clé ou depuis un CV, avec extraction du profil, agrégation de sources Madagascar/remote et scoring de pertinence.",
    stack: ["FastAPI", "React", "TypeScript", "LiteLLM", "IndexedDB", "Careerjet", "Jooble"],
    highlights: [
      "Recherche par mot-clé ou analyse de CV",
      "Agrégation d'offres Madagascar et remote",
      "Matching CV/offres par embeddings et suivi local des candidatures",
    ],
    repo: "https://github.com/Ankoay-Feno/opsynca",
    demo: "/emplois",
  },
];

export const skillGroups: SkillGroup[] = [
  {
    category: "Cloud AWS",
    items: [
      "IAM & Custom Policies",
      "S3",
      "Lambda",
      "EC2",
      "VPC",
      "ECS",
      "CloudWatch",
      "DynamoDB",
      "SQS",
      "API Gateway",
      "Amplify",
    ],
  },
  {
    category: "Cloud Azure",
    items: [
      "Container Apps",
      "Static Web Apps",
      "Container Registry",
      "Key Vault",
      "Azure CLI",
      "OIDC Federation",
      "Resource Manager",
    ],
  },
  {
    category: "Infrastructure as Code",
    items: ["Terraform", "Ansible"],
  },
  {
    category: "Développement IA",
    items: ["RAG", "Embeddings", "LiteLLM", "Gemini", "FastAPI", "voy-search", "IndexedDB"],
  },
  {
    category: "CI/CD",
    items: ["GitHub Actions", "GitLab CI", "Expo Prebuild", "Android Gradle", "GitHub Releases"],
  },
  {
    category: "Conteneurisation",
    items: ["Docker", "Docker Compose", "Kubernetes (EKS, On-promise)"],
  },
  {
    category: "Observabilité",
    items: ["Grafana", "Prometheus", "Loki", "Cadvisor", "OpenTelemetry", "Vector", "blackbox_exporter"],
  },
  {
    category: "Réseaux & Sécurité",
    items: ["Traefik", "HAProxy", "NGINX", "Security Groups", "Load Balancers", "VPN", "iptables"],
  },
  {
    category: "Langages",
    items: ["Shell script", "Python (intermediaire)"],
  },
];

export const certifications: Certification[] = [
  {
    name: "AWS CloudFront : Servez du contenu à partir de plusieurs buckets S3",
    issuer: "Coursera Project Network",
    date: "Août 2025",
  },
  { name: "Git", issuer: "KodeKloud", date: "Mai 2025" },
  { name: "Jenkins for Beginners", issuer: "KodeKloud", date: "Mai 2025" },
  { name: "DevOps Pre-requisite Course", issuer: "KodeKloud", date: "Avril 2025" },
  { name: "Fundamentals of DevOps", issuer: "KodeKloud", date: "Avril 2025" },
  { name: "12 Factor App", issuer: "KodeKloud", date: "Mars 2025" },
  { name: "AWS Educate Introduction to Cloud 101", issuer: "AWS", date: "Mars 2025" },
  { name: "LFS158: Introduction to Kubernetes", issuer: "The Linux Foundation", date: "Septembre 2024" },
  { name: "Docker Essentials: A Developer Introduction", issuer: "IBM", date: "Septembre 2024" },
  { name: "Introduction to Docker", issuer: "Le Wagon", date: "Août 2024" },
  { name: "Networking Basics", issuer: "Cisco", date: "Août 2024" },
  { name: "NDG Linux Unhatched", issuer: "NDG · Cisco Networking Academy", date: "Juillet 2024" },
  { name: "Network Technician Career Path", issuer: "Cisco", date: "Juillet 2024" },
  { name: "Introduction to Cybersecurity", issuer: "Cisco", date: "Juillet 2024" },
];

export const blogPosts: BlogPost[] = [
  {
    title: "AWS S3 + CloudFront Cost Optimization: Simple Guide + Terraform Hands-On",
    brief:
      "Learn how to optimize static website costs and deploy S3 + CloudFront with Terraform. S3 + CloudFront is one of the simplest ways to host a fast, secure static website on AWS.",
    url: "https://cloud-lab.hashnode.dev/aws-s3-cloudfront-cost-optimization-simple-guide-terraform-hands-on",
    publishedAt: "2026-02-12",
    readMinutes: 3,
  },
  {
    title: "AWS Lambda Cost Optimization: Simple Guide + Terraform Hands-On",
    brief:
      "Learn how to optimize Lambda costs and deploy your first function with Terraform. AWS Lambda lets you run code without managing servers — you pay only for requests and execution time.",
    url: "https://cloud-lab.hashnode.dev/aws-lambda-cost-optimization-simple-guide-terraform-hands-on",
    publishedAt: "2026-02-04",
    readMinutes: 3,
  },
  {
    title: "Nginx Ingress Controller End-of-Life March 2026 — Migrate to Traefik",
    brief:
      "Deploying Grafana with Traefik Ingress on Kubernetes. The official NGINX Ingress Controller will be retired in March 2026 — no further releases, bug fixes, or security updates.",
    url: "https://container-lab.hashnode.dev/alert-nginx-ingress-controller-end-of-life-march-2026-migrate-to-traefik",
    publishedAt: "2025-12-03",
    readMinutes: 4,
  },
  {
    title: "Deploy a Scalable EKS Cluster on AWS with Terraform",
    brief:
      "Modern DevOps relies on automation, scalability, and resilience. Amazon EKS simplifies Kubernetes management — but manual setup is tedious. That's where Terraform comes in.",
    url: "https://cloud-lab.hashnode.dev/deploy-a-scalable-eks-cluster-on-aws-with-terraform",
    publishedAt: "2025-11-06",
    readMinutes: 4,
  },
  {
    title: "AWS Load Balancing: Optimize Load Distribution Between Your Instances",
    brief:
      "In the cloud, your applications must be available and fast. AWS Load Balancers help you share traffic across multiple servers, so your system stays reliable, scalable, and resilient.",
    url: "https://cloud-lab.hashnode.dev/aws-load-balancing-optimize-load-distribution-between-your-instances",
    publishedAt: "2025-08-11",
    readMinutes: 3,
  },
  {
    title: "Terraform & Ansible : Towards a Collaborative and Automated Infrastructure",
    brief:
      "Mastering Terraform and Ansible is a great start, but collaborating with a team and integrating them into a CI/CD pipeline is a whole new challenge. Hands-on exercise to bridge the gap.",
    url: "https://cloud-lab.hashnode.dev/terraform-and-ansible-towards-a-collaborative-and-automated-infrastructure",
    publishedAt: "2025-04-03",
    readMinutes: 5,
  },
  {
    title: "Speed Up Your Build with Caching in GitHub Actions",
    brief:
      "Save between 10% and 90% of your build time. As a DevOps professional, optimizing workflow time is always challenging — reducing test, build and deployment durations is critical.",
    url: "https://pipeline-lab.hashnode.dev/speed-up-your-build-with-caching-in-github-action",
    publishedAt: "2025-03-10",
    readMinutes: 3,
  },
  {
    title: "From Bloated to Blazing: Cut Build Times & Speed Up Your React App with Docker",
    brief:
      "In today's fast-paced web environment, performance is king. Users expect lightning-fast loading times, and search engines reward optimized websites — learn how to slim down React + Docker.",
    url: "https://docker-lab.hashnode.dev/from-bloated-to-blazing-cut-build-times-and-speed-up-your-react-app-with-docker-optimization",
    publishedAt: "2025-03-06",
    readMinutes: 4,
  },
];

export const education = [
  {
    degree: "Master 1 en informatique",
    school: "GE-IT — Grande École de l'Innovation Technologique",
    period: "11/2025 - Présent",
  },
  {
    degree: "Licence en informatique",
    school: "GE-IT — Grande École de l'Innovation Technologique",
    period: "09/2024 - 08/2025",
  },
  {
    degree: "Plateforme de formation DevOps",
    school: "KodeKloud",
    period: "04/2025 - 09/2025",
  },
  {
    degree: "Baccalauréat Série C",
    school: "Saint Jean Baptiste de la Salle Imerinafovoany",
    period: "2020",
  },
];

export const languages = [
  { name: "Malagasy", level: "Langue maternelle" },
  { name: "Français", level: "B1" },
  { name: "Anglais", level: "A2" },
];
