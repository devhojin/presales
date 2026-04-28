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
  Channel?: {
    chat: (options: { channelPublicId: string }) => void
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

export type KakaoChannelChatOptions = {
  javascriptKey: string | undefined
  channelPublicId: string | undefined
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

async function getInitializedKakao(javascriptKey: string): Promise<KakaoSdk> {
  const kakao = await loadKakaoSdk()
  if (!kakao.isInitialized()) kakao.init(javascriptKey)
  return kakao
}

export async function shareToKakao(options: KakaoShareOptions): Promise<'shared' | 'missing-key'> {
  if (!options.javascriptKey) return 'missing-key'

  const kakao = await getInitializedKakao(options.javascriptKey)
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

export async function openKakaoChannelChat(
  options: KakaoChannelChatOptions,
): Promise<'opened' | 'missing-key' | 'missing-channel'> {
  if (!options.javascriptKey) return 'missing-key'
  if (!options.channelPublicId) return 'missing-channel'

  const kakao = await getInitializedKakao(options.javascriptKey)
  if (!kakao.Channel) throw new Error('Kakao Channel API is unavailable')

  kakao.Channel.chat({
    channelPublicId: options.channelPublicId,
  })

  return 'opened'
}
