import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, TouchableHighlight, View } from 'react-native'

import Dialog, { type DialogType } from '@/components/common/Dialog'
import Text from '@/components/common/Text'
import { PRESET_USER_API_SOURCES } from '@/config/presetUserApi'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { BorderRadius } from '@/theme'
import { createStyle } from '@/utils/tools'
import { handleImportPresetOnlineUrl } from './action'

export interface ScriptImportPresetType {
  show: () => void
}

export default forwardRef<ScriptImportPresetType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const dialogRef = useRef<DialogType>(null)
  const [visible, setVisible] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleShow = () => {
    dialogRef.current?.setVisible(true)
  }

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow()
        })
      }
    },
  }))

  const handleImport = async (item: (typeof PRESET_USER_API_SOURCES)[number]) => {
    if (loadingId) return
    setLoadingId(item.id)
    const imported = await handleImportPresetOnlineUrl(item.id, item.urls)
    setLoadingId(null)
    if (imported) dialogRef.current?.setVisible(false)
  }

  return visible ? (
    <Dialog
      ref={dialogRef}
      title={t('user_api_preset_title')}
      height="70%"
      onHide={() => setLoadingId(null)}
    >
      <ScrollView style={styles.list} keyboardShouldPersistTaps="always">
        <View onStartShouldSetResponder={() => true}>
          {PRESET_USER_API_SOURCES.map((item) => {
            const isLoading = loadingId == item.id
            return (
              <TouchableHighlight
                key={item.id}
                underlayColor={theme['c-primary-background-active']}
                disabled={loadingId != null}
                onPress={() => {
                  void handleImport(item)
                }}
              >
                <View
                  style={{
                    ...styles.listItem,
                    borderRadius: BorderRadius.normal,
                    opacity: loadingId != null && !isLoading ? 0.45 : 1,
                  }}
                >
                  <Text size={14}>
                    {item.name}
                    {isLoading ? (
                      <Text size={12} color={theme['c-font-label']}>
                        {'   ' + t('user_api_preset_loading')}
                      </Text>
                    ) : null}
                  </Text>
                  <Text size={12} color={theme['c-font-label']} numberOfLines={1}>
                    {item.path}
                  </Text>
                </View>
              </TouchableHighlight>
            )
          })}
        </View>
      </ScrollView>
    </Dialog>
  ) : null
})

const styles = createStyle({
  list: {
    minWidth: 290,
    paddingHorizontal: 7,
    paddingVertical: 8,
  },
  listItem: {
    padding: 10,
    gap: 2,
  },
})
