import { memo, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  View,
  FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native'
// import { useLayout } from '@/utils/hooks'
import { type Line, useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { createStyle } from '@/utils/tools'
// import { useComponentIds } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { AnimatedColorText } from '@/components/common/Text'
import { setSpText } from '@/utils/pixelRatio'
import playerState from '@/store/player/state'
import { scrollTo } from '@/utils/scroll'
import PlayLine, { type PlayLineType } from '../components/PlayLine'
import { getPosition } from '@/plugins/player/utils'
// import { screenkeepAwake } from '@/utils/nativeModules/utils'
// import { log } from '@/utils/log'
// import { toast } from '@/utils/tools'

type FlatListType = FlatListProps<Line>

// const useLock = () => {
//   const showCommentRef = useRef(false)

//   useEffect(() => {
//     let appstateListener = AppState.addEventListener('change', (state) => {
//       switch (state) {
//         case 'active':
//           if (showLyricRef.current && !showCommentRef.current) screenkeepAwake()
//           break
//         case 'background':
//           screenUnkeepAwake()
//           break
//       }
//     })
//     return () => {
//       appstateListener.remove()
//     }
//   }, [])
//   useEffect(() => {
//     let listener: ReturnType<typeof onNavigationComponentDidDisappearEvent>
//     showCommentRef.current = !!componentIds.comment
//     if (showCommentRef.current) {
//       if (showLyricRef.current) screenUnkeepAwake()
//       listener = onNavigationComponentDidDisappearEvent(componentIds.comment as string, () => {
//         if (showLyricRef.current && AppState.currentState == 'active') screenkeepAwake()
//       })
//     }

//     const rm = global.state_event.on('componentIdsUpdated', (ids) => {

//     })

//     return () => {
//       if (listener) listener.remove()
//     }
//   }, [])
// }

interface LineProps {
  line: Line
  lineNum: number
  activeLine: number
  onLayout: (lineNum: number, height: number, width: number) => void
}
const LrcLine = memo(
  ({ line, lineNum, activeLine, onLayout }: LineProps) => {
    const theme = useTheme()
    const lrcFontSize = useSettingValue('playDetail.vertical.style.lrcFontSize')
    const textAlign = useSettingValue('playDetail.style.align')
    const size = lrcFontSize / 10
    const lineHeight = setSpText(size) * 1.3

    const colors = useMemo(() => {
      const active = activeLine == lineNum
      return active
        ? ([theme['c-primary'], theme['c-primary-alpha-200'], 1] as const)
        : ([theme['c-350'], theme['c-300'], 0.6] as const)
    }, [activeLine, lineNum, theme])

    const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
      onLayout(lineNum, nativeEvent.layout.height, nativeEvent.layout.width)
    }

    // textBreakStrategy="simple" 用于解决某些设备上字体被截断的问题
    // https://stackoverflow.com/a/72822360
    return (
      <View style={styles.line} onLayout={handleLayout}>
        <AnimatedColorText
          style={{
            ...styles.lineText,
            textAlign,
            lineHeight,
          }}
          textBreakStrategy="simple"
          color={colors[0]}
          opacity={colors[2]}
          size={size}
        >
          {line.text}
        </AnimatedColorText>
        {line.extendedLyrics.map((lrc, index) => {
          return (
            <AnimatedColorText
              style={{
                ...styles.lineTranslationText,
                textAlign,
                lineHeight: lineHeight * 0.8,
              }}
              textBreakStrategy="simple"
              key={index}
              color={colors[1]}
              opacity={colors[2]}
              size={size * 0.8}
            >
              {lrc}
            </AnimatedColorText>
          )
        })}
      </View>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.line === nextProps.line &&
      prevProps.activeLine != nextProps.lineNum &&
      nextProps.activeLine != nextProps.lineNum
    )
  }
)
const wait = async () => new Promise((resolve) => setTimeout(resolve, 100))

export default () => {
  const lyricLines = useLrcSet()
  const { line } = useLrcPlay()
  const flatListRef = useRef<FlatList>(null)
  const playLineRef = useRef<PlayLineType>(null)
  const isPauseScrollRef = useRef(true)
  const scrollTimoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayScrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lyricLoadCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTime = useRef<number>(0)
  const lineRef = useRef({ line: 0, prevLine: 0 })
  const isFirstSetLrc = useRef(true)
  const scrollInfoRef = useRef<NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null>(null)
  const listLayoutInfoRef = useRef<{ spaceHeight: number; lineHeights: number[] }>({
    spaceHeight: 0,
    lineHeights: [],
  })
  const scrollCancelRef = useRef<(() => void) | null>(null)
  const isShowLyricProgressSetting = useSettingValue('playDetail.isShowLyricProgressSetting')
  // useLock()
  // const [imgUrl, setImgUrl] = useState(null)
  // const theme = useGetter('common', 'theme')
  // const { onLayout, ...layout } = useLayout()

  // useEffect(() => {
  //   const url = playMusicInfo ? playMusicInfo.musicInfo.img : null
  //   if (imgUrl == url) return
  //   setImgUrl(url)
  //
  // }, [playMusicInfo])

  // const imgWidth = useMemo(() => layout.width * 0.75, [layout.width])
  const handleScrollToActive = (index = lineRef.current.line) => {
    if (index < 0) return
    if (flatListRef.current) {
      // console.log('handleScrollToActive', index)
      if (scrollInfoRef.current && lineRef.current.line - lineRef.current.prevLine == 1) {
        let offset = listLayoutInfoRef.current.spaceHeight
        for (let line = 0; line < index; line++) {
          offset += listLayoutInfoRef.current.lineHeights[line]
        }
        offset += (listLayoutInfoRef.current.lineHeights[line] ?? 0) / 2
        try {
          scrollCancelRef.current = scrollTo(
            flatListRef.current,
            scrollInfoRef.current,
            offset - scrollInfoRef.current.layoutMeasurement.height * 0.42,
            600,
            () => {
              scrollCancelRef.current = null
            }
          )
        } catch {}
      } else {
        if (scrollCancelRef.current) {
          scrollCancelRef.current()
          scrollCancelRef.current = null
        }
        try {
          flatListRef.current.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.42,
          })
        } catch {}
      }
    }
  }

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollInfoRef.current = nativeEvent
    if (isPauseScrollRef.current) {
      playLineRef.current?.updateScrollInfo(nativeEvent)
    }
  }
  const handleScrollBeginDrag = () => {
    isPauseScrollRef.current = true
    playLineRef.current?.setVisible(true)
    if (delayScrollTimeout.current) {
      clearTimeout(delayScrollTimeout.current)
      delayScrollTimeout.current = null
    }
    if (scrollTimoutRef.current) {
      clearTimeout(scrollTimoutRef.current)
      scrollTimoutRef.current = null
    }
    if (scrollCancelRef.current) {
      scrollCancelRef.current()
      scrollCancelRef.current = null
    }
  }

  const onScrollEndDrag = () => {
    if (!isPauseScrollRef.current) return
    if (scrollTimoutRef.current) clearTimeout(scrollTimoutRef.current)
    scrollTimoutRef.current = setTimeout(() => {
      playLineRef.current?.setVisible(false)
      scrollTimoutRef.current = null
      isPauseScrollRef.current = false
      if (!playerState.isPlay) return
      handleScrollToActive()
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (delayScrollTimeout.current) {
        clearTimeout(delayScrollTimeout.current)
        delayScrollTimeout.current = null
      }
      if (lyricLoadCheckInterval.current) {
        clearInterval(lyricLoadCheckInterval.current)
        lyricLoadCheckInterval.current = null
      }
      if (scrollTimoutRef.current) {
        clearTimeout(scrollTimoutRef.current)
        scrollTimoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // linesRef.current = lyricLines
    listLayoutInfoRef.current.lineHeights = []
    lineRef.current.prevLine = 0
    lineRef.current.line = 0
    if (!flatListRef.current) return
    flatListRef.current.scrollToOffset({
      offset: 0,
      animated: false,
    })
    if (!lyricLines.length) return
    playLineRef.current?.updateLyricLines(lyricLines)
    requestAnimationFrame(() => {
      if (isFirstSetLrc.current) {
        isFirstSetLrc.current = false
        setTimeout(() => {
          isPauseScrollRef.current = false
          handleScrollToActive()
        }, 100)
      } else {
        // 清理之前的延时检测
        if (delayScrollTimeout.current) clearTimeout(delayScrollTimeout.current)
        if (lyricLoadCheckInterval.current) clearInterval(lyricLoadCheckInterval.current)
        
        // 立即尝试跳转
        delayScrollTimeout.current = setTimeout(async () => {
          await performLyricJump()
        }, 300)
        
        // 启动持续检测机制，确保慢加载时也能正确跳转
        startLyricLoadCheck()
      }
    })
  }, [lyricLines])

  // 执行歌词跳转的核心逻辑
  const performLyricJump = async () => {
    // 检查歌词是否真的加载成功
    if (!lyricLines.length) {
      console.log('⚠️ [垂直] 歌词为空，无法跳转')
      return false
    }
    
    console.log('📝 [垂直] 歌词加载完成，共', lyricLines.length, '行歌词')
    
    // 修复：始终尝试获取当前播放位置并跳转到最准确的歌词行
    let targetLine = line >= 0 ? line : 0
    
    try {
      // 尝试获取当前播放位置（不管播放状态如何都尝试）
      const currentTime = await getPosition()
      lastCheckTime.current = currentTime
      
      if (currentTime > 0) {
        const timeMs = currentTime * 1000
        console.log('⏱️ [垂直] 当前播放时间:', currentTime + 's', '(' + timeMs + 'ms)')
        
        // 查找当前时间对应的最准确的歌词行
        let foundLine = 0
        for (let i = lyricLines.length - 1; i >= 0; i--) {
          if (timeMs >= lyricLines[i].time) {
            foundLine = i
            console.log('🎯 [垂直] 找到匹配歌词行:', i, '时间:', lyricLines[i].time + 'ms', '内容:', lyricLines[i].text.substring(0, 20))
            break
          }
        }
        
        console.log('📍 [垂直] 计算结果 - 目标行:', foundLine, '原始行:', line)
        targetLine = foundLine
      } else {
        console.log('⏸️ [垂直] 播放时间为0，使用原始line值:', line)
      }
    } catch (error) {
      console.log('❌ [垂直] 获取播放位置失败:', error.message)
    }
    
    console.log('🚀 [垂直] 最终跳转到歌词行:', targetLine)
    handleScrollToActive(targetLine)
    return true
  }

  // 启动持续的歌词位置检测机制
  const startLyricLoadCheck = () => {
    let checkCount = 0
    const maxChecks = 10 // 最多检测10次（约3秒）
    
    lyricLoadCheckInterval.current = setInterval(async () => {
      checkCount++
      
      try {
        const currentTime = await getPosition()
        
        // 如果播放位置有明显变化（超过0.5秒），重新跳转
        if (Math.abs(currentTime - lastCheckTime.current) > 0.5 && currentTime > 0) {
          console.log('🔄 [垂直] 检测到播放位置变化，重新跳转歌词')
          await performLyricJump()
        }
        
        // 如果检测次数达到上限，停止检测
        if (checkCount >= maxChecks) {
          console.log('⏹️ [垂直] 歌词加载检测完成')
          if (lyricLoadCheckInterval.current) {
            clearInterval(lyricLoadCheckInterval.current)
            lyricLoadCheckInterval.current = null
          }
        }
      } catch (error) {
        console.log('❌ [垂直] 歌词位置检测失败:', error.message)
      }
    }, 300) // 每300ms检测一次
  }

  useEffect(() => {
    if (line < 0) return
    lineRef.current.prevLine = lineRef.current.line
    lineRef.current.line = line
    if (!flatListRef.current || isPauseScrollRef.current) return

    if (line - lineRef.current.prevLine != 1) {
      handleScrollToActive()
      return
    }

    delayScrollTimeout.current = setTimeout(() => {
      delayScrollTimeout.current = null
      handleScrollToActive()
    }, 600)
  }, [line])

  useEffect(() => {
    requestAnimationFrame(() => {
      playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
      playLineRef.current?.updateLyricLines(lyricLines)
    })
  }, [isShowLyricProgressSetting])

  const handleScrollToIndexFailed: FlatListType['onScrollToIndexFailed'] = (info) => {
    void wait().then(() => {
      handleScrollToActive(info.index)
    })
  }

  const handleLineLayout = useCallback<LineProps['onLayout']>((lineNum, height) => {
    listLayoutInfoRef.current.lineHeights[lineNum] = height
    playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
  }, [])

  const handleSpaceLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    listLayoutInfoRef.current.spaceHeight = nativeEvent.layout.height
    playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
  }, [])

  const handlePlayLine = useCallback((time: number) => {
    playLineRef.current?.setVisible(false)
    global.app_event.setProgress(time)
  }, [])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => {
    return <LrcLine line={item} lineNum={index} activeLine={line} onLayout={handleLineLayout} />
  }
  const getkey: FlatListType['keyExtractor'] = (item, index) => `${index}${item.text}`

  const spaceComponent = useMemo(
    () => <View style={styles.space} onLayout={handleSpaceLayout}></View>,
    [handleSpaceLayout]
  )

  return (
    <>
      <FlatList
        data={lyricLines}
        renderItem={renderItem}
        keyExtractor={getkey}
        style={styles.container}
        ref={flatListRef}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={spaceComponent}
        ListFooterComponent={spaceComponent}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        fadingEdgeLength={100}
        initialNumToRender={Math.max(line + 10, 10)}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onScroll={handleScroll}
      />
      {isShowLyricProgressSetting ? (
        <PlayLine ref={playLineRef} onPlayLine={handlePlayLine} />
      ) : null}
    </>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  space: {
    paddingTop: '100%',
  },
  line: {
    paddingTop: 10,
    paddingBottom: 10,
    // opacity: 0,
  },
  lineText: {
    textAlign: 'center',
    // fontSize: 16,
    // lineHeight: 20,
    // paddingTop: 5,
    // paddingBottom: 5,
    // opacity: 0,
  },
  lineTranslationText: {
    textAlign: 'center',
    // fontSize: 13,
    // lineHeight: 17,
    paddingTop: 5,
    // paddingBottom: 5,
  },
})
