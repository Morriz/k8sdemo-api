import {ConfigLoader} from 'loopback-boot'
import path from 'path'

const config = ConfigLoader.loadAppConfig(path.join(__dirname, '../../server'), process.env.NODE_ENV)

export default config