import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'PROJECT_ID를_넣으세요',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  /** 자동 업데이트를 끕니다 — 납품 후 Studio가 스스로 바뀌면 곤란합니다 */
  deployment: { autoUpdates: false },
});
