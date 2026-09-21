import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'PROJECT_ID를_넣으세요',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  deployment: {
    /** 자동 업데이트를 끕니다 — 납품 후 Studio가 스스로 바뀌면 곤란합니다 */
    autoUpdates: false,
    /**
     * 첫 `npx sanity deploy` 가 끝나면 콘솔에 찍어주는 값입니다.
     * 적어두지 않으면 배포할 때마다 application id 를 다시 물어보고,
     * 잘못 고르면 엉뚱한 주소로 배포됩니다.
     * 프로젝트마다 다른 값이라 템플릿에는 넣지 않습니다.
     */
    appId: 'dbn7868e7mu86zdy25yhyql9',
  },
});
