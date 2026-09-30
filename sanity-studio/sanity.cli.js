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
     *
     * ⚠ 아래 값은 **우리 계정의 시험용 프로젝트(ivf6kwup)** 에 붙어 있습니다.
     *   발로라 계정으로 만든 프로젝트를 받으면 반드시 둘 다 바꾸세요 —
     *     1) sanity-studio/.env 의 SANITY_STUDIO_PROJECT_ID
     *     2) 아래 appId 를 지우기 (빈 값이면 배포 때 새로 만들지 물어봅니다)
     *   .env 만 바꾸고 appId 를 그대로 두면, 고객사 내용을 담은 Studio 가
     *   우리 계정의 앱 주소로 배포됩니다. 로그인만 바꿔서는 안 잡힙니다.
     */
    appId: 'dbn7868e7mu86zdy25yhyql9',
  },
});
