import { setApiSource } from '@/core/apiSource'
import { importUserApi, upsertUserApi } from '@/core/userApi'
import settingState from '@/store/setting/state'
import { readFile } from '@/utils/fs'
import { log } from '@/utils/log'
import { httpFetch } from '@/utils/request'
import { toast } from '@/utils/tools'

export const fetchOnlineScript = async (url: string) => {
  const script = (await httpFetch(url).promise.then((resp) => resp.body)) as string
  if (typeof script != 'string') throw new Error('Invalid script')
  if (script.length > 9_000_000) throw new Error('Too large script')
  return script
}

const fetchOnlineScriptWithFallback = async (urls: readonly string[]) => {
  let lastError: any
  for (const url of urls) {
    try {
      return await fetchOnlineScript(url)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Request failed')
}

export const handleImportScript = async (script: string) => {
  return importUserApi(script)
    .then(() => {
      toast(global.i18n.t('user_api_import_success_tip'))
      return true
    })
    .catch((error: any) => {
      log.error(error.stack)
      toast(global.i18n.t('user_api_import_failed_tip', { message: error.message }), 'long')
      return false
    })
}

export const handleImportOnlineUrl = async (url: string) => {
  try {
    return await handleImportScript(await fetchOnlineScript(url))
  } catch (error: any) {
    toast(global.i18n.t('user_api_import_failed_tip', { message: error.message }), 'long')
    return false
  }
}

export const handleImportPresetOnlineUrl = async (id: string, urls: readonly string[]) => {
  try {
    await upsertUserApi(id, await fetchOnlineScriptWithFallback(urls))
    if (settingState.setting['common.apiSource'] == id) setApiSource(id)
    toast(global.i18n.t('user_api_import_success_tip'))
    return true
  } catch (error: any) {
    log.error(error.stack)
    toast(global.i18n.t('user_api_import_failed_tip', { message: error.message }), 'long')
    return false
  }
}

export const handleImportLocalFile = (path: string) => {
  // toast(global.i18n.t('setting_backup_part_import_list_tip_unzip'))
  void readFile(path)
    .then(async (script) => {
      if (script == null) throw new Error('Read file failed')
      void handleImportScript(script)
    })
    .catch((error: any) => {
      toast(global.i18n.t('user_api_import_failed_tip', { message: error.message }), 'long')
    })
}
