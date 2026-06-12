// ─── Top 100 Popular npm Packages (typosquat targets) ─────────────────────────
const POPULAR_NPM = [
    'react', 'react-dom', 'lodash', 'express', 'axios', 'typescript', 'webpack', 'babel-core',
    'eslint', 'prettier', 'jest', 'mocha', 'chai', 'moment', 'dayjs', 'uuid', 'dotenv',
    'cors', 'body-parser', 'mongoose', 'sequelize', 'prisma', 'fastify', 'next', 'nuxt',
    'vue', 'angular', 'svelte', 'tailwindcss', 'postcss', 'sass', 'vite', 'rollup', 'esbuild',
    'ts-node', 'nodemon', 'concurrently', 'cross-env', 'rimraf', 'glob', 'minimist',
    'commander', 'inquirer', 'chalk', 'ora', 'boxen', 'figlet', 'yargs', 'debug', 'winston',
    'pino', 'morgan', 'helmet', 'passport', 'jsonwebtoken', 'jose', 'bcrypt', 'crypto-js',
    'node-fetch', 'undici', 'got', 'supertest', 'playwright', 'puppeteer', 'cheerio',
    'jsdom', 'socket.io', 'ws', 'redis', 'ioredis', 'bull', 'agenda', 'node-cron', 'sharp',
    'jimp', 'pdfkit', 'xlsx', 'csv-parse', 'xml2js', 'yaml', 'toml', 'zod', 'yup', 'joi',
    'class-validator', 'reflect-metadata', 'inversify', 'tsyringe', 'fp-ts', 'ramda',
    'rxjs', 'immer', 'zustand', 'jotai', 'recoil', 'swr', 'react-query', 'tanstack-query',
    'framer-motion', 'gsap', 'three', 'd3', 'chart.js', 'recharts', 'apexcharts',
    'langchain', 'openai', 'anthropic', 'groq-sdk', 'llamaindex', 'chromadb', 'pinecone',
];
// ─── Top Popular PyPI Packages ────────────────────────────────────────────────
const POPULAR_PYPI = [
    'requests', 'numpy', 'pandas', 'matplotlib', 'scipy', 'scikit-learn', 'tensorflow',
    'torch', 'keras', 'flask', 'django', 'fastapi', 'uvicorn', 'sqlalchemy', 'alembic',
    'celery', 'redis', 'pymongo', 'psycopg2', 'aiohttp', 'httpx', 'pydantic', 'attrs',
    'click', 'typer', 'rich', 'loguru', 'python-dotenv', 'pytest', 'coverage', 'black',
    'flake8', 'mypy', 'isort', 'pre-commit', 'tox', 'setuptools', 'wheel', 'pip',
    'virtualenv', 'pipenv', 'poetry', 'conda', 'jupyter', 'ipython', 'notebook', 'sympy',
    'pillow', 'opencv-python', 'boto3', 'google-cloud-storage', 'azure-storage-blob',
    'stripe', 'twilio', 'sendgrid', 'openai', 'anthropic', 'langchain', 'transformers',
    'huggingface-hub', 'datasets', 'tokenizers', 'accelerate', 'diffusers', 'gradio',
    'streamlit', 'dash', 'plotly', 'seaborn', 'statsmodels', 'xgboost', 'lightgbm',
    'catboost', 'optuna', 'mlflow', 'wandb', 'dvc', 'airflow', 'prefect', 'dagster',
];
// ─── Levenshtein Distance ─────────────────────────────────────────────────────
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}
function similarityPct(a, b) {
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 100 : Math.round((1 - dist / maxLen) * 100);
}
// ─── Normalise package name ───────────────────────────────────────────────────
// npm: hyphens/underscores/dots are interchangeable for typosquatters
function normalize(name) {
    return name.toLowerCase().replace(/[-_.]/g, '-');
}
// ─── Public API ───────────────────────────────────────────────────────────────
export function checkSimilarity(packageName, ecosystem) {
    const candidates = ecosystem === 'npm' ? POPULAR_NPM : POPULAR_PYPI;
    const normInput = normalize(packageName);
    let bestMatch = '';
    let bestPct = 0;
    let bestDistance = Infinity;
    for (const candidate of candidates) {
        const normCandidate = normalize(candidate);
        if (normCandidate === normInput) {
            // Exact match after normalisation — it IS the popular package
            return { isTyposquat: false, closestMatch: candidate, distance: 0, similarityPct: 100 };
        }
        const pct = similarityPct(normInput, normCandidate);
        if (pct > bestPct) {
            bestPct = pct;
            bestMatch = candidate;
            bestDistance = levenshtein(normInput, normCandidate);
        }
    }
    // A package is considered a typosquat if similarity is ≥ 65% but not an exact match
    const isTyposquat = bestPct >= 65 && bestDistance > 0;
    return {
        isTyposquat,
        closestMatch: bestMatch || undefined,
        distance: bestDistance === Infinity ? undefined : bestDistance,
        similarityPct: bestPct,
    };
}
//# sourceMappingURL=detector.js.map