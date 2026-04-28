const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js'

type KakaoLink = {
  mobileWebUrl: string
  webUrl: string
}

type KakaoFeedTemplate = {
  objectType: 'feed'
  content: {
    title: string
    description: string
    imageUrl?: string
    link: KakaoLink
  }
  buttons: Array<{
    title: string
    link: KakaoLink
  }>
}

type KakaoSdk = {
  init: (javascriptKey: string) => void
  isInitialized: () => boolean
  Share?: {
    sendDefault: (template: KakaoFeedTemplate) => void
  }
}

type KakaoWindow = Window &
  typeof globalThis & {
    Kakao?: KakaoSdk
    __kakaoSdkPromise?: Promise<KakaoSdk>
  }

export type KakaoShareOptions = {
  javascriptKey: string | undefined
  url: string
  title: string
  description: string
  imageUrl?: string
}

function getKakaoWindow(): KakaoWindow {
  return window as KakaoWindow
}

function loadKakaoSdk(): Promise<KakaoSdk> {
  const kakaoWindow = getKakaoWindow()
  if (kakaoWindow.Kakao) return Promise.resolve(kakaoWindow.Kakao)
  if (kakaoWindow.__kakaoSdkPromise) return kakaoWindow.__kakaoSdkPromise

  kakaoWindow.__kakaoSdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${KAKAO_SDK_SRC}"]`)
    const script = existingScript ?? document.createElement('script')

    script.addEventListener('load', () => {
      if (kakaoWindow.Kakao) resolve(kakaoWindow.Kakao)
      else reject(new Error('Kakao SDK loaded without window.Kakao'))
    }, { once: true })
    script.addEventListener('error', () => reject(new Error('Failed to load Kakao SDK')), { once: true })

    if (!existingScript) {
      script.src = KAKAO_SDK_SRC
      script.async = true
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }
  })

  return kakaoWindow.__kakaoSdkPromise
}

export async function shareToKakao(options: KakaoShareOptions): Promise<'shared' | 'missing-key'> {
  if (!options.javascriptKey) return 'missing-key'

  const kakao = await loadKakaoSdk()
  if (!kakao.isInitialized()) kakao.init(options.javascriptKey)
  if (!kakao.Share) throw new Error('Kakao Share API is unavailable')

  const link = {
    mobileWebUrl: options.url,
    webUrl: options.url,
  }

  kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: options.title,
      description: options.description,
      ...(options.imageUrl ? { imageUrl: options.imageUrl } : {}),
      link,
    },
    buttons: [
      {
        title: '상품 보기',
        link,
      },
    ],
  })

  return 'shared'
}
