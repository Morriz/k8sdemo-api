import createLogger from '../../common/lib/log'
const log = createLogger('configure-storage')
import cnf from '../../common/lib/config'
import _ from 'lodash'

export default function (app) {
  app.dataSources.files.connector.getFilename = function (file, req, res) {
    log.debug('creating filename for: ', file)
    const container = cnf.aws.s3.bucket
    const id = req.params.id
    const matches = req.originalUrl.match(/^\/api\/([a-z-]+)\/*/)
    const type = matches[1]
    const filename =`${type}/${id}/${file.name}`
    log.debug('uploading: %s: ', filename)
    return filename
  }
}