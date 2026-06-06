const sourceRepo = 'zhujinrun/ikun-music-source'
const sourceRepoBranch = 'main'

const presetUserApiMirrors = [
  {
    id: 'jsdelivr-fastly',
    getUrl: (path: string) =>
      `https://fastly.jsdelivr.net/gh/${sourceRepo}@${sourceRepoBranch}/${path}`,
  },
  {
    id: 'jsdelivr',
    getUrl: (path: string) =>
      `https://cdn.jsdelivr.net/gh/${sourceRepo}@${sourceRepoBranch}/${path}`,
  },
  {
    id: 'gh-llkk',
    getUrl: (path: string) =>
      `https://gh.llkk.cc/https://raw.githubusercontent.com/${sourceRepo}/${sourceRepoBranch}/${path}`,
  },
  {
    id: 'github-raw',
    getUrl: (path: string) =>
      `https://raw.githubusercontent.com/${sourceRepo}/${sourceRepoBranch}/${path}`,
  },
] as const

const getPresetUrls = (path: string) => presetUserApiMirrors.map((mirror) => mirror.getUrl(path))

export const PRESET_USER_API_SOURCES = [
  {
    id: 'user_api_preset_ikun',
    name: 'ikun音源',
    path: 'ikun/latest.js',
    urls: getPresetUrls('ikun/latest.js'),
  },
  {
    id: 'user_api_preset_huibq',
    name: 'Huibq_lxmusic源',
    path: 'huibq/latest.js',
    urls: getPresetUrls('huibq/latest.js'),
  },
  {
    id: 'user_api_preset_flower',
    name: '野花',
    path: 'flower/latest.js',
    urls: getPresetUrls('flower/latest.js'),
  },
  {
    id: 'user_api_preset_grass',
    name: '野草',
    path: 'grass/latest.js',
    urls: getPresetUrls('grass/latest.js'),
  },
  {
    id: 'user_api_preset_juhe',
    name: '聚合API接口',
    path: 'juhe/latest.js',
    urls: getPresetUrls('juhe/latest.js'),
  },
  {
    id: 'user_api_preset_sixyin',
    name: '六音音源',
    path: 'sixyin/latest.js',
    urls: getPresetUrls('sixyin/latest.js'),
  },
  {
    id: 'user_api_preset_lx',
    name: '[独家音源]',
    path: 'lx/latest.js',
    urls: getPresetUrls('lx/latest.js'),
  },
] as const
