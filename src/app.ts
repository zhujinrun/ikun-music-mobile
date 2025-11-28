import '@/utils/errorHandle'
import '@/config/globalData'
import { init as initLog } from '@/utils/log'
import { bootLog, getBootLog } from '@/utils/bootLog'
import { toast } from '@/utils/tools'
import { getFontSize } from '@/utils/data'
import { exitApp } from './utils/nativeModules/utils'
import { windowSizeTools } from './utils/windowSizeTools'
import { listenLaunchEvent } from './navigation/regLaunchedEvent'
import { tipDialog } from './utils/tools'
import { useI18n } from '@/lang/i18n'

console.log('starting app...')
listenLaunchEvent()

const getTimeGreeting = () => {
  const now = new Date()
  const hours = now.getHours()
  const t = useI18n()

  if (hours >= 0 && hours <= 4) {
    return t('greeting_late_night')
  } else if (hours >= 5 && hours <= 10) {
    return t('greeting_morning')
  } else if (hours >= 11 && hours <= 13) {
    return t('greeting_noon')
  } else if (hours >= 14 && hours <= 17) {
    return t('greeting_evening')
  } else if (hours >= 18 && hours <= 23) {
    return t('greeting_night')
  }
  return ''
}

void Promise.all([getFontSize(), windowSizeTools.init()])
  .then(async ([fontSize]) => {
    global.lx.fontSize = fontSize
    bootLog('Font size setting loaded.')

    let isInited = false
    let handlePushedHomeScreen: () => void | Promise<void>

    const tryGetBootLog = () => {
      try {
        return getBootLog()
      } catch (err) {
        return 'Get boot log failed.'
      }
    }

    const handleInit = async () => {
      if (isInited) return
      void initLog()
      const { default: init } = await import('@/core/init')
      try {
        handlePushedHomeScreen = await init()
        toast(getTimeGreeting(), 'long')
      } catch (err: any) {
        void tipDialog({
          title: '初始化失败 (Init Failed)',
          message: `Boot Log:\n${tryGetBootLog()}\n\n${(err.stack ?? err.message) as string}`,
          btnText: 'Exit',
          bgClose: false,
        }).then(() => {
          exitApp()
        })
        return
      }
      isInited ||= true
    }
    const { init: initNavigation, navigations } = await import('@/navigation')

    initNavigation(async () => {
      await handleInit()
      if (!isInited) return

      await navigations
        .pushHomeScreen()
        .then(() => {
          void handlePushedHomeScreen()
        })
        .catch((err: any) => {
          void tipDialog({
            title: 'Error',
            message: err.message,
            btnText: 'Exit',
            bgClose: false,
          }).then(() => {
            exitApp()
          })
        })
    })
  })
  .catch((err) => {
    void tipDialog({
      title: '初始化失败 (Init Failed)',
      message: `Boot Log:\n\n${(err.stack ?? err.message) as string}`,
      btnText: 'Exit',
      bgClose: false,
    }).then(() => {
      exitApp()
    })
  })
